"""FTPS releases restricted to one marked Liber Pro domain directory.
Back up managed files outside WWW, stage, verify, atomically replace each file,
run public smoke checks, then record the release. Restore on any failed step.
"""
from pathlib import Path,PurePosixPath
from datetime import datetime,timezone
import argparse,ftplib,ssl,io,json,hashlib,os,re,tarfile,uuid
ROOT=Path(__file__).resolve().parent.parent
HOST='s67.cyber-folks.pl';REPOSITORY='cichonmichal76-collab/Liberpro'
MARKER='.liberpro-cicd-target.json';STATE='.liberpro-cicd-state.json'
def sha(data):return hashlib.sha256(data).hexdigest()
def safe_path(name):
    p=PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or '\\' in name or any(ord(c)<32 for c in name):raise ValueError('Unsafe deployment path')
    if len(p.parts)>2 or (len(p.parts)==2 and p.parts[0]!='en'):raise ValueError('Outside website file scope')
    if p.name=='.htaccess':return name
    if p.name.startswith('.') or p.suffix.lower() not in ['.html','.js','.css','.xml','.txt','.png','.ico','.php']:raise ValueError('Forbidden file type')
    if p.suffix=='.php' and name!='contact.php':raise ValueError('Only the reviewed contact endpoint may be deployed')
    return name
def get(ftp,path,missing=False):
    out=io.BytesIO()
    try:ftp.retrbinary('RETR '+path,out.write)
    except ftplib.error_perm as e:
        if missing and str(e).startswith('550'):return None
        raise
    return out.getvalue()
def put(ftp,path,data):ftp.storbinary('STOR '+path,io.BytesIO(data))
def mkdirs(ftp,path):
    current=''
    for part in PurePosixPath(path).parts:
        current=part if not current else current+'/'+part
        try:ftp.mkd(current)
        except ftplib.error_perm as e:
            if not str(e).startswith('550'):raise
def checked_put(ftp,path,data):
    mkdirs(ftp,str(PurePosixPath(path).parent));put(ftp,path,data)
    if sha(get(ftp,path))!=sha(data):raise RuntimeError('Uploaded data checksum mismatch: '+path)
def verify_target(ftp):
    if ftp.pwd()!='/':raise RuntimeError('Unexpected FTP root; no deployment performed')
    target=json.loads(get(ftp,MARKER))
    if target!={'domain':'liberpro.pl','repository':REPOSITORY,'documentRoot':'public_html','version':1}:raise RuntimeError('Domain marker mismatch; no deployment performed')
def archive_bytes(files):
    out=io.BytesIO()
    with tarfile.open(fileobj=out,mode='w:gz') as tar:
        for name,data in sorted(files.items()):
            if data is None:continue
            safe_path(name);entry=tarfile.TarInfo('public_html/'+name);entry.size=len(data);entry.mode=0o644;tar.addfile(entry,io.BytesIO(data))
    return out.getvalue()
def read_archive(data):
    files={}
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as tar:
        for entry in tar.getmembers():
            if not entry.isfile() or not entry.name.startswith('public_html/'):raise ValueError('Unexpected backup entry')
            name=safe_path(entry.name[len('public_html/'):])
            if name in files or entry.size>3_000_000:raise ValueError('Invalid backup member')
            files[name]=tar.extractfile(entry).read()
    return files
def release(ftp,new_files,baseline,release_id,smoke):
    verify_target(ftp)
    if not re.fullmatch(r'[a-zA-Z0-9-]{8,100}',release_id):raise ValueError('Invalid release ID')
    new_files={safe_path(n):b for n,b in new_files.items()}
    previous=get(ftp,STATE,True);state=json.loads(previous) if previous else {'files':baseline}
    expected=state['files'];all_paths=set(expected)|set(new_files)
    old={}
    for name in sorted(all_paths):
        safe_path(name);data=get(ftp,'public_html/'+name,True);old[name]=data
        wanted=expected.get(name)
        if wanted is not None and (data is None or sha(data)!=wanted):raise RuntimeError('Server drift; stopped before writes: '+name)
        if wanted is None and data is not None:raise RuntimeError('Unmanaged server file already exists: '+name)
    changes={n:new_files.get(n) for n in all_paths if old[n]!=new_files.get(n)}
    backup='ci-backups/'+release_id+'.tar.gz';backup_data=archive_bytes(old)
    if get(ftp,backup,True) is not None:raise RuntimeError('Backup already exists; release ID must be unique')
    checked_put(ftp,backup+'.partial',backup_data);ftp.rename(backup+'.partial',backup)
    stage='ci-staging/'+release_id
    # Test permission to atomically move a new file into WWW without changing content.
    probe='.cicd-probe-'+uuid.uuid4().hex+'.tmp';probe_source=stage+'/'+probe;probe_dest='public_html/'+probe
    checked_put(ftp,probe_source,b'Liber Pro deployment permission probe\n');ftp.rename(probe_source,probe_dest);ftp.delete(probe_dest)
    for name,data in changes.items():
        if data is not None:checked_put(ftp,stage+'/'+name,data)
    attempted=[]
    try:
        for name,data in sorted(changes.items()):
            attempted.append(name)
            if data is None:ftp.delete('public_html/'+name)
            else:
                mkdirs(ftp,str(PurePosixPath('public_html/'+name).parent));ftp.rename(stage+'/'+name,'public_html/'+name)
        for name,data in new_files.items():
            if get(ftp,'public_html/'+name)!=data:raise RuntimeError('Published checksum mismatch: '+name)
        smoke()
        new_state=json.dumps({'release':release_id,'repository':REPOSITORY,'files':{n:sha(b) for n,b in sorted(new_files.items())}},indent=2).encode()
        checked_put(ftp,STATE+'.partial',new_state);ftp.rename(STATE+'.partial',STATE)
    except Exception as original:
        errors=[]
        for name in reversed(attempted):
            try:
                if old[name] is None:
                    if get(ftp,'public_html/'+name,True) is not None:ftp.delete('public_html/'+name)
                else:
                    restore=stage+'/restore/'+name;checked_put(ftp,restore,old[name]);ftp.rename(restore,'public_html/'+name)
            except Exception:errors.append(name)
        try:
            if get(ftp,STATE,True)!=previous:
                if previous is None:ftp.delete(STATE)
                else:checked_put(ftp,STATE+'.restore',previous);ftp.rename(STATE+'.restore',STATE)
        except Exception:errors.append(STATE)
        if errors:raise RuntimeError('Deployment failed; manual recovery required for: '+','.join(errors)+'; backup '+backup) from original
        raise RuntimeError('Deployment failed; original website restored; backup '+backup) from original
    return {'status':'PASS','release':release_id,'managedFiles':len(new_files),'changedFiles':len(changes),'backup':backup,'backupSHA256':sha(backup_data),'publicSmoke':'PASS','databaseOperations':0,'portalOperations':0}
def connect():
    user=os.environ['LIBERPRO_FTPS_USER']
    if user!='cicd-liberpro@liberpro.pl':raise RuntimeError('Unexpected deployment user')
    ftp=ftplib.FTP_TLS(context=ssl.create_default_context(),timeout=45);ftp.connect(HOST,21);ftp.login(user,os.environ['LIBERPRO_FTPS_PASSWORD']);ftp.prot_p();return ftp
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--restore-backup');args=parser.parse_args()
    if os.environ.get('GITHUB_REPOSITORY')!=REPOSITORY or os.environ.get('GITHUB_REF')!='refs/heads/main':raise RuntimeError('Production deployment is restricted to this repository main branch')
    out=ROOT/'reports';out.mkdir(exist_ok=True)
    baseline=json.loads((ROOT/'ci/deployment-baseline.json').read_text())
    with connect() as ftp:
        if args.restore_backup:
            if not re.fullmatch(r'[a-zA-Z0-9-]{8,100}\.tar\.gz',args.restore_backup):raise ValueError('Invalid rollback backup name')
            verify_target(ftp);files=read_archive(get(ftp,'ci-backups/'+args.restore_backup))
        else:
            names=json.loads((ROOT/'ci/managed-files.json').read_text(encoding='utf-8'));files={n:(ROOT/safe_path(n)).read_bytes() for n in names}
        from smoke import check_public
        release_id=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+os.environ.get('GITHUB_RUN_ID','local')+'-'+os.environ.get('GITHUB_RUN_ATTEMPT','1')
        report=release(ftp,files,baseline,release_id,lambda:check_public(files))
    (out/'deployment.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,indent=2))
if __name__=='__main__':main()

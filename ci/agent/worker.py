"""Publish one explicitly requested tested main revision. Install outside WWW.
No credentials, shell execution, database access or downloaded Python execution.
"""
from pathlib import Path
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.parse import urlsplit
import os,sys,json,re,io,zipfile,stat,hashlib,datetime,fcntl,uuid,platform,argparse
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE));sys.path.insert(0,str(HERE.parent))
from localftp import LocalFiles
from deploy import release,verify_target,safe_path,sha
from smoke import check_public
REPOSITORY='cichonmichal76-collab/Liberpro';WORKFLOW='liberpro-ci-cd.yml';RECEIPT='deployment-status.json'
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
def fetch(url,maximum=15_000_000):
    parsed=urlsplit(url)
    if parsed.scheme!='https' or parsed.hostname not in ['api.github.com','codeload.github.com'] or parsed.username:raise ValueError('Unexpected source host')
    with build_opener(NoRedirect).open(Request(url,headers={'User-Agent':'LiberPro-Hosting-CD/1.0','Accept':'application/vnd.github+json'}),timeout=45) as response:
        data=response.read(maximum+1)
    if len(data)>maximum:raise ValueError('Source exceeds size limit')
    return data
def api(path):return json.loads(fetch('https://api.github.com/repos/'+REPOSITORY+'/'+path,2_000_000))
def tested_run(head,runs,jobs):
    candidates=[r for r in runs if r.get('head_sha')==head and r.get('event')=='push' and r.get('head_branch')=='main' and r.get('path')=='.github/workflows/'+WORKFLOW and r.get('head_repository',{}).get('full_name')==REPOSITORY and r.get('status')!='cancelled' and r.get('conclusion') not in ['cancelled','failure','timed_out','action_required']]
    if not candidates:return None
    run=max(candidates,key=lambda r:r['id']);checks=jobs(run['id'])
    if not all(any(j.get('name')==name and j.get('status')=='completed' and j.get('conclusion')=='success' for j in checks) for name in ['Validate','Browser']):return None
    return run
def source_files(data,head):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        prefix='Liberpro-'+head+'/'
        if len(archive.infolist())>1500:raise ValueError('Too many source entries')
        if archive.getinfo(prefix+'ci/managed-files.json').file_size>100_000:raise ValueError('Manifest size limit')
        names=json.loads(archive.read(prefix+'ci/managed-files.json'))
        if not isinstance(names,list) or len(names)>250 or len(names)!=len(set(names)):raise ValueError('Invalid public file manifest')
        files={};total=0
        for name in names:
            safe_path(name);entry=archive.getinfo(prefix+name)
            if entry.file_size>3_000_000 or stat.S_ISLNK(entry.external_attr>>16):raise ValueError('Unsafe source entry')
            total+=entry.file_size
            if total>15_000_000:raise ValueError('Source size limit')
            files[name]=archive.read(entry)
        if not all(n in files for n in ['.htaccess','index.html','contact.php','site.js','style.css','sitemap.xml']):raise ValueError('Incomplete website')
        return files
def atomic_bytes(path,data,mode=0o600):
    if path.is_symlink():raise ValueError('Refusing symlink metadata')
    tmp=path.with_name(path.name+'.'+uuid.uuid4().hex+'.partial')
    fd=os.open(str(tmp),os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:
        with os.fdopen(fd,'wb') as out:
            out.write(data);out.flush();os.fchmod(out.fileno(),mode);os.fsync(out.fileno())
        os.replace(str(tmp),str(path))
    finally:
        if tmp.exists():tmp.unlink()

def atomic_json(path,data,mode=0o600):
    atomic_bytes(path,(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8'),mode)

def publication_records(private,receipt,head,run_id,release_id):
    """Snapshot both records before writes; restore exact previous bytes and modes."""
    previous=[]
    for path in [private,receipt]:
        if path.is_symlink():raise ValueError('Refusing symlink metadata')
        previous.append((path,path.read_bytes() if path.exists() else None,stat.S_IMODE(path.stat().st_mode) if path.exists() else None))
    public={}
    def commit(result):
        atomic_json(private,dict(result,commit=head,runId=run_id,transport='hosting-pull-https'))
        public.update(domain='liberpro.pl',status='PASS',commit=head,runId=run_id,release=release_id,checksPassed=18,publishedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat())
        atomic_json(receipt,public,0o644)
    def rollback():
        errors=[]
        for path,data,mode in previous:
            try:
                if path.is_symlink():raise ValueError('Refusing symlink metadata')
                if data is None:
                    if path.exists():path.unlink()
                elif not path.exists() or path.read_bytes()!=data or stat.S_IMODE(path.stat().st_mode)!=mode:
                    atomic_bytes(path,data,mode)
            except Exception:errors.append(path.name)
        if errors:raise RuntimeError('Cannot restore publication records: '+','.join(errors))
    return commit,rollback,public
def requested_commit(argv=None):
    parser=argparse.ArgumentParser(description='One-off Liber Pro publication requested by its owner')
    parser.add_argument('--commit',help='Exact tested main commit explicitly approved for publication')
    args=parser.parse_args(argv)
    if args.commit is not None and not re.fullmatch(r'[0-9a-f]{40}',args.commit):parser.error('--commit requires a complete 40-character SHA')
    return args.commit
def main():
    approved=requested_commit()
    if approved is None:
        print('Manual mode: no publication requested; no hosting or GitHub checks performed.')
        return
    os.umask(0o077)
    root=HERE.parent;adapter=LocalFiles(root);verify_target(adapter)
    with (HERE/'worker.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:raise RuntimeError('Another publication is running; retry after it completes')
        runtime={'python':platform.python_version(),'domain':'liberpro.pl','rootMarker':'PASS','databaseOperations':0,'portalOperations':0}
        atomic_json(HERE/'runtime.json',runtime)
        config=json.loads((HERE/'config.json').read_text())
        if config!={'mode':'manual'}:raise RuntimeError('Hosting is not configured for manual publication')
        head=api('git/ref/heads/main')['object']['sha']
        if not re.fullmatch(r'[0-9a-f]{40}',head):raise ValueError('Invalid main revision')
        if head!=approved:raise RuntimeError('Current main differs from the explicitly requested revision')
        receipt=root/'public_html'/RECEIPT
        if receipt.is_symlink():raise ValueError('Refusing symlink receipt')
        if receipt.is_file():
            previous=json.loads(receipt.read_text())
            if previous.get('commit')==head and previous.get('status')=='PASS':
                print('Already published: '+head)
                return
        runs=api('actions/workflows/'+WORKFLOW+'/runs?event=push&branch=main&per_page=10')['workflow_runs']
        run=tested_run(head,runs,lambda run_id:api('actions/runs/'+str(run_id)+'/jobs?per_page=100')['jobs'])
        if run is None:raise RuntimeError('Publication blocked: current main requires successful Validate and Browser jobs from the expected push workflow')
        files=source_files(fetch('https://codeload.github.com/'+REPOSITORY+'/zip/'+head),head)
        if api('git/ref/heads/main')['object']['sha']!=head:raise RuntimeError('Publication blocked: main changed while downloading; request the new tested revision')
        baseline=json.loads((HERE/'baseline.json').read_text())
        release_id=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+str(run['id'])
        commit,rollback,public=publication_records(HERE/'last-result.json',receipt,head,run['id'],release_id)
        release(adapter,files,baseline,release_id,lambda:check_public(files),commit,rollback)
        print(json.dumps(public))
def cli():
    try:
        main()
        return 0
    except Exception as error:
        print('Liber Pro deployment stopped: '+str(error),file=sys.stderr)
        return 1

if __name__=='__main__':sys.exit(cli())

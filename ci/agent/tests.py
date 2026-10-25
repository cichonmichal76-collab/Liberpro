"""Real temporary-filesystem tests for the hosting pull deployment adapter."""
from pathlib import Path
import sys,tempfile,json,io,zipfile,ftplib,os
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));sys.path.insert(0,str(HERE.parent))
from localftp import LocalFiles
from deploy import release,sha,MARKER,STATE,read_archive
from worker import tested_run,source_files,REPOSITORY,WORKFLOW
passed=[]
def check(name,fn):fn();passed.append(name)
def fixture(tmp):
    root=Path(tmp)/'domains/liberpro.pl';(root/'public_html/en').mkdir(parents=True)
    (root/MARKER).write_text(json.dumps({'domain':'liberpro.pl','repository':REPOSITORY,'documentRoot':'public_html','version':1}))
    (root/'public_html/index.html').write_bytes(b'old');(root/'public_html/en/index.html').write_bytes(b'English');(root/'public_html/unmanaged.txt').write_bytes(b'preserve')
    return root,LocalFiles(root)
baseline={'index.html':sha(b'old'),'en/index.html':sha(b'English')};new={'index.html':b'new','en/index.html':b'English'}
def success():
    with tempfile.TemporaryDirectory() as tmp:
        root,adapter=fixture(tmp);r=release(adapter,new,baseline,'agent-test-0001',lambda:None)
        assert r['status']=='PASS' and (root/'public_html/index.html').read_bytes()==b'new' and (root/'public_html/unmanaged.txt').read_bytes()==b'preserve'
        assert read_archive((root/r['backup']).read_bytes())=={'index.html':b'old','en/index.html':b'English'}
        assert (root/r['backup']).stat().st_mode&0o777==0o600 and (root/'ci-backups').stat().st_mode&0o777==0o700
check('Local publication saves private exact backup and preserves unmanaged files',success)
def rollback():
    with tempfile.TemporaryDirectory() as tmp:
        root,adapter=fixture(tmp)
        try:release(adapter,new,baseline,'agent-test-0002',lambda:(_ for _ in ()).throw(RuntimeError('Injected failure')))
        except RuntimeError as e:assert 'original website restored' in str(e)
        else:raise AssertionError('Failure ignored')
        assert (root/'public_html/index.html').read_bytes()==b'old' and not (root/STATE).exists()
check('Local publication restores files after failed smoke check',rollback)
def blocked_paths():
    with tempfile.TemporaryDirectory() as tmp:
        root,adapter=fixture(tmp)
        for path in ['../pulpit.liberpro.pl/public_html/index.html','/etc/passwd','logs/site.log','ci-agent/config.json','database.sql']:
            try:adapter.path(path)
            except ValueError:continue
            raise AssertionError('Unsafe path accepted')
        (root/'public_html/escape').symlink_to(Path(tmp),target_is_directory=True)
        try:adapter.path('public_html/escape/file.txt')
        except ValueError:pass
        else:raise AssertionError('Symlink accepted')
check('Domain adapter rejects portal, databases, agent files and symlink escapes',blocked_paths)
head='a'*40
good={'id':1,'head_sha':head,'event':'push','head_branch':'main','path':'.github/workflows/'+WORKFLOW,'head_repository':{'full_name':REPOSITORY},'status':'in_progress','conclusion':None}
jobs=[{'name':n,'status':'completed','conclusion':'success'} for n in ['Validate','Browser']]
assert tested_run(head,[good],lambda _:jobs)==good;passed.append('Both successful required checks allow the current main revision')
for field,value in [('head_sha','b'*40),('event','pull_request'),('head_branch','feature'),('path','evil.yml'),('head_repository',{'full_name':'other/repo'}),('conclusion','failure')]:
    assert tested_run(head,[dict(good,**{field:value})],lambda _:jobs) is None;passed.append('Reject wrong workflow identity: '+field)
for missing in ['Validate','Browser']:
    assert tested_run(head,[good],lambda _:[j for j in jobs if j['name']!=missing]) is None;passed.append('Reject missing check '+missing)
bad_jobs=[dict(j,conclusion='failure') if j['name']=='Browser' else j for j in jobs];assert tested_run(head,[good],lambda _:bad_jobs) is None;passed.append('Reject failed browser job')
def archive(names=None,extra=None):
    required=['.htaccess','index.html','contact.php','site.js','style.css','sitemap.xml'];names=names or required;out=io.BytesIO()
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        prefix='Liberpro-'+head+'/';z.writestr(prefix+'ci/managed-files.json',json.dumps(names))
        for n in required:z.writestr(prefix+n,b'tested website')
        z.writestr(prefix+'ci/evil.py',b'raise RuntimeError("must never execute")')
        if extra:z.writestr(prefix+extra,b'unsafe')
    return out.getvalue()
assert len(source_files(archive(),head))==6;passed.append('Read only allowlisted source data without executing downloaded programs')
for name in ['../index.html','pulpit/index.html','database.sql','ci/evil.py','evil.PHP','en//index.html']:
    try:source_files(archive(['.htaccess','index.html','contact.php','site.js','style.css','sitemap.xml',name],name),head)
    except (ValueError,KeyError):passed.append('Reject unsafe archive entry '+name)
    else:raise AssertionError('Unsafe archive member accepted')
print(json.dumps({'checksPassed':len(passed),'checks':passed,'productionWrites':0},indent=2))

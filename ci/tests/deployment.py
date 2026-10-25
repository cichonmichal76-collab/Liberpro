"""Deterministic failure injection for backup, staging, drift and rollback."""
from pathlib import Path
import sys,json,io,ftplib
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'ci'))
from deploy import release,sha,safe_path,read_archive,MARKER,STATE
class FakeFTP:
    def __init__(self,fail=False):
        self.files={MARKER:json.dumps({'domain':'liberpro.pl','repository':'cichonmichal76-collab/Liberpro','documentRoot':'public_html','version':1}).encode(),'public_html/index.html':b'old home','public_html/en/index.html':b'old English','public_html/unmanaged.txt':b'leave alone'};self.fail=fail;self.replaced=0
    def pwd(self):return '/'
    def retrbinary(self,cmd,write):
        p=cmd[5:]
        if p not in self.files:raise ftplib.error_perm('550 Missing')
        write(self.files[p])
    def storbinary(self,cmd,stream):self.files[cmd[5:]]=stream.read()
    def mkd(self,p):return p
    def rename(self,a,b):
        if self.fail and b.startswith('public_html/') and '/restore/' not in a and '.cicd-probe-' not in b:
            self.replaced+=1
            if self.replaced==2:self.fail=False;raise OSError('Injected mid-release failure')
        self.files[b]=self.files.pop(a)
    def delete(self,p):del self.files[p]
baseline={'index.html':sha(b'old home'),'en/index.html':sha(b'old English')};new={'index.html':b'new home','en/index.html':b'new English'};checks=[]
def test(name,fn):fn();checks.append(name)
def happy():
    f=FakeFTP();r=release(f,new,baseline,'release-test-0001',lambda:None);assert r['status']=='PASS' and r['changedFiles']==2;assert f.files['public_html/index.html']==b'new home';assert f.files['public_html/unmanaged.txt']==b'leave alone';assert read_archive(f.files[r['backup']])=={'index.html':b'old home','en/index.html':b'old English'};assert STATE in f.files
test('Back up first, deploy tested files, preserve unmanaged files, record release',happy)
def rollback(fail_upload=False):
    f=FakeFTP(fail_upload)
    try:release(f,new,baseline,'release-test-0002',lambda:(_ for _ in ()).throw(AssertionError('Smoke failure')))
    except RuntimeError as e:assert 'original website restored' in str(e)
    else:raise AssertionError('Injected failure was ignored')
    assert f.files['public_html/index.html']==b'old home' and f.files['public_html/en/index.html']==b'old English';assert STATE not in f.files
test('Restore original website after public smoke failure',lambda:rollback(False))
test('Restore original website after mid-release transfer failure',lambda:rollback(True))
def drift():
    f=FakeFTP();f.files['public_html/index.html']=b'unexpected manual change';before=f.files.copy()
    try:release(f,new,baseline,'release-test-0003',lambda:None)
    except RuntimeError as e:assert 'drift' in str(e)
    else:raise AssertionError('Manual change overwritten')
    assert f.files==before
test('Stop before any write on manual hosting drift',drift)
def wrong_domain():
    f=FakeFTP();f.files[MARKER]=b'{}';before=f.files.copy()
    try:release(f,new,baseline,'release-test-0004',lambda:None)
    except RuntimeError:pass
    else:raise AssertionError('Wrong domain accepted')
    assert f.files==before
test('Reject a missing or incorrect target marker',wrong_domain)
def paths():
    for p in ['../index.html','/index.html','en/../../x','pulpit/index.html','.env','database.sql','backup.tar.gz','ci/run.py','cgi-bin/a.php','new.php']:
        try:safe_path(p)
        except ValueError:continue
        raise AssertionError('Unsafe path accepted: '+p)
test('Reject portal, databases, backups, test files and traversal',paths)
def no_change():
    f=FakeFTP();r=release(f,{'index.html':b'old home','en/index.html':b'old English'},baseline,'release-test-0005',lambda:None);assert r['changedFiles']==0 and r['backup'] in f.files
test('Initial synchronization still verifies write permission and saves backup',no_change)
def uncertain_state_commit():
    class UncertainFTP(FakeFTP):
        def rename(self,a,b):
            super().rename(a,b)
            if a==STATE+'.partial':raise OSError('Connection failed after state rename')
    f=UncertainFTP();previous=json.dumps({'files':baseline,'release':'previous-release'}).encode();f.files[STATE]=previous
    try:release(f,new,baseline,'release-test-0006',lambda:None)
    except RuntimeError as e:assert 'original website restored' in str(e)
    else:raise AssertionError('Uncertain state commit ignored')
    assert f.files[STATE]==previous and f.files['public_html/index.html']==b'old home' and f.files['public_html/en/index.html']==b'old English'
test('Restore files and prior metadata after an uncertain state commit',uncertain_state_commit)
print(json.dumps({'checksPassed':len(checks),'checks':checks,'productionWrites':0},indent=2))

"""Exercise unchanged production PHP through an isolated localhost server.
Sessions, flock state, concurrency and mail() run normally; sendmail is a local sink.
No production POST, SMTP, client portal or database is accessed.
"""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from concurrent.futures import ThreadPoolExecutor
import os,sys,subprocess,tempfile,socket,json,time,signal,hashlib
ROOT=Path(__file__).resolve().parents[2];SITE=Path(os.environ.get('CI_SITE_DIR',ROOT));OUT=Path(os.environ.get('CI_REPORT_DIR',ROOT/'reports'));OUT.mkdir(exist_ok=True)
PHP=os.environ.get('PHP_BINARY','php');results=[]
def require(ok,detail):
    if not ok:raise AssertionError(detail)
def case(name,fn):
    try:fn();results.append({'name':name,'status':'PASS'})
    except Exception as e:results.append({'name':name,'status':'FAIL','detail':str(e)})
version=subprocess.check_output([PHP,'-r','echo PHP_MAJOR_VERSION,".",PHP_MINOR_VERSION;'],text=True)
require(version=='8.4','Production compatibility requires PHP 8.4, got '+version)
lint=subprocess.run([PHP,'-l',str(SITE/'contact.php')],capture_output=True,text=True);require(lint.returncode==0,lint.stderr)
with tempfile.TemporaryDirectory(prefix='liberpro-ci-backend-') as tmp:
    TMP=Path(tmp);sessions=TMP/'sessions';sessions.mkdir();mail=TMP/'mail.jsonl';fail=TMP/'mail-failure';log=open(TMP/'php.log','w',encoding='utf-8')
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    env={**os.environ,'CI_SITE_DIR':str(SITE),'TMPDIR':tmp,'LP_CI_MAIL_LOG':str(mail),'LP_CI_MAIL_FAIL':str(fail),'PHP_CLI_SERVER_WORKERS':'4'}
    command=[PHP,'-d','session.save_path='+str(sessions),'-d','sendmail_path='+sys.executable+' '+str(ROOT/'ci/tests/mail_sink.py'),'-S','127.0.0.1:'+str(port),str(ROOT/'ci/tests/router.php')]
    proc=subprocess.Popen(command,env=env,stdout=log,stderr=log,start_new_session=True)
    base='http://127.0.0.1:'+str(port);counter=0
    def mails():return len(mail.read_text().splitlines()) if mail.exists() else 0
    class Client:
        def __init__(self,ip=None):
            global counter
            counter+=1;self.ip=ip or '192.0.2.'+str(counter);self.cookie='';self.counter=counter
        def call(self,path='/contact.php',payload=None,method=None,origin='https://www.liberpro.pl',raw=None):
            headers={'X-CI-IP':self.ip,'Origin':origin,'Content-Type':'application/json'}
            if self.cookie:headers['Cookie']=self.cookie
            data=raw if raw is not None else json.dumps(payload).encode() if payload is not None else None
            req=Request(base+path,data=data,headers=headers,method=method or ('POST' if data is not None else 'GET'))
            try:r=urlopen(req,timeout=15)
            except HTTPError as e:r=e
            with r:
                cookies=r.headers.get_all('Set-Cookie',[])
                for c in cookies:
                    if c.startswith('LP_CONTACT='):self.cookie=c.split(';')[0]
                body=r.read();h=dict(r.headers)
                try:parsed=json.loads(body)
                except json.JSONDecodeError:parsed={'invalidJSON':body.decode('utf-8','replace')[:160]}
                return r.status,parsed,h
        def seed(self,age=3):
            code,p,_=self.call('/fixture',{'age':age});require(code==200,'Fixture failed');return p
        def payload(self,**overrides):
            proof=self.seed();data={'name':'CI Fixture','email':f'fixture{self.counter}@example.test','message':f'Isolated fixture enquiry number {self.counter}.','honeypot':'','verification_token':proof['token'],'verification_answer':proof['answer']};data.update(overrides);return data
    try:
        for _ in range(100):
            try:
                if Client().call()[0]==405:break
            except OSError:pass
            time.sleep(.05)
        else:raise RuntimeError('PHP server failed to start')
        def check(payload_change=None,expected=400,raw=None,method=None,origin='https://www.liberpro.pl',age=None):
            c=Client();data=c.payload(**(payload_change or {}))
            if age is not None:
                proof=c.seed(age);data.update(verification_token=proof['token'],verification_answer=proof['answer'])
            before=mails();code,response,_=c.call(payload=data,raw=raw,method=method,origin=origin)
            require(code==expected,(code,response));require(response.get('success')==(expected<400),response)
            require(mails()-before==(1 if expected==200 else 0),'Unexpected real mail sink count')
        case('GET without prepare is rejected',lambda:require(Client().call()[0]==405,'Expected 405'))
        case('PUT is rejected',lambda:check(method='PUT',expected=405))
        def prepare():
            c=Client();code,p,h=c.call('/contact.php?action=prepare');require(code==200 and p['guardVersion']==2 and len(p['token'])==48,(code,p));cookie=h.get('Set-Cookie','').lower();require(all(s in cookie for s in ['secure','httponly','samesite=strict','path=/contact.php']),cookie);require(h.get('X-Robots-Tag')=='noindex, nofollow',h)
        case('Preparation token, version and secure session cookie',prepare)
        case('Cross-site origin is rejected',lambda:check(origin='https://attacker.example',expected=403))
        case('Invalid JSON',lambda:check(raw=b'{',expected=400))
        case('Oversize body',lambda:check(raw=b'x'*32769,expected=413))
        case('Non-string input',lambda:check({'name':['CI']},400))
        case('Honeypot rejects mail',lambda:check({'honeypot':'bot'},400))
        case('Missing token',lambda:check({'verification_token':''},403))
        case('Wrong answer',lambda:check({'verification_answer':'999'},403))
        case('Minimum wait enforced',lambda:check(age=0,expected=403))
        case('Expired proof',lambda:check(age=3601,expected=403))
        case('Valid request sends one office message and no autoresponder',lambda:check(expected=200))
        case('Invalid address',lambda:check({'email':'invalid'},400))
        case('Name header injection',lambda:check({'name':'CI\r\nBcc: injected@example.test'},400))
        case('Service header injection',lambda:check({'service':'CI\r\nBcc: injected@example.test'},400))
        case('Short message',lambda:check({'message':'short'},400))
        case('Long message',lambda:check({'message':'x'*5001},400))
        case('Four URLs rejected',lambda:check({'message':'CI https://a.test https://b.test https://c.test https://d.test'},400))
        case('Three ordinary URLs allowed',lambda:check({'message':'CI https://a.test https://b.test https://c.test'},200))
        case('Spam phrase',lambda:check({'message':'Test casino spam fixture'},400))
        def replay():
            c=Client();p=c.payload();code,_,_=c.call(payload=p);require(code==200,code);require(c.call(payload=p)[0]==403,'Token replay was accepted')
        case('Proof consumed after one attempt',replay)
        def invalid_consumes():
            c=Client();p=c.payload(email='invalid');require(c.call(payload=p)[0]==400,'Invalid email accepted');p['email']='fixed@example.test';require(c.call(payload=p)[0]==403,'Failed attempt did not consume proof')
        case('Failed validation also consumes proof',invalid_consumes)
        def duplicate():
            text='An isolated unique duplicate enquiry for CI.';a=Client();require(a.call(payload=a.payload(message=text))[0]==200,'First request failed');b=Client();require(b.call(payload=b.payload(message=text))[0]==429,'Duplicate accepted')
        case('Duplicate body blocked across sessions and addresses',duplicate)
        def transport_failure():
            c=Client();p=c.payload();fail.touch();require(c.call(payload=p)[0]==500,'Mail failure counted as success');fail.unlink();proof=c.seed();p.update(verification_token=proof['token']);require(c.call(payload=p)[0]==200,'Mail failure did not release duplicate reservation')
        case('Mail failure returns error and permits a new verified retry',transport_failure)
        def parallel_limit():
            clients=[Client('192.0.2.240') for _ in range(8)];payloads=[c.payload() for c in clients];before=mails()
            with ThreadPoolExecutor(max_workers=8) as pool:codes=list(pool.map(lambda pair:pair[0].call(payload=pair[1])[0],zip(clients,payloads)))
            require(codes.count(200)==3 and codes.count(429)==5,codes);require(mails()-before==3,'Parallel requests bypassed the shared lock')
        case('Concurrent workers enforce IP limit atomically',parallel_limit)
        def attempt_limit():
            c=Client('192.0.2.241')
            for _ in range(12):require(c.call(raw=b'{')[0]==400,'Limit triggered too soon')
            require(c.call(raw=b'{')[0]==429,'13th attempt accepted')
        case('Attempt limit enforced before validation',attempt_limit)
        def stored_privacy():
            states=list(TMP.glob('liberpro-contact-guard-*/limits.json'));require(len(states)==1,'Missing isolated lock state');raw=states[0].read_text();require('@example.test' not in raw and 'CI Fixture' not in raw,'State contains raw personal data');require((states[0].stat().st_mode&0o777)==0o600,'State permissions not private')
        case('Private state stores hashes rather than contact fields',stored_privacy)
        failed=[r for r in results if r['status']=='FAIL'];report={'phpVersion':version,'checksPassed':len(results)-len(failed),'checksFailed':len(failed),'checks':results,'productionRequests':0,'externalEmails':0,'mailSinkMessages':mails(),'workers':4}
        (OUT/'backend-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False))
        if failed:raise AssertionError(str(failed))
    finally:
        os.killpg(proc.pid,signal.SIGTERM);proc.wait(timeout=10);log.close()

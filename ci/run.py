"""Dependency-free checks. Network mode sends public GET requests only."""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit, unquote, quote, urlunsplit
import argparse, datetime, hashlib, json, os, re, shutil, subprocess, sys, time
import xml.etree.ElementTree as ET
import zipfile

ROOT=Path(__file__).resolve().parent.parent; SITE=Path(os.environ.get('CI_SITE_DIR',ROOT)).resolve(); REPORTS=Path(os.environ.get('CI_REPORT_DIR',ROOT/'reports')).resolve()
REPORTS.mkdir(exist_ok=True)
BASE='https://www.liberpro.pl/'
RESULTS=[]
def result(name,ok=True,detail='',status=None):
    entry={'name':name,'status':status or ('PASS' if ok else 'FAIL'),'detail':detail}
    RESULTS.append(entry)
    if entry['status']!='PASS': print(entry['status']+' '+name+': '+str(detail),flush=True)
def check(name,fn):
    try:
        detail=fn(); result(name,True,detail if detail is not None else '')
    except Exception as e: result(name,False,str(e))
def require(ok,detail):
    if not ok: raise AssertionError(detail)
def save(name,data): (REPORTS/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')

class Page(HTMLParser):
    def __init__(self,text):
        super().__init__(convert_charrefs=True)
        self.fallbacks=[];self.ids=[];self.lang='';self.title='';self.h1=0;self.canon=[];self.robots=[];self.viewport=[];self.links=[];self.assets=[];self.hreflangs=[]
        self.scripts=[];self.jsonld=[];self.handlers=[];self.controls=[];self.labels=[];self.images=[];self.forms=[];self._script=None;self._title=False
        self.feed(text)
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.append(a['id'])
        self.handlers += [v for k,v in attrs if k.startswith('on') and v]
        if t=='html':self.lang=a.get('lang','')
        if t=='h1':self.h1+=1
        if t=='title':self._title=True
        if t=='meta' and a.get('name','').startswith('language-fallback-'):self.fallbacks.append((a['name'].replace('language-fallback-',''),a.get('content','')))
        if t=='meta' and a.get('name','').lower()=='robots':self.robots.append(a.get('content',''))
        if t=='meta' and a.get('name','').lower()=='viewport':self.viewport.append(a.get('content',''))
        if t=='link' and a.get('rel')=='canonical':self.canon.append(a.get('href',''))
        if t=='link' and a.get('hreflang'):self.hreflangs.append((a['hreflang'],a.get('href','')))
        if t=='a' and a.get('href'):self.links.append(a['href'])
        if t in ['script','img','source'] and a.get('src'):self.assets.append(a['src'])
        if t=='link' and a.get('rel') in ['stylesheet','icon','apple-touch-icon']:self.assets.append(a.get('href',''))
        if t=='script' and not a.get('src'):self._script={'type':a.get('type',''),'text':''}
        if t in ['input','textarea','select']:self.controls.append((t,a))
        if t=='label' and a.get('for'):self.labels.append(a['for'])
        if t=='img':self.images.append(a)
        if t=='form':self.forms.append(a)
    def handle_data(self,d):
        if self._title:self.title+=d
        if self._script is not None:self._script['text']+=d
    def handle_endtag(self,t):
        if t=='title':self._title=False
        if t=='script' and self._script is not None:
            if self._script['type']=='application/ld+json':self.jsonld.append(self._script['text'])
            elif self._script['type'] in ['','text/javascript','application/javascript']:self.scripts.append(self._script['text'])
            self._script=None

def local_path(url):
    p=unquote(urlsplit(url).path).lstrip('/')
    if not p or p.endswith('/'):p+='index.html'
    target=(SITE/p).resolve()
    require(target.is_relative_to(SITE.resolve()),'Path outside site')
    return target

REDIRECTS=json.loads((ROOT/'ci/fixtures/redirects.json').read_text(encoding='utf-8'))
REDIRECTS.update({'index.html':'','en/index.html':'en/','blog-odbiór-faktur-ksef.html':'blog-odbior-faktur-ksef.html','en/blog-odbiór-faktur-ksef.html':'en/blog-odbior-faktur-ksef.html'})
def resolved_link(source,href):
    u=urljoin(source,href);p=urlsplit(u)
    if p.netloc not in ['www.liberpro.pl','liberpro.pl'] or p.scheme not in ['https','http']:return None
    key=unquote(p.path).lstrip('/')
    if key in REDIRECTS:
        target=urljoin(BASE,REDIRECTS[key]);q=urlsplit(target)
        u=target if q.fragment else target+('#'+p.fragment if p.fragment else '')
    return u

def static_checks():
    tree=ET.fromstring((SITE/'sitemap.xml').read_text(encoding='utf-8'));ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls=[x.text for x in tree.findall('s:url/s:loc',ns)]
    check('sitemap unique own HTTPS URLs',lambda:require(len(urls)==len(set(urls)) and all(u.startswith(BASE) for u in urls),'Duplicate or foreign URL'))
    for node in tree.findall('s:url',ns):
        date=node.findtext('s:lastmod',namespaces=ns)
        check('sitemap date '+node.findtext('s:loc',namespaces=ns),lambda d=date:require(datetime.date.fromisoformat(d)<=datetime.datetime.now(datetime.timezone.utc).date(),'Future lastmod'))
    extra=[BASE+p for p in ['polityka-prywatnosci.html','en/polityka-prywatnosci.html','widget-kalkulator-vat.html','en/widget-kalkulator-vat.html','404.html','en/404.html']]
    pages={};scripts=[];assets=set();link_errors=[];a11y=[]
    for u in urls+extra:
        p=local_path(u)
        if not p.is_file():result('local page '+u,False,'Missing');continue
        text=p.read_text(encoding='utf-8');page=Page(text);pages[u]=page
        rel=p.relative_to(SITE).as_posix();error_page=rel.endswith('404.html');private='polityka-prywatnosci' in rel or error_page;widget='widget-kalkulator' in rel
        check('HTML metadata '+rel,lambda page=page,u=u,private=private,widget=widget,error_page=error_page:require(page.lang==('en' if '/en/' in u else 'pl') and (widget or (bool(page.title.strip()) and bool(page.viewport) and page.h1==1 and (error_page or page.canon==[u]))) and (any('noindex' in x for x in page.robots) if private or widget else not any('noindex' in x for x in page.robots)),'lang/title/viewport/H1/canonical/robots contract'))
        check('unique DOM IDs '+rel,lambda page=page:require(len(page.ids)==len(set(page.ids)),[x for x,n in Counter(page.ids).items() if n>1]))
        check('JSON-LD '+rel,lambda page=page:[json.loads(x) for x in page.jsonld] and None)
        for label in page.labels:
            if label not in page.ids:a11y.append({'path':rel,'issue':'label without target','id':label})
        for image in page.images:
            if 'alt' not in image:a11y.append({'path':rel,'issue':'image without alt'})
        scripts.append({'path':rel,'scripts':page.scripts,'handlers':page.handlers})
        for href in page.assets:
            resolved=resolved_link(u,href)
            if resolved:assets.add(resolved.split('#')[0].split('?')[0])
    for u,page in pages.items():
        for href in page.links+page.assets+[x[1] for x in page.hreflangs]:
            dest=resolved_link(u,href)
            if not dest:continue
            target=local_path(dest)
            if not target.is_file():link_errors.append({'source':u,'href':href,'issue':'missing file'});continue
            fragment=unquote(urlsplit(dest).fragment)
            if fragment and target.suffix=='.html':
                destpage=pages.get(dest.split('#')[0]) or Page(target.read_text(encoding='utf-8'))
                if fragment not in destpage.ids:link_errors.append({'source':u,'href':href,'issue':'missing fragment','fragment':fragment})
        if u in urls:
            expected='pl' if '/en/' in u else 'en'
            check('language alternate '+u,lambda page=page,expected=expected:require(any(lang==expected for lang,href in page.hreflangs+page.fallbacks),'Missing language alternate'))
    save('links.json',link_errors);save('a11y-static.json',a11y);save('scripts.json',scripts)
    check('all internal files and fragments',lambda:require(not link_errors,str(link_errors[:12])))
    check('basic labels and image alternatives',lambda:require(not a11y,str(a11y[:12])))
    robots=(SITE/'robots.txt').read_text(encoding='utf-8')
    check('robots sitemap and indexing scope',lambda:require('Sitemap: '+BASE+'sitemap.xml' in robots and 'Disallow: /\n' not in robots,'Invalid robots scope'))
    for rel in ['kontakt.html','en/kontakt.html']:
        p=pages[BASE+rel]
        check('contact form contract '+rel,lambda p=p:require(any(f.get('action')=='/contact.php' and f.get('method','').lower()=='post' for f in p.forms) and {'name','email','message','honeypot'}.issubset({a.get('name') for t,a in p.controls}),'Invalid form route or fields'))
    php=(SITE/'contact.php').read_text(encoding='utf-8')
    checks={'PHP method guard':"$method !== 'POST' && !$prepare",'PHP rate limit response':'lp_reply(429','PHP honeypot':"$input['honeypot']",'PHP session challenge':'contact_proofs','PHP locked state':'flock($handle, LOCK_EX)','PHP email validation':'FILTER_VALIDATE_EMAIL','PHP response content type':'application/json','PHP message maximum':'> 5000','PHP no autoresponder':'No autoresponder'}
    for name,needle in checks.items():check(name,lambda needle=needle:require(needle in php,'Missing static safeguard; not a runtime proof'))
    forbidden=[]
    for name in json.loads((ROOT/'ci/managed-files.json').read_text(encoding='utf-8')):
        p=SITE/name
        if not p.is_file():continue
        if p.is_symlink() or p.suffix.lower() in ['.sql','.log','.bak','.zip','.gz','.rar'] or p.name.lower() in ['.env','.htpasswd']:forbidden.append(p.relative_to(SITE).as_posix())
        if p.suffix in ['.js','.html','.php','.txt']:
            content=p.read_text(encoding='utf-8')
            if re.search(r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}',content):forbidden.append(p.relative_to(SITE).as_posix()+' (credential pattern)')
    check('release excludes backups/databases/known credential patterns',lambda:require(not forbidden,forbidden))
    for rel in ['narzedzia.html','en/narzedzia.html']:
        text=(SITE/rel).read_text(encoding='utf-8')
        check('shared calculator source '+rel,lambda text=text:require('/calculators-2026.js?v=20261025-2' in text and '8638.04' not in text,'Old or missing engine'))
    save('inventory.json',{'sitemapPages':len(urls),'checkedHtmlPages':len(pages),'localAssets':len(assets),'allSiteFiles':len(json.loads((ROOT/'ci/managed-files.json').read_text(encoding='utf-8')))})
    return urls,pages,assets

def node_suite(name,file,summary):
    node=os.environ.get('NODE_BINARY') or shutil.which('node')
    if not node:result(name,False,'Node.js missing');return
    env={**os.environ,'CI_SITE_DIR':str(SITE),'CI_REPORT_DIR':str(REPORTS)}
    run=subprocess.run([node,str(ROOT/'ci/tests'/file)],cwd=ROOT,env=env,text=True,encoding='utf-8',capture_output=True,timeout=90)
    (REPORTS/(name+'.log')).write_text(run.stdout+run.stderr,encoding='utf-8')
    result(name,run.returncode==0,'exit '+str(run.returncode))
    if (REPORTS/summary).is_file():
        data=json.loads((REPORTS/summary).read_text(encoding='utf-8'));print(name+': '+json.dumps(data,ensure_ascii=False),flush=True)

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
def get(url):
    p=urlsplit(url)
    require(p.hostname in ['www.liberpro.pl','liberpro.pl'] and p.scheme in ['http','https'],'Only the owned public website is allowed')
    require('pulpit' not in p.path.lower(),'Client portal is out of scope')
    url=urlunsplit((p.scheme,p.netloc,quote(unquote(p.path),safe='/'),p.query,''))
    started=time.monotonic()
    try:
        try:r=build_opener(NoRedirect).open(Request(url,headers={'User-Agent':'LiberPro-Authorized-CI-ReadOnly/1.0','Cache-Control':'no-cache','Accept-Encoding':'identity'}),timeout=25)
        except HTTPError as e:r=e
        with r:
            data=r.read(3000001);require(len(data)<=3000000,'Response too large')
            return {'url':url,'status':r.status,'headers':{k.lower():v for k,v in r.headers.items()},'body':data,'seconds':round(time.monotonic()-started,3)}
    except Exception as e:return {'url':url,'error':str(e),'body':b'','headers':{}}

def public_checks(urls,pages,assets):
    targets=sorted(set(urls)|set(assets)|{u for u in pages if '404.html' not in u}|{BASE+'sitemap.xml',BASE+'robots.txt',BASE+'contact.php'})
    with ThreadPoolExecutor(max_workers=3) as pool:responses=list(pool.map(get,targets))
    by_url={x['url']:x for x in responses}
    for r in responses:
        u=r['url'];expected=405 if u.endswith('/contact.php') else 200
        check('public status '+u,lambda r=r,expected=expected:require(r.get('status')==expected,r.get('status',r.get('error'))))
        if expected==200:
            p=local_path(u)
            if p.is_file():
                expected_bytes=p.read_bytes();actual=r['body']
                if p.suffix in ['.html','.js','.css','.txt','.xml']:
                    expected_bytes=expected_bytes.replace(b'\r\n',b'\n');actual=actual.replace(b'\r\n',b'\n')
                check('public matches snapshot '+u,lambda actual=actual,expected_bytes=expected_bytes:require(actual==expected_bytes,'Deployment differs from tested snapshot'))
        if u in pages:
            live=Page(r['body'].decode('utf-8','replace'));private='polityka-prywatnosci' in u or 'widget-kalkulator' in u
            check('public noindex policy '+u,lambda r=r,live=live,private=private:require(private or ('noindex' not in r['headers'].get('x-robots-tag','').lower() and not any('noindex' in x for x in live.robots)),'Unexpected noindex'))
            for header in ['content-security-policy','x-content-type-options','strict-transport-security','referrer-policy']:
                check(header+' '+u,lambda r=r,header=header:require(bool(r['headers'].get(header)),'Missing header'))
    for source,target in REDIRECTS.items():
        r=get(BASE+source);expected=urljoin(BASE,target)
        check('301 '+source,lambda r=r,expected=expected:require(r.get('status')==301 and urljoin(BASE,r['headers'].get('location',''))==expected,(r.get('status'),r['headers'].get('location'))))
    for u in ['http://liberpro.pl/','http://www.liberpro.pl/','https://liberpro.pl/']:
        r=get(u);check('canonical host '+u,lambda r=r:require(r.get('status') in [301,308] and r['headers'].get('location')==BASE,(r.get('status'),r['headers'].get('location'))))
    for p,lang in [('ci-missing-20261025.html','pl'),('en/ci-missing-20261025.html','en'),('en/nested/ci-missing-20261025.html','en')]:
        r=get(BASE+p);page=Page(r['body'].decode('utf-8','replace'))
        check('localized 404 '+p,lambda r=r,page=page,lang=lang:require(r.get('status')==404 and page.lang==lang,(r.get('status'),page.lang)))
        for href in page.assets+page.links:
            if href.startswith(('#','mailto:','tel:','http:','https:')):continue
            check('absolute 404 resource '+p+' '+href,lambda href=href:require(href.startswith('/'),'Relative broken resource on nested 404'))
    for p in ['.htaccess','.env','.git/config','liberpro-przed-kalkulatorami-i-pomiarem-2026-10-25.tar.gz']:
        r=get(BASE+p);check('non-public sensitive path '+p,lambda r=r:require(r.get('status') in [403,404],r.get('status',r.get('error'))))
    for p in ['site.js','style.css']:
        r=by_url.get(BASE+p)
        check('cache invalidation '+p,lambda r=r:require(r and 'no-cache' in r['headers'].get('cache-control',''),'Shared asset can stay stale'))
    safe=[{k:v for k,v in r.items() if k!='body'}|{'bytes':len(r['body'])} for r in responses]
    save('public.json',safe)

def php_checks(strict):
    php=os.environ.get('PHP_BINARY') or shutil.which('php')
    if not php:
        result('PHP 8.4 backend tests',False,'PHP CLI unavailable',status='FAIL' if strict else 'SKIP');return
    env={**os.environ,'CI_SITE_DIR':str(SITE),'CI_REPORT_DIR':str(REPORTS),'PHP_BINARY':php}
    run=subprocess.run([sys.executable,str(ROOT/'ci/tests/backend.py')],env=env,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',timeout=150)
    (REPORTS/'backend.log').write_text(run.stdout+run.stderr,encoding='utf-8')
    result('PHP 8.4 isolated HTTP, mail sink and concurrency',run.returncode==0,run.stdout[-1200:]+run.stderr[-1200:])

def build_artifact():
    ready=not any(x['status'] in ['FAIL','SKIP'] for x in RESULTS)
    target=REPORTS/('liberpro-tested-site.zip' if ready else 'liberpro-unapproved-snapshot.zip');manifest=[]
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        for rel in json.loads((ROOT/'ci/managed-files.json').read_text(encoding='utf-8')):
            p=SITE/rel
            if p.is_file():
                rel=p.relative_to(SITE).as_posix();require(not p.is_symlink() and '..' not in Path(rel).parts,'Unsafe artifact entry')
                data=p.read_bytes();info=zipfile.ZipInfo(rel,date_time=(2026,10,25,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(info,data)
                manifest.append({'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    with zipfile.ZipFile(target) as archive:require(archive.testzip() is None,'Corrupt build')
    save('build-manifest.json',{'artifact':target.name,'releaseReady':ready,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'files':manifest})
    return str(len(manifest))+' files; artifact stays local; no deployment'

def main():
    p=argparse.ArgumentParser();p.add_argument('--public',action='store_true');p.add_argument('--require-php',action='store_true');args=p.parse_args()
    urls,pages,assets=static_checks()
    for name,file,summary in [('calculators','calculators.cjs','calculator-tests.json'),('contact','contact.cjs','contact-measurement-tests.json'),('properties','properties.cjs','properties.json'),('boundaries','boundaries.cjs','money-boundaries.json'),('syntax','syntax.cjs','syntax.json')]:node_suite(name,file,summary)
    php_checks(args.require_php)
    if args.public:public_checks(urls,pages,assets)
    else:result('Production smoke scope',detail='Not run before deployment; local and isolated tests are authoritative for this build')
    check('deterministic release archive',build_artifact)
    failed=sum(x['status']=='FAIL' for x in RESULTS);skipped=sum(x['status']=='SKIP' for x in RESULTS)
    summary={'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FAIL' if failed else 'PARTIAL' if skipped else 'PASS','releaseReady':not failed and not skipped,'siteRoot':str(SITE),'passed':sum(x['status']=='PASS' for x in RESULTS),'failed':failed,'skipped':skipped,'publicEnabled':args.public,'productionWrites':0,'emailSubmissions':0,'checks':RESULTS}
    save('results.json',summary)
    suite=ET.Element('testsuite',name='LiberPro CI',tests=str(len(RESULTS)),failures=str(failed),skipped=str(skipped))
    for x in RESULTS:
        case=ET.SubElement(suite,'testcase',name=x['name'])
        if x['status'] in ['FAIL','SKIP']:ET.SubElement(case,'failure' if x['status']=='FAIL' else 'skipped',message=str(x['detail']))
    ET.ElementTree(suite).write(REPORTS/'junit.xml',encoding='utf-8',xml_declaration=True)
    print(json.dumps({k:v for k,v in summary.items() if k!='checks'},ensure_ascii=False,indent=2))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as f:f.write('LiberPro validation: '+summary['status']+'; '+str(summary['passed'])+' passed, '+str(failed)+' failed, '+str(skipped)+' skipped. Publication is confirmed separately by the deployment job.\n')
    return 1 if failed else 0
if __name__=='__main__':sys.exit(main())

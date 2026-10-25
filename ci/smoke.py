"""Bounded, read-only checks of the deployed public website."""
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError
from urllib.parse import urlsplit
from concurrent.futures import ThreadPoolExecutor
import re
BASE='https://www.liberpro.pl/'
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
def get(path):
    assert not path.startswith('/') and '..' not in path and 'pulpit' not in path.lower()
    try:r=build_opener(NoRedirect).open(Request(BASE+path,headers={'Cache-Control':'no-cache','User-Agent':'LiberPro-CD-ReadOnly/1.0'}),timeout=25)
    except HTTPError as e:r=e
    with r:return r.status,r.read(),r.headers
def check_public(files):
    paths=['index.html','blog.html','blog-progi-pit-2027-sejm.html','narzedzia.html','site.js','style.css','calculators-2026.js','sitemap.xml']
    paths += [prefix+name for prefix in ['', 'en/'] for name in ['ksiegowosc.html','kadry.html','zakladanie-dzialalnosci.html','zakladanie-spolki.html']]
    def check(path):
        request_path='' if path=='index.html' else path
        code,data,headers=get(request_path)
        if code!=200:raise AssertionError('Production HTTP error: '+path+' '+str(code))
        if path in files and data.replace(b'\r\n',b'\n')!=files[path].replace(b'\r\n',b'\n'):raise AssertionError('Production content mismatch: '+path)
        if path.endswith('.html') and ('noindex' in headers.get('X-Robots-Tag','').lower() or re.search(br'<meta[^>]+name=["\']robots["\'][^>]+noindex',data,re.I)):raise AssertionError('Production noindex: '+path)
    with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(check,paths))
    if get('contact.php')[0]!=405:raise AssertionError('Contact endpoint GET contract failed')
    if get('ci-smoke-missing-page.html')[0]!=404:raise AssertionError('Production 404 failed')
    return {'checksPassed':len(paths)+2,'writes':0,'emails':0}

"""Read-only preview: allowlisted website files, no executable PHP or POST."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,unquote
import json
ROOT=Path(__file__).resolve().parent.parent
FILES=set(json.loads((ROOT/'ci/managed-files.json').read_text(encoding='utf-8')))
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def do_GET(self):
        name=unquote(urlsplit(self.path).path).lstrip('/')
        if not name or name.endswith('/'):name+='index.html'
        if name not in FILES or name.endswith('.php') or any(x.startswith('.') for x in Path(name).parts):self.send_error(404);return
        super().do_GET()
    def do_POST(self):self.send_error(405)
    def log_message(self,*a):pass
ThreadingHTTPServer(('127.0.0.1',8778),Handler).serve_forever()

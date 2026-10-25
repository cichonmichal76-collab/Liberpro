"""CI sendmail replacement: writes only to a temporary local file, never SMTP."""
import fcntl,json,os,sys
from pathlib import Path
raw=sys.stdin.buffer.read()
if Path(os.environ['LP_CI_MAIL_FAIL']).exists():sys.exit(1)
with open(os.environ['LP_CI_MAIL_LOG'],'a',encoding='utf-8') as f:
    fcntl.flock(f,fcntl.LOCK_EX)
    f.write(json.dumps({'message':raw.decode('utf-8','replace')})+'\n');f.flush()
sys.exit(0)

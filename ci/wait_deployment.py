"""Verify hosting receipt and deployed source; never send credentials or forms."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
import os,json,time
from smoke import check_public
ROOT=Path(__file__).resolve().parent.parent
def main():
    head=os.environ['GITHUB_SHA'];deadline=time.monotonic()+600;last='Waiting for hosting cron'
    while time.monotonic()<deadline:
        try:
            request=Request('https://www.liberpro.pl/deployment-status.json?revision='+head,headers={'Cache-Control':'no-cache','User-Agent':'LiberPro-CD-Verification/1.0'})
            with urlopen(request,timeout=20) as response:receipt=json.load(response)
            if receipt.get('domain')=='liberpro.pl' and receipt.get('commit')==head and receipt.get('status')=='PASS' and receipt.get('checksPassed')==18:
                names=json.loads((ROOT/'ci/managed-files.json').read_text(encoding='utf-8'));files={n:(ROOT/n).read_bytes() for n in names};checks=check_public(files)
                report={**receipt,'managedFiles':len(files),'verification':checks,'transport':'hosting-pull-https','databaseOperations':0,'portalOperations':0}
                out=ROOT/'reports';out.mkdir(exist_ok=True);(out/'deployment.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
                if os.environ.get('GITHUB_STEP_SUMMARY'):
                    with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as summary:
                        summary.write('## Liber Pro deployment: PASS\n\nHosting confirmed publication of `'+head+'`. Independent public verification passed '+str(checks['checksPassed'])+' checks. Deployment scope: '+str(len(files))+' public website files. Backups and rollback are managed outside WWW. Database operations: 0; portal operations: 0; emails: 0.\n')
                return
            last='Hosting has not yet published this revision'
        except (HTTPError,URLError,ValueError) as error:last=type(error).__name__+' while waiting for hosting receipt'
        time.sleep(10)
    raise SystemExit('Hosting deployment not confirmed within 10 minutes: '+last)
if __name__=='__main__':main()

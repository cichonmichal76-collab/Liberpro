from pathlib import Path
import json,os
p=Path('reports/results.json')
if not p.exists():raise SystemExit(0)
r=json.loads(p.read_text());text=f"## Liber Pro: {r['status']}\n\n{r['passed']} checks passed; {r['failed']} failed; {r['skipped']} skipped.\n"
for name in ['properties.json','backend-tests.json','contact-measurement-tests.json']:
    file=Path('reports')/name
    if file.exists():
        d=json.loads(file.read_text());text+=f"\n- {name}: {d.get('checksPassed',0)} checks passed"
        if 'generatedExamplesCompleted' in d:text+=f"; {d['generatedExamplesCompleted']} generated examples"
        text+='\n'
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f:f.write(text)
print(text)

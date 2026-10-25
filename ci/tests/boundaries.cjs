const A=require('node:assert/strict'),fs=require('node:fs'),C=require(require('node:path').join(process.env.CI_SITE_DIR||require('node:path').resolve(__dirname,'../..'),'calculators-2026.js'));
let n=0;const half=(a,b)=>(a+b/2n)/b;
for(const c of [1n,2n,5n,10n,99n,100n,1005n,8602790n,99999999999999n,100000000000000n]){
  for(const r of [0n,5n,8n,23n]){
    const input=Number(c)/100,x=C.vat(input,Number(r),'netto'),y=C.vat(input,Number(r),'brutto');
    A.equal(Math.round(x.tax*100),Number(half(c*r,100n)));
    A.equal(Math.round(y.net*100),Number(half(c*100n,100n+r)));n+=2;
  }
}
A.equal(C.vat(1.005,0,'netto').net,1.01);n++;
A.equal(C.vat(86027.90,5,'netto').gross,90329.30);n++;
A.equal(C.employer(13850,1.91,true,false,2,157962.86).total,16982.88);n++;
fs.writeFileSync(require('node:path').join(process.env.CI_REPORT_DIR||require('node:path').resolve(__dirname,'../../reports'),'money-boundaries.json'),JSON.stringify({checksPassed:n,checksFailed:0},null,2));console.log(JSON.stringify({checksPassed:n,checksFailed:0}));

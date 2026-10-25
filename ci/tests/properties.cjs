'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require(require('node:path').join(process.env.CI_SITE_DIR||require('node:path').resolve(__dirname,'../..'),'calculators-2026.js'));
let checks=0,examples=0,seed=20261025;const failures=[];
const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
const cents=n=>Math.round(n*100),money=n=>Number(n)/100;
const halfUp=(n,d)=>(n+d/2n)/d;
function test(name,fn){try{fn();checks++;console.log('PASS '+name);}catch(e){failures.push({name,error:e.message});console.error('FAIL '+name+': '+e.message);}}
test('VAT: independent integer-cent oracle, 2000 seeded cases',()=>{
 for(let i=0;i<2000;i++){
  const amount=BigInt(next()%100000000),rate=[0n,5n,8n,23n][next()%4];
  const net=C.vat(money(amount),Number(rate),'netto'),gross=C.vat(money(amount),Number(rate),'brutto');
  A.equal(cents(net.tax),Number(halfUp(amount*rate,100n)),JSON.stringify({amount:money(amount),rate:Number(rate),net,expectedTax:money(halfUp(amount*rate,100n))}));
  A.equal(cents(net.gross),cents(net.net)+cents(net.tax));
  A.equal(cents(gross.net),Number(halfUp(amount*100n,100n+rate)),JSON.stringify({amount:money(amount),rate:Number(rate),gross}));
  A.equal(cents(gross.gross),cents(gross.net)+cents(gross.tax));examples++;
 }
});
test('Employer: independent cents oracle, cap/funds/PPK, 2000 cases',()=>{
 for(let i=0;i<2000;i++){
  const g=BigInt(next()%20000000),prior=BigInt(next()%30000000),ppk=[0,150,200,400][next()%4],acc=next()%334;
  const fp=!!(next()%2),fg=!!(next()%2),cap=28260000n,base=g<(cap>prior?cap-prior:0n)?g:(cap>prior?cap-prior:0n);
  const pension=halfUp(base*976n,10000n),disability=halfUp(base*650n,10000n),accident=halfUp(g*BigInt(acc),10000n);
  const funds=fp?halfUp(g*245n,10000n):0n,guarantee=fg?halfUp(g*10n,10000n):0n,capital=halfUp(g*BigInt(ppk),10000n);
  const x=C.employer(money(g),acc/100,fp,fg,ppk/100,money(prior));
  A.equal(x.error,undefined);A.equal(cents(x.total),Number(g+pension+disability+accident+funds+guarantee+capital),JSON.stringify({gross:money(g),prior:money(prior),ppk:ppk/100,accident:acc/100,funds:fp,fgsp:fg,actual:x.total,expected:money(g+pension+disability+accident+funds+guarantee+capital)}));examples++;
 }
});
test('PIT: independent whole-PLN oracle and deductions, 1000 cases',()=>{
 for(let i=0;i<1000;i++){
  const r=next()%100000000,c=next()%50000000,s=next()%3000000,hl=next()%2000000,hr=next()%2000000,rate=[2,3,5.5,8.5,10,12,12.5,14,15,17][next()%10];
  const income=Math.max(0,r-c-s),scale=Math.floor((income+50)/100),linear=Math.floor((Math.max(0,income-Math.min(hl,1410000))+50)/100);
  const lump=Math.floor((Math.max(0,2*r-2*s-hr)+100)/200);
  const x=C.pit(r/100,c/100,s/100,rate,hl/100,hr/100);
  A.equal(x.scale,Math.round(Math.max(0,scale<=120000?scale*12/100-3600:10800+(scale-120000)*32/100)));
  A.equal(x.linear,Math.round(linear*19/100));A.equal(x.lump,Math.round(lump*rate/100));examples++;
 }
});
test('Limits: every calendar day, VAT and fiscal threshold, 730 cases',()=>{
 for(let day=0;day<365;day++)for(const annual of [20000,240000]){
  const d=new Date(Date.UTC(2026,0,1+day)).toISOString().slice(0,10),x=C.limit(d,0,annual,'2026-12-31');
  A.equal(x.error,undefined);A.equal(x.days,365-day);A.equal(cents(x.limit),Number(halfUp(BigInt(annual*100*(365-day)),365n)));examples++;
 }
});
test('ZUS: all modes/tax forms/months/sickness/fund choices, 1728 cases',()=>{
 for(const mode of ['pelny','pref','maly','tylko'])for(const form of ['ogolna','liniowy','karta','r60','r300','rpow'])for(let month=1;month<=12;month++)for(const ill of [false,true])for(const fund of ['auto','on','off']){
  const x=C.zus(mode,form,10000,month,ill,5000,fund);A.equal(x.error,undefined);
  A.equal(cents(x.total),cents(x.social)+cents(x.fpfs)+cents(x.health));
  A.equal(cents(x.social),cents(x.pension)+cents(x.disability)+cents(x.sickness)+cents(x.accident));
  if(mode==='tylko')A.equal(x.social+x.fpfs,0);if(!ill)A.equal(x.sickness,0);examples++;
 }
});
test('Reject non-finite, string, missing and out-of-bound inputs without exceptions',()=>{
 for(const n of [undefined,null,'1000',NaN,Infinity,-Infinity,-.01,1e13]){
  A.ok(C.vat(n,23,'netto').error);A.ok(C.employer(n,1.67,true,true,0,0).error);A.ok(C.pit(n,0,0,12,0,0).error);examples++;
 }
 for(const x of ['2026-00-01','2026-13-01','2026-04-31','2026-02-29','2026-1-01','<script>','2026-01-01Z']){A.ok(C.limit(x,0,240000).error);examples++;}
});
fs.writeFileSync(path.join(process.env.CI_REPORT_DIR||path.join(__dirname,'../../reports'),'properties.json'),JSON.stringify({checksPassed:checks,checksFailed:failures.length,failures,generatedExamplesCompleted:examples,seed:20261025},null,2));
if(failures.length)process.exitCode=1;

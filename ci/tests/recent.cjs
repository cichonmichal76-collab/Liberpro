const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const base=path.resolve(process.env.CI_REPORT_DIR||path.join(__dirname,'../../reports'));const SITE=path.resolve(process.env.CI_SITE_DIR||path.join(__dirname,'../..'));
const manager=fs.readFileSync(path.join(SITE,'cookies.js'),'utf8');
const site=fs.readFileSync(path.join(SITE,'site.js'),'utf8');
let passed=0;
class E {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.dataset={};this.style={};this.events={};this.hidden=false;this.disabled=false;this.value='';this._text='';const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};}
 set textContent(x){this._text=x;}get textContent(){return this._text;}set innerText(x){this._text=x;}get innerText(){return this._text;}
 appendChild(e){this.children.push(e);e.parentElement=this;return e;}insertBefore(e,before){const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,e);e.parentElement=this;return e;}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}
 addEventListener(k,fn){this.events[k]=fn;}focus(){this.focused=true;}remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);}
 closest(){return null;}querySelector(){return null;}querySelectorAll(){return [];}
}
function fixture({consent,debug=false,legacy=false,locale='pl',withForm=false,sourceHtml='',response={success:true},httpOk=true,prepareOk=true}={}){
 const jar=new Map([['auth_session','fixture-only']]);if(consent)jar.set('cookie_consent',consent);
 const head=new E('head'),body=new E('body'),footer=new E('footer'),bottom=new E('div');body.appendChild(footer);footer.appendChild(bottom);
 if(/data-site-init="1"/.test(sourceHtml))body.dataset.siteInit='1';
 const html=new E('html');html.lang=locale;html.getAttribute=k=>k==='lang'?locale:null;
 const all=()=>{const values=[];function walk(e){values.push(e);e.children.forEach(walk);}walk(head);walk(body);return values;};
 const requests=[],preparations=[],dataLayer=[],timers=[];let clockNow=10000;class ClockDate extends Date{static now(){return clockNow;}};let form,button,fields,tel,mail,cta;
 const doc={head,body,documentElement:html,readyState:'complete',createElement:tag=>new E(tag),
   getElementById:id=>all().find(e=>e.id===id)||null,
   querySelector:selector=>selector==='footer .footer-bottom'?bottom:selector==='footer'?footer:selector.startsWith('script[src^=')?head.children.find(e=>e.src&&e.src.startsWith('https://www.googletagmanager.com/gtag/js'))||null:null,
   querySelectorAll:selector=>withForm&&selector==='.c-form,.contact-form'?[form]:withForm&&selector==='a[href^="tel:"],a[href^="mailto:"]'?[tel,mail]:withForm&&selector==='a[href]'?[cta]:[],
   addEventListener:()=>{}};
 Object.defineProperty(doc,'cookie',{get:()=>[...jar.entries()].map(([k,v])=>k+'='+v).join('; '),set:value=>{const [pair,...attrs]=value.split(';');const pos=pair.indexOf('=');const k=pair.slice(0,pos),v=pair.slice(pos+1);if(attrs.some(x=>x.trim()==='Max-Age=0'))jar.delete(k);else jar.set(k,v);}});
 const storage=new Map();const win={location:{pathname:locale==='en'?'/en/kontakt.html':'/kontakt.html',search:debug?'?analytics_debug=1':'',protocol:'https:',hostname:'www.liberpro.pl'},
   dataLayer,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
   addEventListener:()=>{},matchMedia:()=>({matches:false}),navigator:{clipboard:{writeText:async()=>{}}}};
 doc.defaultView=win;
 if(legacy){win.gtag=function(){dataLayer.push(arguments);};const tag=new E('script');tag.src='https://www.googletagmanager.com/gtag/js?id=G-R1RMTN4KXT';head.appendChild(tag);const obsolete=new E('div');obsolete.id='ckBanner';body.appendChild(obsolete);}
 if(withForm){
   form=new E('form');button=new E('button');fields={};
   for(const [name,value] of Object.entries({name:'Fixture contact',email:'fixture@example.test',message:'A valid fixture enquiry with https://example.test/',honeypot:''})){const f=new E(name==='message'?'textarea':'input');f.value=value;f.name=name;fields[name]=f;form.appendChild(f);}
   form.querySelector=selector=>selector==='.btn-submit'?button:selector==='input[type="email"]'?fields.email:selector==='textarea'?fields.message:/^\[name=/.test(selector)?fields[selector.match(/^\[name=["']?([^"'\]]+)/)[1]]||null:null;
   form.querySelectorAll=selector=>selector==='input[type="text"]'?[fields.name,fields.honeypot]:selector==='input,textarea,select'?Object.values(fields):[];
   form.appendChild(button);body.appendChild(form);
   tel=new E('a');tel.attrs.href='tel:+48517765128';mail=new E('a');mail.attrs.href='mailto:kontakt@liberpro.pl';cta=new E('a');cta.attrs.href='kontakt.html';cta.textContent='Kontakt';
 }
 if(withForm){if(/data-ga-tracked="1"/.test(sourceHtml)){tel.dataset.gaTracked='1';mail.dataset.gaTracked='1';}if(/data-ga-cta-tracked="1"/.test(sourceHtml))cta.dataset.gaCtaTracked='1';}
 const context=vm.createContext({window:win,document:doc,navigator:win.navigator,URLSearchParams,Date:ClockDate,Intl,Number,Array,Object,String,RegExp,console,
   setTimeout:(fn,ms)=>{timers.push(fn);return 1;},clearTimeout:()=>{},requestAnimationFrame:fn=>fn(0),
   fetch:async(url,options)=>{if(url==='/contact.php?action=prepare'){preparations.push({url,options});return {ok:prepareOk,json:async()=>({success:prepareOk,token:'a'.repeat(48),question:'3 + 4',minWait:2,expiresIn:3600})};}requests.push({url,payload:JSON.parse(options.body)});return {ok:httpOk,json:async()=>({...response})};}});
 vm.runInContext(withForm?site:manager,context);
 return {win,doc,jar,head,requests,preparations,dataLayer,form,button,fields,tel,mail,cta,timers,ready:async()=>{await new Promise(r=>setImmediate(r));clockNow+=3000;const a=doc.getElementById('lp-contact-check-0');if(a)a.value='7';},advance:ms=>clockNow+=ms,events:()=>dataLayer.filter(x=>x[0]==='event').map(x=>({name:x[1],params:x[2]}))};
}

const results=[];
function check(name,fn){fn();results.push(name);}
for(const name of ['blog.html','en/blog.html']){
 const sourceHtml=fs.readFileSync(path.join(SITE,name),'utf8');
 check('Blog initialization is not serialized: '+name,()=>assert.ok(!/data-site-init=|data-ga-tracked=|data-ga-cta-tracked=/.test(sourceHtml)));
 check('Real contact handlers attach once: '+name,()=>{const f=fixture({withForm:true,consent:'accepted',sourceHtml});f.cta.events.click();f.tel.events.click();f.mail.events.click();assert.deepEqual(f.events().map(x=>x.name),['contact_cta_click','contact_phone_click','contact_email_click']);assert.equal(f.requests.length,0);});
 check('Consent refusal prevents all contact events: '+name,()=>{const f=fixture({withForm:true,consent:'rejected',sourceHtml});f.cta.events.click();f.tel.events.click();f.mail.events.click();assert.equal(f.events().length,0);});
}
for(const prefix of ['', 'en/']){
 for(const name of ['ksiegowosc.html','kadry.html'])check('Correct related services: '+prefix+name,()=>{const text=fs.readFileSync(path.join(SITE,prefix+name),'utf8');const cards=[...text.matchAll(/<a[^>]+class="other-card"[^>]*>[\s\S]*?<\/a>/g)].map(x=>x[0]);assert.equal(cards.length,3);assert.ok(!cards.join('').match(/Analizy finansowe|Financial analyses|Projekty UE|EU projects/));assert.ok(cards.some(x=>x.includes('href="zakladanie-dzialalnosci.html"')));assert.ok(cards.some(x=>x.includes('href="zakladanie-spolki.html"')));});
 for(const [name,target] of [[prefix?'blog-contribution-holiday-2026-rws.html':'blog-wakacje-skladkowe-2026-rws.html','kadry.html'],['blog-ulga-na-start-zus.html','zakladanie-dzialalnosci.html'],['blog-kpir-pelna-ksiegowosc-obowiazek.html','zakladanie-spolki.html']])check('Contextual service link: '+prefix+name,()=>{const text=fs.readFileSync(path.join(SITE,prefix+name),'utf8');const main=text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];assert.ok(main.includes('href="'+target+'"'));});
}
check('PIT publication, metadata, sources and blog entry',()=>{const post=fs.readFileSync(path.join(SITE,'blog-progi-pit-2027-sejm.html'),'utf8');const blog=fs.readFileSync(path.join(SITE,'blog.html'),'utf8');assert.ok(post.includes('nowe zasady jeszcze nie obowiązują'));assert.ok(post.includes('https://api.sejm.gov.pl/sejm/term10/processes/3147'));assert.equal((post.match(/<table class="article-table"/g)||[]).length,2);assert.ok(blog.includes('href="blog-progi-pit-2027-sejm.html"'));assert.ok(fs.readFileSync(path.join(SITE,'sitemap.xml'),'utf8').includes('https://www.liberpro.pl/blog-progi-pit-2027-sejm.html'));});
fs.writeFileSync(path.join(base,'recent-regressions.json'),JSON.stringify({checksPassed:results.length,checks:results,externalEmailsSent:0,externalAnalyticsRequests:0},null,2));console.log(JSON.stringify({checksPassed:results.length}));

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
function fixture({consent,debug=false,legacy=false,locale='pl',withForm=false,response={success:true},httpOk=true,prepareOk=true,pendingPrepare=false,pendingPost=false,pendingJSON=false}={}){
 const jar=new Map([['auth_session','fixture-only']]);if(consent)jar.set('cookie_consent',consent);
 const head=new E('head'),body=new E('body'),footer=new E('footer'),bottom=new E('div');body.appendChild(footer);footer.appendChild(bottom);
 const html=new E('html');html.lang=locale;html.getAttribute=k=>k==='lang'?locale:null;
 const all=()=>{const values=[];function walk(e){values.push(e);e.children.forEach(walk);}walk(head);walk(body);return values;};
 const requests=[],preparations=[],dataLayer=[],timers=[];let clockNow=10000,finishPost;class ClockDate extends Date{static now(){return clockNow;}};let form,button,fields,tel,mail,cta;
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
 const context=vm.createContext({window:win,document:doc,navigator:win.navigator,URLSearchParams,AbortController,Date:ClockDate,Intl,Number,Array,Object,String,RegExp,console,
   setTimeout:(fn,ms)=>{fn.delay=ms;timers.push(fn);return fn;},clearTimeout:fn=>{const i=timers.indexOf(fn);if(i>=0)timers.splice(i,1);},requestAnimationFrame:fn=>fn(0),
   fetch:async(url,options)=>{if(url==='/contact.php?action=prepare'){preparations.push({url,options});if(pendingPrepare)return new Promise(()=>{});return {ok:prepareOk,json:async()=>({success:prepareOk,token:'a'.repeat(48),question:'3 + 4',minWait:2,expiresIn:3600})};}requests.push({url,payload:JSON.parse(options.body),signal:options.signal});const result={ok:httpOk,json:()=>pendingJSON?new Promise(()=>{}):Promise.resolve({...response})};if(pendingPost)return new Promise(resolve=>{finishPost=()=>resolve(result);});return result;}});
 vm.runInContext(withForm?site:manager,context);
 return {win,doc,jar,head,requests,preparations,dataLayer,form,button,fields,tel,mail,cta,timers,finishPost:()=>finishPost(),ready:async()=>{await new Promise(r=>setImmediate(r));clockNow+=3000;const a=doc.getElementById('lp-contact-check-0');if(a)a.value='7';},advance:ms=>clockNow+=ms,events:()=>dataLayer.filter(x=>x[0]==='event').map(x=>({name:x[1],params:x[2]}))};
}
function test(name,fn){try{fn();passed++;}catch(e){e.message=name+': '+e.message;throw e;}}
async function asyncTest(name,fn){try{await fn();passed++;}catch(e){e.message=name+': '+e.message;throw e;}}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('Consent initially denied: no Google script',()=>{const f=fixture();assert.equal(f.head.children.filter(x=>x.src).length,0);f.win.trackAnalyticsEvent('generate_lead',{method:'contact_form'});assert.equal(f.events().length,0);assert.equal(f.doc.getElementById('lpCookieBanner').hidden,false);});
test('Rejected consent persists and settings remain available',()=>{const f=fixture({consent:'rejected'});assert.equal(f.doc.getElementById('lpCookieBanner').hidden,true);assert.ok(f.doc.getElementById('lpCookieSettings'));f.doc.getElementById('lpCookieSettings').events.click();assert.equal(f.doc.getElementById('lpCookieBanner').hidden,false);});
test('Accept analytics loads the Google tag once',()=>{const f=fixture();f.doc.getElementById('lpCookieAccept').events.click();assert.equal(f.jar.get('cookie_consent'),'accepted');assert.equal(f.head.children.filter(x=>x.src).length,1);f.doc.getElementById('lpCookieAccept').events.click();assert.equal(f.head.children.filter(x=>x.src).length,1);});
test('Withdrawing consent stops events and removes only analytics cookies',()=>{const f=fixture({consent:'accepted'});f.jar.set('_ga','fixture-id');f.jar.set('_ga_R1RMTN4KXT','fixture-id');f.doc.getElementById('lpCookieReject').events.click();assert.equal(f.win['ga-disable-G-R1RMTN4KXT'],true);f.win.trackAnalyticsEvent('generate_lead',{});assert.equal(f.events().length,0);assert.equal(f.jar.has('_ga'),false);assert.equal(f.jar.get('auth_session'),'fixture-only');});
test('Accepting again re-enables events without duplicate script',()=>{const f=fixture({consent:'accepted'});f.doc.getElementById('lpCookieReject').events.click();f.doc.getElementById('lpCookieAccept').events.click();f.win.trackAnalyticsEvent('contact_phone_click',{contact_type:'phone'});assert.equal(f.events().length,1);assert.equal(f.head.children.filter(x=>x.src).length,1);});
test('PII parameter names and email-like values are excluded',()=>{const f=fixture({consent:'accepted'});f.win.trackAnalyticsEvent('generate_lead',{email:'fixture@example.test',phone:'123456789',message:'fixture message',name:'Fixture',method:'contact_form',service_selected:'fixture@example.test',link_text:'fixture@example.test'});assert.deepEqual(Object.keys(f.events()[0].params),['method']);assert.ok(!JSON.stringify(f.events()).includes('fixture@example.test'));});
test('Debug events have a stable test marker',()=>{const f=fixture({consent:'accepted',debug:true});f.win.trackAnalyticsEvent('contact_form_start',{form_name:'contact_form'});assert.equal(f.events()[0].params.debug_mode,true);assert.equal(f.events()[0].params.measurement_test,'liberpro_audit_20261025');});
test('Legacy cached cookie script: no duplicate page view or old banner',()=>{const f=fixture({consent:'accepted',legacy:true});assert.equal(f.doc.getElementById('ckBanner'),null);assert.equal(f.head.children.filter(x=>x.src).length,1);const cfg=f.dataLayer.find(x=>x[0]==='config');assert.equal(cfg[2].send_page_view,false);});
test('Manager is guarded against a second initialization',()=>{const f=fixture({consent:'accepted'});const count=f.head.children.length;const context=vm.createContext({window:f.win,document:f.doc});vm.runInContext(manager,context);assert.equal(f.head.children.length,count);});
(async()=>{
 await asyncTest('Successful form sends exactly one lead, without field contents',async()=>{const f=fixture({consent:'accepted',debug:true,withForm:true});await f.ready();f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,'/contact.php');assert.equal(f.requests[0].payload.honeypot,'');assert.equal(f.events().filter(e=>e.name==='generate_lead').length,1);assert.ok(!JSON.stringify(f.events()).includes('fixture@example.test'));assert.ok(!JSON.stringify(f.events()).includes('valid fixture enquiry'));assert.ok(f.button.textContent.includes('wysłana'));});
 await asyncTest('Rejected analytics does not block the contact form',async()=>{const f=fixture({consent:'rejected',withForm:true});await f.ready();f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests.length,1);assert.equal(f.events().length,0);});
 await asyncTest('Server validation failure is not a lead',async()=>{const f=fixture({consent:'accepted',withForm:true,response:{success:false,message:'validation failed'}});await f.ready();f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.events().filter(e=>e.name==='generate_lead').length,0);assert.equal(f.events().filter(e=>e.name==='contact_form_error').length,1);});
 await asyncTest('HTTP error cannot count as success even with success JSON',async()=>{const f=fixture({consent:'accepted',withForm:true,httpOk:false});await f.ready();f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.events().filter(e=>e.name==='generate_lead').length,0);});
 await asyncTest('Honeypot reaches the server but never counts as a lead',async()=>{const f=fixture({consent:'accepted',withForm:true});await f.ready();f.fields.honeypot.value='bot fixture';f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests[0].payload.honeypot,'bot fixture');assert.equal(f.events().filter(e=>e.name==='generate_lead').length,0);});
 await asyncTest('Short message is rejected before sending',async()=>{const f=fixture({consent:'accepted',withForm:true});await f.ready();f.fields.message.value='short';f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests.length,0);});
 await asyncTest('Double submit cannot create two requests',async()=>{const f=fixture({consent:'accepted',withForm:true});await f.ready();f.form.events.submit({preventDefault(){}});f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests.length,1);});
 await asyncTest('Success remains visible after the submit button resets',async()=>{const f=fixture({consent:'accepted',withForm:true});await f.ready();f.form.events.submit({preventDefault(){}});await flush();f.timers[0]();assert.ok(f.form.children.find(x=>x.className==='contact-form-status').textContent.includes('wysłana'));assert.ok(f.button.textContent.includes('Wyślij wiadomość'));assert.equal(f.requests.length,1);});
 await asyncTest('English error response is readable in English',async()=>{const f=fixture({consent:'accepted',withForm:true,locale:'en',response:{success:false,message:'Błąd'}});await f.ready();f.form.events.submit({preventDefault(){}});await flush();assert.ok(f.button.textContent.includes('We could not send'));});
 test('Phone and email have distinct event names',()=>{const f=fixture({consent:'accepted',withForm:true});f.tel.events.click();f.mail.events.click();assert.deepEqual(f.events().map(e=>e.name),['contact_phone_click','contact_email_click']);assert.ok(!JSON.stringify(f.events()).includes('517765128'));});
 for(const name of ['site.js','cookies.js'])test('JavaScript syntax: '+name,()=>new vm.Script(fs.readFileSync(name==='site.js'?path.join(SITE,'site.js'):path.join(SITE,'cookies.js'),'utf8')));

 await asyncTest('Missing human answer never sends the contact request',async()=>{const f=fixture({consent:'rejected',withForm:true});await f.ready();f.doc.getElementById('lp-contact-check-0').value='';f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests.length,0);assert.ok(f.button.textContent.includes('wynik dodawania'));});
 await asyncTest('Unavailable verification fails closed with a refresh control',async()=>{const f=fixture({consent:'accepted',withForm:true,prepareOk:false});await f.ready();f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests.length,0);assert.equal(f.events().filter(e=>e.name==='generate_lead').length,0);});
 await asyncTest('Prepared token and typed answer accompany the valid payload',async()=>{const f=fixture({consent:'rejected',withForm:true});await f.ready();f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests[0].payload.verification_token,'a'.repeat(48));assert.equal(f.requests[0].payload.verification_answer,'7');assert.equal(f.preparations[0].options.credentials,'same-origin');assert.equal(f.preparations[0].options.cache,'no-store');});
 await asyncTest('An expired proof is refreshed without sending the message',async()=>{const f=fixture({withForm:true});await f.ready();f.advance(3601000);f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.requests.length,0);assert.ok(f.preparations.length>=2);});
 await asyncTest('English verification has an accessible label',async()=>{const f=fixture({withForm:true,locale:'en'});await f.ready();const a=f.doc.getElementById('lp-contact-check-0');assert.ok(a.required);assert.ok(a.attrs['aria-describedby']);const box=a.parentElement;assert.ok(box.children[0].textContent.includes('Verification: what is 3 + 4?'));assert.equal(box.children[0].htmlFor,a.id);});
 await asyncTest('Proof refreshes after a server rejection and preserves the enquiry',async()=>{const f=fixture({withForm:true,response:{success:false,message:'Verification failed'}});await f.ready();const text=f.fields.message.value;f.form.events.submit({preventDefault(){}});await flush();assert.ok(f.preparations.length>=2);assert.equal(f.fields.message.value,text);assert.equal(f.button.disabled,false);});
 for(const locale of ['pl','en'])await asyncTest('Pending POST times out, preserves text and ignores late success '+locale,async()=>{
   const f=fixture({withForm:true,consent:'accepted',pendingPost:true,locale});await f.ready();const text=f.fields.message.value;
   f.form.events.submit({preventDefault(){}});await flush();assert.equal(f.button.disabled,true);
   const timeout=f.timers.find(fn=>fn.delay===15000);assert.ok(timeout);timeout();await flush();
   assert.equal(f.button.disabled,false);assert.equal(f.fields.message.value,text);assert.equal(f.requests.length,1);assert.equal(f.requests[0].signal.aborted,true);
   assert.match(f.button.textContent,locale==='pl'?/Wiadomość mogła dotrzeć/:/may have arrived/);
   f.finishPost();await flush();assert.equal(f.events().filter(e=>e.name==='generate_lead').length,0);assert.equal(f.requests.length,1);
   assert.equal(f.events().filter(e=>e.name==='contact_form_error'&&e.params.error_type==='timeout').length,1);
 });
 await asyncTest('Pending verification times out and enables manual refresh',async()=>{
   const f=fixture({withForm:true,pendingPrepare:true});await f.ready();const a=f.doc.getElementById('lp-contact-check-0');const refresh=a.parentElement.children[3];
   assert.equal(refresh.disabled,true);f.timers.find(fn=>fn.delay===15000)();await flush();assert.equal(refresh.disabled,false);assert.equal(a.disabled,true);
   refresh.events.click();await flush();assert.equal(f.preparations.length,2);assert.equal(f.requests.length,0);
 });
 await asyncTest('Pending response JSON is included in the request deadline',async()=>{
   const f=fixture({withForm:true,pendingJSON:true});await f.ready();const text=f.fields.message.value;
   f.form.events.submit({preventDefault(){}});await flush();f.timers.find(fn=>fn.delay===15000)();await flush();
   assert.equal(f.button.disabled,false);assert.equal(f.fields.message.value,text);assert.equal(f.requests[0].signal.aborted,true);
 });
 await asyncTest('Completed requests cancel their timeout',async()=>{
   const f=fixture({withForm:true});await f.ready();f.form.events.submit({preventDefault(){}});await flush();
   assert.equal(f.timers.filter(fn=>fn.delay===15000).length,0);
 });
 fs.writeFileSync(path.join(base,'contact-measurement-tests.json'),JSON.stringify({checksPassed:passed,mode:'Offline fixtures; no email or analytics requests were sent.'},null,2));
 console.log(JSON.stringify({checksPassed:passed,externalMessagesSent:0,externalAnalyticsRequests:0},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

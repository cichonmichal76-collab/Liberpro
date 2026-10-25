(function () {
  'use strict';
  // The same guarded manager is also included in site.js for visitors with an older cached cookies.js.
  if (window.LiberProConsentVersion === '20261025') return;
  window.LiberProConsentVersion = '20261025';
  var gaId='G-R1RMTN4KXT',loaded=false,debug=false,settingsButton,banner,statusText;
  var en=(document.documentElement.lang||'').toLowerCase().indexOf('en')===0;
  function tr(pl,english){return en?english:pl;}
  function choice(){var parts=document.cookie.split(';');for(var i=0;i<parts.length;i++){var x=parts[i].trim();if(x.indexOf('cookie_consent=')===0)return x.substring(15);}return null;}
  function remember(value){var expires=new Date(Date.now()+365*864e5);document.cookie='cookie_consent='+value+';expires='+expires.toUTCString()+';path=/;SameSite=Lax'+(window.location.protocol==='https:'?';Secure':'');}
  try { var flag=new URLSearchParams(window.location.search).get('analytics_debug');if(flag==='1')window.sessionStorage.setItem('liberpro_analytics_debug','1');if(flag==='0')window.sessionStorage.removeItem('liberpro_analytics_debug');debug=window.sessionStorage.getItem('liberpro_analytics_debug')==='1'; } catch(e) {debug=/[?&]analytics_debug=1(?:&|$)/.test(window.location.search);}
  window.dataLayer=window.dataLayer||[];
  if(typeof window.gtag!=='function'){
    window.gtag=function(){window.dataLayer.push(arguments);};
    window.gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
  }
  function hasConsent(){return choice()==='accepted';}
  var allowed=['form_name','page_path','method','language','lead_source','error_type','contact_type','link_location','network','location'];
  window.hasAnalyticsConsent=hasConsent;
  window.trackAnalyticsEvent=function(name,params){
    if(!hasConsent() || window['ga-disable-'+gaId]===true)return;
    if(!/^[a-z][a-z0-9_]{0,39}$/.test(name))return;
    var safe={};params=params||{};
    allowed.forEach(function(key){var value=params[key];if(typeof value==='string' && value.length<=120 && !/[\r\n@]/.test(value))safe[key]=value;});
    if(debug){safe.debug_mode=true;safe.measurement_test='liberpro_audit_20261025';}
    window.gtag('event',name,safe);
  };
  function loadAnalytics(){
    window['ga-disable-'+gaId]=false;
    if(loaded)return;
    loaded=true;
    var existing=document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js"]');
    var config={};if(debug)config.debug_mode=true;
    if(existing)config.send_page_view=false;
    else {var script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+gaId;document.head.appendChild(script);window.gtag('js',new Date());}
    window.gtag('config',gaId,config);
  }
  function removeAnalyticsCookies(){
    var names=['_ga','_ga_R1RMTN4KXT'];
    names.forEach(function(name){['',';domain='+window.location.hostname,';domain=liberpro.pl',';domain=.liberpro.pl'].forEach(function(domain){document.cookie=name+'=;Max-Age=0;path=/'+domain+';SameSite=Lax;Secure';});});
  }
  function hide(){if(banner)banner.hidden=true;if(settingsButton)settingsButton.focus({preventScroll:true});}
  function apply(value){
    remember(value);
    window['ga-disable-'+gaId]=value!=='accepted';
    window.gtag('consent','update',{analytics_storage:value==='accepted'?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    if(value==='accepted')loadAnalytics();else removeAnalyticsCookies();
    hide();
  }
  function node(tag,text,className){var n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;}
  function render(){
    var obsolete=document.getElementById('ckBanner');if(obsolete)obsolete.remove();
    var style=node('style');style.textContent='.lp-cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:10000;background:#0a2540;color:#fff;padding:18px 24px;box-shadow:0 -4px 20px rgba(10,37,64,.22);display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap;font:14px/1.6 Archivo,sans-serif}.lp-cookie-banner[hidden]{display:none}.lp-cookie-copy{flex:1;min-width:230px}.lp-cookie-copy p{margin:0;color:#fff}.lp-cookie-copy a{color:#a7f3d0;text-decoration:underline}.lp-cookie-actions{display:flex;gap:9px;flex-wrap:wrap}.lp-cookie-actions button{min-height:44px;padding:10px 16px;border:1px solid #cbd5e1;border-radius:7px;background:transparent;color:#fff;font:600 13px Archivo,sans-serif;cursor:pointer}.lp-cookie-actions .lp-cookie-accept{background:#1a6b4a;border-color:#86efac}.lp-cookie-settings{border:0;background:transparent;color:inherit;text-decoration:underline;font:inherit;cursor:pointer;padding:8px;min-height:44px}.lp-cookie-status{margin-bottom:6px!important;font-weight:600}@media(max-width:600px){.lp-cookie-banner{padding:14px;gap:12px}.lp-cookie-copy{min-width:0}.lp-cookie-actions{width:100%}.lp-cookie-actions button{flex:1}}';document.head.appendChild(style);
    style.textContent+='.lp-cookie-settings{color:#0a2540}footer .lp-cookie-settings{color:#e2e8f0}';
    settingsButton=node('button',tr('Ustawienia cookies','Cookie settings'),'lp-cookie-settings');settingsButton.type='button';settingsButton.id='lpCookieSettings';settingsButton.addEventListener('click',openSettings);
    (document.querySelector('footer .footer-bottom')||document.querySelector('footer')||document.body).appendChild(settingsButton);
    banner=node('div',null,'lp-cookie-banner');banner.id='lpCookieBanner';banner.hidden=true;banner.setAttribute('role','region');banner.setAttribute('aria-label',tr('Ustawienia prywatności','Privacy settings'));
    var copy=node('div',null,'lp-cookie-copy');statusText=node('p',null,'lp-cookie-status');copy.appendChild(statusText);
    copy.appendChild(node('p',tr('Analityka Google działa wyłącznie po Twojej zgodzie. Możesz zmienić wybór w dowolnej chwili przyciskiem w stopce.','Google Analytics runs only with your consent. You can change your choice at any time using the footer button.')));
    var link=node('a',tr('Polityka prywatności','Privacy policy'));link.href=en?'/en/polityka-prywatnosci.html':'/polityka-prywatnosci.html';copy.appendChild(link);banner.appendChild(copy);
    var actions=node('div',null,'lp-cookie-actions');
    var reject=node('button',tr('Odrzuć analitykę','Reject analytics'));reject.type='button';reject.id='lpCookieReject';reject.addEventListener('click',function(){apply('rejected');});actions.appendChild(reject);
    var accept=node('button',tr('Akceptuję analitykę','Accept analytics'),'lp-cookie-accept');accept.type='button';accept.id='lpCookieAccept';accept.addEventListener('click',function(){apply('accepted');});actions.appendChild(accept);
    var close=node('button',tr('Zamknij bez zmiany','Close without changes'));close.type='button';close.id='lpCookieClose';close.addEventListener('click',hide);actions.appendChild(close);
    banner.appendChild(actions);document.body.appendChild(banner);
    if(!choice())openSettings(false);
  }
  function openSettings(focus){
    if(!banner)return;
    var value=choice();statusText.textContent=(value==='accepted'?tr('Analityka włączona','Analytics enabled'):tr('Analityka wyłączona','Analytics disabled'))+(debug?tr(' · test pomiaru',' · measurement test'):'');
    document.getElementById('lpCookieClose').hidden=!value;
    banner.hidden=false;if(focus!==false)document.getElementById('lpCookieReject').focus();
  }
  window.openCookieSettings=openSettings;
  if(hasConsent()) {window.gtag('consent','update',{analytics_storage:'granted'});loadAnalytics();}
  else {window['ga-disable-'+gaId]=true;window.gtag('consent','update',{analytics_storage:'denied'});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();

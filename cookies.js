(function(){
  'use strict';

  var gaId='G-R1RMTN4KXT';
  var gaLoaded=false;

  window.dataLayer=window.dataLayer || [];
  window.gtag=window.gtag || function(){window.dataLayer.push(arguments);};

  function setCookie(name,value,days){
    var expires=new Date();
    expires.setTime(expires.getTime()+days*864e5);
    document.cookie=name+'='+value+';expires='+expires.toUTCString()+';path=/;SameSite=Lax';
  }

  function getCookie(name){
    var cookies=document.cookie.split(';');
    for(var i=0;i<cookies.length;i++){
      var part=cookies[i].trim();
      if(part.indexOf(name+'=')===0)return part.substring(name.length+1);
    }
    return null;
  }

  function hasAnalyticsConsent(){
    return document.cookie.split(';').some(function(cookie){
      return cookie.trim()==='cookie_consent=accepted';
    });
  }

  function trackAnalyticsEvent(name,params){
    if(!hasAnalyticsConsent() || typeof window.gtag!=='function')return;
    window.gtag('event',name,params || {});
  }

  function loadAnalytics(){
    if(gaLoaded)return;
    gaLoaded=true;
    window['ga-disable-'+gaId]=false;

    var script=document.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+gaId;
    document.head.appendChild(script);

    if(typeof window.gtag==='function'){
      window.gtag('js',new Date());
      window.gtag('config',gaId);
    }
  }

  window.hasAnalyticsConsent=hasAnalyticsConsent;
  window.trackAnalyticsEvent=trackAnalyticsEvent;

  var consent=getCookie('cookie_consent');

  if(consent==='rejected'){
    window['ga-disable-'+gaId]=true;
  }

  if(consent==='accepted'){
    loadAnalytics();
    return;
  }

  if(consent)return;

  function renderBanner(){
    var style=document.createElement('style');
    style.textContent=
      '.ck-banner{position:fixed;bottom:0;left:0;right:0;background:#0a2540;color:rgba(255,255,255,.9);padding:16px 32px;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;box-shadow:0 -4px 20px rgba(10,37,64,.25);transform:translateY(100%);transition:transform .35s ease}'+
      '.ck-banner.show{transform:translateY(0)}'+
      '.ck-text{flex:1;min-width:240px;font-size:12px;line-height:1.6;font-family:sans-serif}'+
      '.ck-text strong{color:#fff;font-size:13px;display:block;margin-bottom:4px}'+
      '.ck-text a{color:#2e9e72;text-decoration:underline}'+
      '.ck-btns{display:flex;gap:8px;flex-shrink:0}'+
      '.ck-ok{background:#1a6b4a;color:#fff;border:none;padding:11px 22px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;font-family:sans-serif}'+
      '.ck-ok:hover{background:#2e9e72}'+
      '.ck-no{background:transparent;color:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.25);padding:10px 22px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;font-family:sans-serif}'+
      '.ck-no:hover{color:#fff;border-color:rgba(255,255,255,.5)}'+
      '@media(max-width:600px){.ck-banner{flex-direction:column;padding:16px}.ck-btns{width:100%;flex-direction:column}.ck-ok,.ck-no{width:100%;padding:14px;font-size:14px;text-align:center}}';
    document.head.appendChild(style);

    var banner=document.createElement('div');
    banner.className='ck-banner';
    banner.id='ckBanner';
    banner.innerHTML=
      '<div class="ck-text"><strong>Szanujemy Twoją prywatność.</strong>'+
      'Używamy plików cookies do analizy ruchu (Google Analytics). Możesz zaakceptować lub odrzucić cookies analityczne. '+
      '<a href="/polityka-prywatnosci.html">Polityka prywatności</a></div>'+
      '<div class="ck-btns">'+
      '<button class="ck-no" id="ckNo">Odrzuć analityczne</button>'+
      '<button class="ck-ok" id="ckOk">Akceptuję</button>'+
      '</div>';
    document.body.appendChild(banner);

    setTimeout(function(){banner.classList.add('show');},800);

    document.getElementById('ckOk').addEventListener('click',function(){
      setCookie('cookie_consent','accepted',365);
      loadAnalytics();
      banner.classList.remove('show');
    });

    document.getElementById('ckNo').addEventListener('click',function(){
      setCookie('cookie_consent','rejected',365);
      window['ga-disable-'+gaId]=true;
      banner.classList.remove('show');
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',renderBanner);
  } else {
    renderBanner();
  }
})();

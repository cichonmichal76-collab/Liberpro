(function(){
  /* Cookie banner - Liber Pro */
  var gaId='G-R1RMTN4KXT';
  var gaLoaded=false;

  function setCookie(n,v,d){var e=new Date();e.setTime(e.getTime()+d*864e5);document.cookie=n+'='+v+';expires='+e.toUTCString()+';path=/;SameSite=Lax'}
  function getCookie(n){var c=document.cookie.split(';');for(var i=0;i<c.length;i++){var p=c[i].trim();if(p.indexOf(n+'=')===0)return p.substring(n.length+1)}return null}
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

  var consent=getCookie('cookie_consent');

  /* Respect previous decision before any analytics request is made */
  if(consent==='rejected'){window['ga-disable-'+gaId]=true;}
  if(consent==='accepted'){loadAnalytics();return;}

  /* Don't show banner if already decided */
  if(consent)return;

  /* Inject CSS */
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

  /* Inject HTML */
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

  /* Show after 800ms */
  setTimeout(function(){banner.classList.add('show');},800);

  /* Buttons */
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
})();

function applySharedPageState(){
  var body=document.body;
  if(!body)return;

  var path=(window.location.pathname.split('/').pop()||'index.html').toLowerCase();
  var servicePages=['uslugi.html','ksiegowosc.html','kadry.html','zakladanie-dzialalnosci.html','zakladanie-spolki.html'];

  if(path==='o-nas.html')body.classList.add('about-page');
  if(path==='uslugi.html')body.classList.add('services-page');
  if(path==='kontakt.html')body.classList.add('contact-page');
  if(servicePages.indexOf(path)!==-1 && path!=='uslugi.html')body.classList.add('service-detail-page');
  if(path==='narzedzia.html')body.classList.add('tools-page');
  if(path==='blog.html')body.classList.add('blog-index-page');
}

function normalizeSiteNav(){
  var path=(window.location.pathname.split('/').pop()||'index.html').toLowerCase();
  var servicePages=['uslugi.html','ksiegowosc.html','kadry.html','zakladanie-dzialalnosci.html','zakladanie-spolki.html'];
  var topHref='';
  var subHref='';

  if(path==='o-nas.html'){
    topHref='o-nas.html';
  } else if(path==='narzedzia.html'){
    topHref='narzedzia.html';
  } else if(path==='blog.html' || path.indexOf('blog-')===0){
    topHref='blog.html';
  } else if(servicePages.indexOf(path)!==-1){
    topHref='uslugi.html';
    if(path!=='uslugi.html')subHref=path;
  }

  document.querySelectorAll('#nav a.active,.btn-cta.active,.mob-menu a.active').forEach(function(el){
    el.classList.remove('active');
  });

  if(topHref){
    var topLink=document.querySelector('#nav .nav-links > li > a[href="'+topHref+'"]');
    if(topLink)topLink.classList.add('active');
  }

  if(subHref){
    var subLink=document.querySelector('#nav .sub-menu-inner a[href="'+subHref+'"]');
    if(subLink)subLink.classList.add('active');
  }

  if(path==='kontakt.html'){
    var cta=document.querySelector('.btn-cta[href="kontakt.html"]');
    if(cta)cta.classList.add('active');
  }

  var mobileHref=path==='index.html' ? 'index.html' : (topHref || path);
  var mobileLink=document.querySelector('.mob-menu a[href="'+mobileHref+'"]');
  if(mobileLink)mobileLink.classList.add('active');
}

applySharedPageState();

/* Fix toggleSrv */
document.addEventListener('DOMContentLoaded',function(){
  normalizeSiteNav();
  window.toggleSrv=function(header){
    var item=header.closest?header.closest('.srv-item'):header.parentElement;
    if(!item)return;
    var isOpen=item.classList.contains('open');
    document.querySelectorAll('.srv-item.open').forEach(function(el){el.classList.remove('open');});
    if(!isOpen)item.classList.add('open');
  };
  document.querySelectorAll('.srv-header').forEach(function(h){
    h.style.cursor='pointer';
    h.style.webkitTapHighlightColor='transparent';
    if(!h.getAttribute('onclick')){
      h.addEventListener('click',function(){window.toggleSrv(h);});
    }
  });
});

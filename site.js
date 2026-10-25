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

(function(){
  'use strict';

  var SERVICE_PAGES=['uslugi.html','ksiegowosc.html','kadry.html','zakladanie-dzialalnosci.html','zakladanie-spolki.html'];
  var CALCULATOR_PAGES=['kalkulator-zus.html','kalkulator-kasa-fiskalna.html'];
  var ROOT_PATH='/';
  var EN_ROOT_PATH='/en/';
  var LOCALE=(function(){
    var htmlLang=(document.documentElement.getAttribute('lang')||'').toLowerCase();
    var pathname=(window.location.pathname||'').toLowerCase();
    if(htmlLang.indexOf('en')===0 || pathname.indexOf('/en/')===0 || pathname==='/en'){
      return 'en';
    }
    return 'pl';
  })();
  var STRINGS={
    pl:{
      languageLabel:'Wybierz język',
      menuOpen:'Otwórz menu',
      menuClose:'Zamknij menu',
      formRequired:'\u26a0 Uzupełnij wymagane pola',
      formInvalidEmail:'\u26a0 Nieprawidłowy e-mail',
      formSending:'Wysyłanie...',
      formSent:'\u2713 Wiadomość wysłana!',
      formSubmit:'Wyślij wiadomość \u2192',
      formError:'\u26a0 Błąd',
      formErrorCall:'\u26a0 Błąd. Zadzwoń: +48 517-765-128',
      formErrorGeneric:'Nie udało się wysłać formularza'
    },
    en:{
      languageLabel:'Choose language',
      menuOpen:'Open menu',
      menuClose:'Close menu',
      formRequired:'\u26a0 Fill in the required fields',
      formInvalidEmail:'\u26a0 Invalid email address',
      formSending:'Sending...',
      formSent:'\u2713 Message sent!',
      formSubmit:'Send message \u2192',
      formError:'\u26a0 Error',
      formErrorCall:'\u26a0 Error. Call: +48 517-765-128',
      formErrorGeneric:'We could not send the form'
    }
  }[LOCALE];

  function trackEvent(name, params){
    if(typeof window.trackAnalyticsEvent==='function'){
      window.trackAnalyticsEvent(name, params);
    }
  }

  // Bound both the request and JSON parsing; an abort must not trigger a retry.
  function contactJSON(url, options){
    return new Promise(function(resolve,reject){
      var controller=typeof AbortController==='function'?new AbortController():null;
      var finished=false;
      var timer=setTimeout(function(){
        if(finished)return;
        finished=true;
        var error=new Error('Contact request timed out');error.contactTimeout=true;
        reject(error);
        if(controller)controller.abort();
      },15000);
      function complete(fn,value){
        if(finished)return;
        finished=true;clearTimeout(timer);fn(value);
      }
      options=Object.assign({},options);
      if(controller)options.signal=controller.signal;
      Promise.resolve().then(function(){return fetch(url,options);}).then(function(response){
        return response.json().then(function(data){return {ok:response.ok,data:data};});
      }).then(function(value){complete(resolve,value);},function(error){complete(reject,error);});
    });
  }

  function getCurrentPath(){
    var pathname=(window.location.pathname||'/').replace(/\/+/g,'/');
    if(!pathname){
      return 'index.html';
    }
    pathname=pathname.replace(/\/+$/,'');

    if(pathname==='' || pathname==='/' || pathname==='/index.html' || pathname==='/en' || pathname==='/en/index.html'){
      return 'index.html';
    }

    if(pathname.indexOf('/en/')===0){
      pathname=pathname.slice(3);
    }

    pathname=pathname.replace(/^\/+/,'').replace(/\/+$/,'');
    return (pathname||'index.html').toLowerCase();
  }

  function getSiteRoot(targetLocale){
    return targetLocale==='en' ? EN_ROOT_PATH : ROOT_PATH;
  }

  function getSwitchHref(targetLocale){
    var page=getCurrentPath();
    var search=window.location.search||'';
    var hash=window.location.hash||'';
    var fallbackMeta=document.querySelector('meta[name="language-fallback-'+targetLocale+'"]');
    if(fallbackMeta && fallbackMeta.getAttribute('content')){
      return fallbackMeta.getAttribute('content')+search+hash;
    }
    if(page==='index.html'){
      return getSiteRoot(targetLocale)+search+hash;
    }
    return getSiteRoot(targetLocale)+page+search+hash;
  }

  function normalizeHrefValue(value){
    if(!value){
      return '';
    }
    return value.replace(/^[a-z]+:\/\/[^/]+/i,'').replace(/\/+$/,'');
  }

  function linkMatchesPath(link, candidates){
    var href=normalizeHrefValue(link.getAttribute('href')||'');
    if(!href){
      return false;
    }
    return candidates.some(function(candidate){
      var normalized=normalizeHrefValue(candidate);
      return href===normalized || href.slice(-normalized.length)===normalized;
    });
  }

  function activateFirstMatchingLink(selector, candidates){
    var found=false;
    document.querySelectorAll(selector).forEach(function(link){
      if(found){
        return;
      }
      if(linkMatchesPath(link, candidates)){
        link.classList.add('active');
        found=true;
      }
    });
  }

  function applySharedPageState(){
    var body=document.body;
    var path=getCurrentPath();
    if(!body){
      return;
    }

    body.dataset.locale=LOCALE;

    if(path==='o-nas.html')body.classList.add('about-page');
    if(path==='uslugi.html')body.classList.add('services-page');
    if(path==='kontakt.html')body.classList.add('contact-page');
    if(SERVICE_PAGES.indexOf(path)!==-1 && path!=='uslugi.html')body.classList.add('service-detail-page');
    if(path==='narzedzia.html')body.classList.add('tools-page');
    if(path==='blog.html')body.classList.add('blog-index-page');
    if(path.indexOf('blog-')===0)body.classList.add('blog-article-page');
    if(CALCULATOR_PAGES.indexOf(path)!==-1 || path==='kalkulatory.html' || path==='widget-kalkulator-vat.html'){
      body.classList.add('calculator-page');
    }
    if(path==='polityka-prywatnosci.html')body.classList.add('legal-page');
    if(path==='404.html')body.classList.add('error-page');
  }

  function normalizeSiteNav(){
    var path=getCurrentPath();
    var topHref='';
    var subHref='';
    var mobileCandidates=[];

    if(path==='o-nas.html'){
      topHref='o-nas.html';
    } else if(path==='narzedzia.html' || CALCULATOR_PAGES.indexOf(path)!==-1 || path==='kalkulatory.html' || path==='widget-kalkulator-vat.html'){
      topHref='narzedzia.html';
    } else if(path==='blog.html' || path.indexOf('blog-')===0){
      topHref='blog.html';
    } else if(SERVICE_PAGES.indexOf(path)!==-1){
      topHref='uslugi.html';
      if(path!=='uslugi.html'){
        subHref=path;
      }
    }

    document.querySelectorAll('#nav a.active:not(.lang-link),.btn-cta.active,.mob-menu a.active:not(.lang-link)').forEach(function(el){
      el.classList.remove('active');
    });

    if(topHref){
      activateFirstMatchingLink('#nav .nav-links > li > a',[topHref,ROOT_PATH+topHref,EN_ROOT_PATH+topHref]);
    }

    if(subHref){
      activateFirstMatchingLink('#nav .sub-menu-inner a',[subHref,ROOT_PATH+subHref,EN_ROOT_PATH+subHref]);
    }

    if(path==='kontakt.html'){
      activateFirstMatchingLink('.btn-cta',[path,ROOT_PATH+path,EN_ROOT_PATH+path]);
    }

    if(path==='index.html'){
      mobileCandidates=['/','/index.html','index.html','./',EN_ROOT_PATH,EN_ROOT_PATH+'index.html'];
    } else {
      mobileCandidates=[topHref || path,ROOT_PATH+(topHref || path),EN_ROOT_PATH+(topHref || path)];
    }
    activateFirstMatchingLink('.mob-menu a',mobileCandidates);
  }

  function updateScrolledNav(){
    var nav=document.getElementById('nav');
    if(!nav){
      return;
    }
    nav.classList.toggle('scrolled',window.scrollY>20);
  }

  function setMenuAriaLabels(){
    var hamburger=document.querySelector('.hamburger');
    var closeButton=document.querySelector('.mob-close');
    if(hamburger){
      hamburger.setAttribute('aria-label',STRINGS.menuOpen);
    }
    if(closeButton){
      closeButton.setAttribute('aria-label',STRINGS.menuClose);
    }
  }

  window.openMenu=function(){
    var menu=document.getElementById('mobMenu');
    var hamburger=document.querySelector('.hamburger');
    if(menu)menu.classList.add('open');
    if(hamburger)hamburger.setAttribute('aria-expanded','true');
  };

  window.closeMenu=function(){
    var menu=document.getElementById('mobMenu');
    var hamburger=document.querySelector('.hamburger');
    if(menu)menu.classList.remove('open');
    if(hamburger)hamburger.setAttribute('aria-expanded','false');
  };

  window.toggleSrv=function(header){
    var item=header && header.closest ? header.closest('.srv-item') : null;
    if(!item && header){
      item=header.parentElement;
    }
    if(!item){
      return;
    }

    var isOpen=item.classList.contains('open');
    document.querySelectorAll('.srv-item.open').forEach(function(el){
      el.classList.remove('open');
    });
    if(!isOpen){
      item.classList.add('open');
    }
  };

  function initServiceAccordions(){
    document.querySelectorAll('.srv-header').forEach(function(header){
      if(header.dataset.sharedInit==='1'){
        return;
      }
      header.dataset.sharedInit='1';
      header.style.cursor='pointer';
      header.style.webkitTapHighlightColor='transparent';
      if(!header.getAttribute('onclick')){
        header.addEventListener('click',function(){
          window.toggleSrv(header);
        });
      }
    });
  }

  function initQuickNav(){
    var sections=document.querySelectorAll('[id].srv-block,[id].srv-section,[id].section-pad');
    var quickLinks=document.querySelectorAll('.qn-link');
    if(!sections.length || !quickLinks.length){
      return;
    }

    function syncQuickNav(){
      var currentId='';
      sections.forEach(function(section){
        if(window.scrollY>=section.offsetTop-160){
          currentId=section.id;
        }
      });
      quickLinks.forEach(function(link){
        link.classList.toggle('active',link.getAttribute('href')==='#'+currentId);
      });
    }

    syncQuickNav();
    window.addEventListener('scroll',syncQuickNav,{passive:true});
  }

  function buildLanguageLink(localeCode){
    var targetLocale=localeCode.toLowerCase();
    var languageMeta={
      pl:{short:'PL',label:'Polski'},
      en:{short:'EN',label:'English'}
    };
    var meta=languageMeta[targetLocale] || {short:targetLocale.toUpperCase(),label:targetLocale.toUpperCase()};
    var link=document.createElement('a');
    link.className='lang-link'+(targetLocale===LOCALE ? ' active' : '');
    link.href=getSwitchHref(targetLocale);
    link.setAttribute('hreflang',targetLocale);
    link.setAttribute('lang',targetLocale);
    link.setAttribute('aria-label',meta.label);
    link.setAttribute('title',meta.label);
    if(targetLocale===LOCALE){
      link.setAttribute('aria-current','page');
    }
    link.textContent=meta.short;
    return link;
  }

  function buildLanguageSwitch(className){
    var wrapper=document.createElement('div');
    wrapper.className='lang-switch '+className;
    wrapper.setAttribute('aria-label',STRINGS.languageLabel);
    wrapper.appendChild(buildLanguageLink('pl'));
    wrapper.appendChild(buildLanguageLink('en'));
    return wrapper;
  }

  function initLanguageSwitch(){
    var navInner=document.querySelector('#nav .nav-i');
    var navCta=document.querySelector('#nav .btn-cta');
    var mobileMenu=document.getElementById('mobMenu');
    var mobileClose=mobileMenu ? mobileMenu.querySelector('.mob-close') : null;

    if(navInner && !navInner.querySelector('.lang-switch-desktop')){
      var desktopSwitch=buildLanguageSwitch('lang-switch-desktop');
      if(navCta){
        navInner.insertBefore(desktopSwitch,navCta);
      } else {
        navInner.appendChild(desktopSwitch);
      }
    }

    if(mobileMenu && !mobileMenu.querySelector('.lang-switch-mobile')){
      var mobileSwitch=buildLanguageSwitch('lang-switch-mobile');
      if(mobileClose && mobileClose.nextSibling){
        mobileMenu.insertBefore(mobileSwitch,mobileClose.nextSibling);
      } else if(mobileClose){
        mobileMenu.appendChild(mobileSwitch);
      } else {
        mobileMenu.insertBefore(mobileSwitch,mobileMenu.firstChild);
      }
    }

    if(!navInner && !document.querySelector('.lang-switch-floating') && document.body){
      document.body.appendChild(buildLanguageSwitch('lang-switch-floating'));
    }
  }

  function initContactForms(){
    document.querySelectorAll('.c-form,.contact-form').forEach(function(form,formIndex){
      if(form.dataset.sharedSubmit==='1'){
        return;
      }

      var button=form.querySelector('.btn-submit');
      if(!button){
        return;
      }
      var status=document.createElement('p');
      status.className='contact-form-status';
      status.setAttribute('role','status');
      status.setAttribute('aria-live','polite');
      form.appendChild(status);
      function setMessage(text){button.innerText=text;status.textContent=text;}

      form.dataset.sharedSubmit='1';
      form.addEventListener('focusin',function(){
        if(form.dataset.gaFormStarted==='1'){
          return;
        }
        form.dataset.gaFormStarted='1';
        trackEvent('contact_form_start',{
          form_name:'contact_form',
          page_path:window.location.pathname
        });
      });

      var verification=document.createElement('div');
      verification.className='f-group contact-verification';
      verification.style.marginTop='18px';
      var verificationLabel=document.createElement('label');
      var verificationAnswer=document.createElement('input');
      verificationAnswer.type='text';verificationAnswer.name='verification_answer';
      verificationAnswer.id='lp-contact-check-'+formIndex;
      verificationAnswer.inputMode='numeric';verificationAnswer.maxLength=2;
      verificationAnswer.autocomplete='off';verificationAnswer.required=true;
      verificationAnswer.setAttribute('aria-describedby',verificationAnswer.id+'-hint');
      verificationLabel.htmlFor=verificationAnswer.id;
      var verificationHint=document.createElement('p');
      verificationHint.id=verificationAnswer.id+'-hint';
      verificationHint.style.fontSize='13px';verificationHint.style.color='#475569';
      verificationHint.textContent=LOCALE==='pl'?'Krótka ochrona przed spamem. Wpisz wynik dodawania.':'A short spam check. Enter the sum.';
      var verificationRefresh=document.createElement('button');
      verificationRefresh.type='button';verificationRefresh.className='contact-verification-refresh';
      verificationRefresh.textContent=LOCALE==='pl'?'Odśwież pytanie':'Refresh question';
      verificationRefresh.style.cssText='display:block;margin-top:8px;padding:6px 0;background:none;border:0;color:#1a6b4a;text-decoration:underline;font:inherit;cursor:pointer;min-height:36px';
      verification.appendChild(verificationLabel);verification.appendChild(verificationAnswer);
      verification.appendChild(verificationHint);verification.appendChild(verificationRefresh);
      form.insertBefore(verification,button);
      var verificationToken='',verificationReadyAt=0,verificationExpiresAt=0,verificationLoading=false;
      function loadVerification(){
        if(verificationLoading)return;
        verificationLoading=true;verificationToken='';verificationAnswer.value='';verificationAnswer.disabled=true;verificationRefresh.disabled=true;
        verificationLabel.textContent=LOCALE==='pl'?'Ładuję weryfikację…':'Loading verification…';
        contactJSON('/contact.php?action=prepare',{method:'GET',credentials:'same-origin',cache:'no-store'}).then(function(response){
          if(!response.ok)throw new Error('verification');return response.data;
        }).then(function(data){
          if(!data || !data.success || !/^[a-f0-9]{48}$/.test(data.token) || !/^\d \+ \d$/.test(data.question))throw new Error('verification');
          verificationToken=data.token;
          verificationReadyAt=Date.now()+Math.max(2,Number(data.minWait)||2)*1000;
          verificationExpiresAt=Date.now()+Math.min(3600,Number(data.expiresIn)||3600)*1000;
          verificationLabel.textContent=(LOCALE==='pl'?'Weryfikacja: ile to ':'Verification: what is ')+data.question+'?';
          verificationAnswer.disabled=false;
        }).catch(function(){
          verificationLabel.textContent=LOCALE==='pl'?'Nie udało się załadować pytania. Wybierz „Odśwież pytanie” lub skontaktuj się telefonicznie.':'Could not load verification. Choose “Refresh question” or contact us by phone.';
        }).then(function(){verificationLoading=false;verificationRefresh.disabled=false;});
      }
      verificationRefresh.addEventListener('click',function(){if(!button.disabled)loadVerification();});
      loadVerification();

      function handleSubmit(event){
        var textInputs,nameEl,companyEl,emailEl,phoneEl,serviceEl,messageEl,payload;

        event.preventDefault();
        if(button.disabled)return;
        textInputs=form.querySelectorAll('input[type="text"]');
        nameEl=form.querySelector('[name="name"]') || textInputs[0];
        companyEl=form.querySelector('[name="company"]') || (textInputs.length>2 ? textInputs[1] : null);
        emailEl=form.querySelector('[name="email"]') || form.querySelector('input[type="email"]');
        phoneEl=form.querySelector('[name="phone"]') || form.querySelector('input[type="tel"]');
        serviceEl=form.querySelector('[name="service"]') || form.querySelector('select');
        messageEl=form.querySelector('[name="message"]') || form.querySelector('textarea');

        if(!nameEl || !nameEl.value.trim() || !emailEl || !emailEl.value.trim() || !messageEl || !messageEl.value.trim()){
          setMessage(STRINGS.formRequired);
          button.style.background='#b45309';
          trackEvent('contact_form_error',{error_type:'required_fields',page_path:window.location.pathname});
          return;
        }

        var messageLength=Array.from(messageEl.value.trim()).length;
        if(Array.from(nameEl.value.trim()).length<2 || messageLength<10 || messageLength>5000){
          setMessage(LOCALE==='pl'?'Podaj imię i nazwisko oraz wiadomość o długości od 10 do 5000 znaków.':'Enter your name and a message between 10 and 5000 characters.');
          trackEvent('contact_form_error',{error_type:'field_length',page_path:window.location.pathname});
          return;
        }

        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())){
          setMessage(STRINGS.formInvalidEmail);
          button.style.background='#b45309';
          trackEvent('contact_form_error',{error_type:'invalid_email',page_path:window.location.pathname});
          return;
        }

        if(!verificationToken || Date.now()>verificationExpiresAt){
          loadVerification();
          setMessage(LOCALE==='pl'?'Poczekaj na nowe pytanie weryfikacyjne i wpisz odpowiedź.':'Wait for a new verification question and enter the answer.');
          return;
        }
        if(!/^\d{1,2}$/.test(verificationAnswer.value.trim())){
          setMessage(LOCALE==='pl'?'Wpisz wynik dodawania w polu weryfikacji.':'Enter the sum in the verification field.');
          verificationAnswer.focus();return;
        }

        payload={
          name:nameEl.value.trim(),
          company:companyEl ? companyEl.value.trim() : '',
          email:emailEl.value.trim(),
          phone:phoneEl ? phoneEl.value.trim() : '',
          service:serviceEl ? serviceEl.value : '',
          message:messageEl.value.trim(),
          honeypot:(form.querySelector('[name="honeypot"]')||{}).value||'',
          verification_token:verificationToken,
          verification_answer:verificationAnswer.value.trim()
        };

        button.disabled=true;
        setMessage(STRINGS.formSending);
        button.style.background='#0044A7';

        var sendVerifiedMessage=function(){
        contactJSON('/contact.php',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        }).then(function(response){
          var data=response.data;if(!response.ok && data)data.success=false;return data;
        }).then(function(data){
          loadVerification();
          if(data && data.success){
            if(!payload.honeypot)trackEvent('generate_lead',{
              method:'contact_form',
              form_name:'contact_form',
              page_path:window.location.pathname,
              language:LOCALE,
              lead_source:'website'
            });
            setMessage(STRINGS.formSent);
            button.style.background='#1a9e5c';
            form.querySelectorAll('input,textarea,select').forEach(function(field){
              field.value='';
            });
            setTimeout(function(){
              button.innerText=STRINGS.formSubmit;
              button.style.background='';
              button.disabled=false;
            },5000);
            return;
          }

          setMessage(STRINGS.formError+' '+(LOCALE==='pl' ? ((data && data.message) || STRINGS.formErrorGeneric) : STRINGS.formErrorGeneric));
          button.style.background='#b45309';
          button.disabled=false;
          trackEvent('contact_form_error',{error_type:'server_error',page_path:window.location.pathname});
        }).catch(function(error){
          loadVerification();
          setMessage(error && error.contactTimeout
            ? (LOCALE==='pl'?'Nie otrzymano potwierdzenia wysyłki. Wiadomość mogła dotrzeć. Treść została zachowana — odczekaj chwilę lub skontaktuj się telefonicznie.':'No delivery confirmation received. Your message may have arrived. Your text has been kept — wait a moment or contact us by phone.')
            : STRINGS.formErrorCall);
          button.style.background='#b45309';
          button.disabled=false;
          trackEvent('contact_form_error',{error_type:error && error.contactTimeout?'timeout':'network_error',page_path:window.location.pathname});
        });
        };
        var verificationWait=Math.max(0,verificationReadyAt-Date.now());
        if(verificationWait>0)setTimeout(sendVerifiedMessage,verificationWait);else sendVerifiedMessage();
      }

      if(form.tagName.toLowerCase()==='form'){
        form.addEventListener('submit',handleSubmit);
      } else {
        button.addEventListener('click',handleSubmit);
      }
    });
  }

  function initContactClickTracking(){
    document.querySelectorAll('a[href^="tel:"],a[href^="mailto:"]').forEach(function(link){
      if(link.dataset.gaTracked==='1'){
        return;
      }

      link.dataset.gaTracked='1';
      link.addEventListener('click',function(){
        var href=link.getAttribute('href')||'';
        var eventName=href.indexOf('tel:')===0 ? 'contact_phone_click' : 'contact_email_click';
        var contactType=href.indexOf('tel:')===0 ? 'phone' : 'email';

        trackEvent(eventName,{
          contact_type:contactType,
          page_path:window.location.pathname
        });
      });
    });

    document.querySelectorAll('a[href]').forEach(function(link){
      if(link.dataset.gaCtaTracked==='1'){
        return;
      }

      var href=(link.getAttribute('href')||'').split('#')[0].split('?')[0];
      if(!/(^|\/)kontakt\.html$/i.test(href)){
        return;
      }

      link.dataset.gaCtaTracked='1';
      link.addEventListener('click',function(){
        trackEvent('contact_cta_click',{
          page_path:window.location.pathname,
          link_text:(link.textContent||'').trim().slice(0,100),
          link_location:link.closest('nav') ? 'navigation' : (link.closest('footer') ? 'footer' : 'content')
        });
      });
    });
  }

  function applyEmailLinks(){
    var user='kontakt';
    var domain='liberpro.pl';
    var email=user+'@'+domain;

    document.querySelectorAll('[data-email]').forEach(function(el){
      el.setAttribute('href','mailto:'+email);
      if(el.querySelector('.email-text')){
        el.querySelector('.email-text').textContent=email;
      } else if(!el.querySelector('svg')){
        el.textContent=email;
      }
    });
  }

  function initStatCounters(){
    var items=document.querySelectorAll('.stat-n[data-target]');
    if(!items.length){
      return;
    }

    function formatNumber(value){
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0');
    }

    function animateCounter(el){
      var target=parseInt(el.getAttribute('data-target'),10);
      var suffixNode=el.querySelector('span');
      var suffix=suffixNode ? suffixNode.outerHTML : '';
      var startTime=null;
      var duration=1500;

      function step(timestamp){
        var progress,eased,current;
        if(!startTime){
          startTime=timestamp;
        }
        progress=Math.min((timestamp-startTime)/duration,1);
        eased=1-Math.pow(1-progress,3);
        current=Math.floor(eased*target);
        el.innerHTML=formatNumber(current)+suffix;
        if(progress<1){
          requestAnimationFrame(step);
        } else {
          el.innerHTML=formatNumber(target)+suffix;
        }
      }

      requestAnimationFrame(step);
    }

    if('IntersectionObserver' in window){
      var observer=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },{threshold:0.2});
      items.forEach(function(el){
        observer.observe(el);
      });
      return;
    }

    items.forEach(animateCounter);
  }

  function initMobileCta(){
    var cta=document.querySelector('.mobile-cta-fixed');
    if(!cta){
      return;
    }

    function updateMobileCta(){
      var isMobile=window.matchMedia('(max-width: 768px)').matches;
      var threshold=Math.min(360,Math.round(window.innerHeight*0.45));
      cta.classList.toggle('is-visible',isMobile && window.scrollY>threshold);
    }

    updateMobileCta();
    window.addEventListener('scroll',updateMobileCta,{passive:true});
    window.addEventListener('resize',updateMobileCta);
  }

  function initFacebookLink(){
    var badgeGroup=document.querySelector('footer .footer-badges');
    if(!badgeGroup || document.querySelector('footer .f-social')){
      return;
    }

    var social=document.createElement('div');
    var link=document.createElement('a');
    link.className='f-soc';
    link.href='https://www.facebook.com/LiberProMonikaCichon';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.setAttribute('aria-label','Facebook — Liber Pro');
    link.setAttribute('title','Facebook — Liber Pro');
    link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.5 21v-8h2.75l.41-3H13.5V8.08c0-.87.24-1.46 1.5-1.46h1.77V3.94c-.31-.04-1.36-.13-2.58-.13-2.55 0-4.29 1.56-4.29 4.42V10H7v3h2.9v8h3.6z"></path></svg>';
    link.addEventListener('click',function(){
      trackEvent('social_click',{network:'facebook',location:'footer'});
    });
    social.className='f-social';
    social.appendChild(link);
    badgeGroup.insertAdjacentElement('afterend',social);
  }

  function initSharedUi(){
    if(document.body && document.body.dataset.siteInit==='1'){
      return;
    }
    if(document.body){
      document.body.dataset.siteInit='1';
    }

    applySharedPageState();
    initLanguageSwitch();
    setMenuAriaLabels();
    normalizeSiteNav();
    updateScrolledNav();
    initServiceAccordions();
    initQuickNav();
    initContactForms();
    applyEmailLinks();
    initContactClickTracking();
    initStatCounters();
    initMobileCta();
    initFacebookLink();
    window.addEventListener('scroll',updateScrolledNav,{passive:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initSharedUi);
  } else {
    initSharedUi();
  }
})();

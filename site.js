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
      languageLabel:'Wybierz jezyk',
      menuOpen:'Otworz menu',
      menuClose:'Zamknij menu',
      formRequired:'\u26a0 Uzupelnij wymagane pola',
      formInvalidEmail:'\u26a0 Nieprawidlowy e-mail',
      formSending:'Wysylanie...',
      formSent:'\u2713 Wiadomosc wyslana!',
      formSubmit:'Wyslij wiadomosc \u2192',
      formError:'\u26a0 Blad',
      formErrorCall:'\u26a0 Blad. zadzwon: +48 517-765-128',
      formErrorGeneric:'Nie udalo sie wyslac formularza'
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
    document.querySelectorAll('.c-form,.contact-form').forEach(function(form){
      if(form.dataset.sharedSubmit==='1'){
        return;
      }

      var button=form.querySelector('.btn-submit');
      if(!button){
        return;
      }

      form.dataset.sharedSubmit='1';
      button.addEventListener('click',function(event){
        var textInputs,nameEl,companyEl,emailEl,phoneEl,serviceEl,messageEl,payload;

        event.preventDefault();
        textInputs=form.querySelectorAll('input[type="text"]');
        nameEl=textInputs[0];
        companyEl=textInputs[1];
        emailEl=form.querySelector('input[type="email"]');
        phoneEl=form.querySelector('input[type="tel"]');
        serviceEl=form.querySelector('select');
        messageEl=form.querySelector('textarea');

        if(!nameEl || !nameEl.value.trim() || !emailEl || !emailEl.value.trim() || !messageEl || !messageEl.value.trim()){
          button.textContent=STRINGS.formRequired;
          button.style.background='#b45309';
          return;
        }

        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())){
          button.textContent=STRINGS.formInvalidEmail;
          button.style.background='#b45309';
          return;
        }

        payload={
          name:nameEl.value.trim(),
          company:companyEl ? companyEl.value.trim() : '',
          email:emailEl.value.trim(),
          phone:phoneEl ? phoneEl.value.trim() : '',
          service:serviceEl ? serviceEl.value : '',
          message:messageEl.value.trim()
        };

        button.disabled=true;
        button.textContent=STRINGS.formSending;
        button.style.background='#0044A7';

        fetch('/contact.php',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        }).then(function(response){
          return response.json();
        }).then(function(data){
          if(data && data.success){
            trackEvent('generate_lead',{
              method:'contact_form',
              form_name:'contact_form',
              page_path:window.location.pathname,
              service_selected:payload.service || 'not_selected'
            });
            button.textContent=STRINGS.formSent;
            button.style.background='#1a9e5c';
            form.querySelectorAll('input,textarea,select').forEach(function(field){
              field.value='';
            });
            setTimeout(function(){
              button.textContent=STRINGS.formSubmit;
              button.style.background='';
              button.disabled=false;
            },5000);
            return;
          }

          button.textContent=STRINGS.formError+' '+(LOCALE==='pl' ? ((data && data.message) || STRINGS.formErrorGeneric) : STRINGS.formErrorGeneric);
          button.style.background='#b45309';
          button.disabled=false;
        }).catch(function(){
          button.textContent=STRINGS.formErrorCall;
          button.style.background='#b45309';
          button.disabled=false;
        });
      });
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
    window.addEventListener('scroll',updateScrolledNav,{passive:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initSharedUi);
  } else {
    initSharedUi();
  }
})();

(function(){
  'use strict';

  var SERVICE_PAGES=['uslugi.html','ksiegowosc.html','kadry.html','zakladanie-dzialalnosci.html','zakladanie-spolki.html'];
  var CALCULATOR_PAGES=['kalkulator-zus.html','kalkulator-kasa-fiskalna.html'];

  function trackEvent(name, params){
    if(typeof window.trackAnalyticsEvent==='function'){
      window.trackAnalyticsEvent(name, params);
    }
  }

  function getCurrentPath(){
    return (window.location.pathname.split('/').pop()||'index.html').toLowerCase();
  }

  function applySharedPageState(){
    var body=document.body;
    var path=getCurrentPath();
    if(!body)return;

    if(path==='o-nas.html')body.classList.add('about-page');
    if(path==='uslugi.html')body.classList.add('services-page');
    if(path==='kontakt.html')body.classList.add('contact-page');
    if(SERVICE_PAGES.indexOf(path)!==-1 && path!=='uslugi.html')body.classList.add('service-detail-page');
    if(path==='narzedzia.html')body.classList.add('tools-page');
    if(path==='blog.html')body.classList.add('blog-index-page');
    if(path.indexOf('blog-')===0)body.classList.add('blog-article-page');
    if(CALCULATOR_PAGES.indexOf(path)!==-1)body.classList.add('calculator-page');
    if(path==='polityka-prywatnosci.html')body.classList.add('legal-page');
    if(path==='404.html')body.classList.add('error-page');
  }

  function normalizeSiteNav(){
    var path=getCurrentPath();
    var topHref='';
    var subHref='';

    if(path==='o-nas.html'){
      topHref='o-nas.html';
    } else if(path==='narzedzia.html' || CALCULATOR_PAGES.indexOf(path)!==-1){
      topHref='narzedzia.html';
    } else if(path==='blog.html' || path.indexOf('blog-')===0){
      topHref='blog.html';
    } else if(SERVICE_PAGES.indexOf(path)!==-1){
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

    var mobileHref=path==='index.html' ? '/' : (topHref || path);
    var mobileLink=document.querySelector('.mob-menu a[href="'+mobileHref+'"]');
    if(mobileLink)mobileLink.classList.add('active');
  }

  function updateScrolledNav(){
    var nav=document.getElementById('nav');
    if(!nav)return;
    nav.classList.toggle('scrolled',window.scrollY>20);
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
    if(!item && header)item=header.parentElement;
    if(!item)return;

    var isOpen=item.classList.contains('open');
    document.querySelectorAll('.srv-item.open').forEach(function(el){el.classList.remove('open');});
    if(!isOpen)item.classList.add('open');
  };

  function initServiceAccordions(){
    document.querySelectorAll('.srv-header').forEach(function(header){
      if(header.dataset.sharedInit==='1')return;
      header.dataset.sharedInit='1';
      header.style.cursor='pointer';
      header.style.webkitTapHighlightColor='transparent';
      if(!header.getAttribute('onclick')){
        header.addEventListener('click',function(){window.toggleSrv(header);});
      }
    });
  }

  function initQuickNav(){
    var sections=document.querySelectorAll('[id].srv-block,[id].srv-section,[id].section-pad');
    var quickLinks=document.querySelectorAll('.qn-link');
    if(!sections.length || !quickLinks.length)return;

    function syncQuickNav(){
      var currentId='';
      sections.forEach(function(section){
        if(window.scrollY>=section.offsetTop-160)currentId=section.id;
      });
      quickLinks.forEach(function(link){
        link.classList.toggle('active',link.getAttribute('href')==='#'+currentId);
      });
    }

    syncQuickNav();
    window.addEventListener('scroll',syncQuickNav,{passive:true});
  }

  function initContactForms(){
    document.querySelectorAll('.c-form,.contact-form').forEach(function(form){
      if(form.dataset.sharedSubmit==='1')return;

      var button=form.querySelector('.btn-submit');
      if(!button)return;

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
          button.textContent='⚠ Uzupełnij wymagane pola';
          button.style.background='#b45309';
          return;
        }

        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())){
          button.textContent='⚠ Nieprawidłowy e-mail';
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
        button.textContent='Wysyłanie…';
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
            button.textContent='✓ Wiadomość wysłana!';
            button.style.background='#1a9e5c';
            form.querySelectorAll('input,textarea,select').forEach(function(field){
              field.value='';
            });
            setTimeout(function(){
              button.textContent='Wyślij wiadomość →';
              button.style.background='';
              button.disabled=false;
            },5000);
            return;
          }

          button.textContent='⚠ '+((data && data.message) || 'Błąd');
          button.style.background='#b45309';
          button.disabled=false;
        }).catch(function(){
          button.textContent='⚠ Błąd. zadzwoń: +48 517-765-128';
          button.style.background='#b45309';
          button.disabled=false;
        });
      });
    });
  }

  function initContactClickTracking(){
    document.querySelectorAll('a[href^="tel:"],a[href^="mailto:"]').forEach(function(link){
      if(link.dataset.gaTracked==='1')return;

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
    if(!items.length)return;

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
        if(!startTime)startTime=timestamp;
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
      items.forEach(function(el){observer.observe(el);});
      return;
    }

    items.forEach(animateCounter);
  }

  function initSharedUi(){
    if(document.body && document.body.dataset.siteInit==='1')return;
    if(document.body)document.body.dataset.siteInit='1';

    applySharedPageState();
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

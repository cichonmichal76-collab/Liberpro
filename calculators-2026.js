(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LiberProCalculators2026 = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { api.mount(document); });
    else api.mount(document);
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var P = Object.freeze({year:2026,full:5652,preferential:1441.80,minWage:4806,
    healthJanuary:314.96,healthMinimum:432.54,healthLump:Object.freeze([498.35,830.58,1495.04]),
    annualPensionCap:282600,healthDeductionLimit:14100,vatLimit:240000,fiscalLimit:20000});
  // Keep money in integer cents. Percentages are decimal fractions, never binary products.
  function fraction(n) {
    var parts=String(n).toLowerCase().split('e'),digits=parts[0].split('.'),power=Number(parts[1]||0)-(digits[1]||'').length;
    return [BigInt(digits.join(''))*(power>0?10n**BigInt(power):1n),power<0?10n**BigInt(-power):1n];
  }
  function halfUp(n,d) { return (n+d/2n)/d; }
  function r2(n) { var f=fraction(Math.abs(n));return (n<0?-1:1)*Number(halfUp(f[0]*100n,f[1]))/100; }
  function minor(n) {
    if (typeof n!=='number' || !Number.isFinite(n) || n<0 || n>1e12) throw new Error('amount');
    var f=fraction(n);return halfUp(f[0]*100n,f[1]);
  }
  function major(n) { return Number(n)/100; }
  function amount(n) { return major(minor(n)); }
  function rate(n,max) { if (typeof n!=='number' || !Number.isFinite(n) || n<0 || n>max) throw new Error('rate');return n; }
  function percent(n,p) { var f=fraction(p);return halfUp(n*f[0],100n*f[1]); }
  function nonnegative(n) { return n>0n?n:0n; }
  function attempt(fn) { try { return fn(); } catch (e) { return {error:e.message}; } }
  function vat(input,percentage,mode) { return attempt(function () {
    var a=minor(input),p=fraction(rate(percentage,100)),n,v,b;
    if (mode==='netto') {n=a;v=halfUp(n*p[0],100n*p[1]);b=n+v;}
    else if (mode==='brutto') {b=a;n=halfUp(b*100n*p[1],100n*p[1]+p[0]);v=b-n;}
    else if (mode==='vat' && p[0]>0n) {v=a;n=halfUp(v*100n*p[1],p[0]);b=n+v;}
    else throw new Error('vat-mode');
    return {net:major(n),tax:major(v),gross:major(b)};
  }); }
  function date(text) {
    if (typeof text!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('date');
    var p=text.split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2]));
    if (p[0]!==2026 || d.getUTCFullYear()!==p[0] || d.getUTCMonth()!==p[1]-1 || d.getUTCDate()!==p[2]) throw new Error('date');
    return d.getTime();
  }
  function limit(start,sales,annual,asOf) { return attempt(function () {
    var a=date(start),v=minor(sales),days=(Date.UTC(2026,11,31)-a)/86400000+1;
    if (asOf!==undefined && date(asOf)<a) throw new Error('date-order');
    if (annual!==P.vatLimit && annual!==P.fiscalLimit) throw new Error('limit');
    var l=halfUp(minor(annual)*BigInt(days),365n);
    return {limit:major(l),sales:major(v),days:days,yearDays:365,remaining:major(l-v),usedPercent:major(halfUp(v*10000n,l))};
  }); }
  function employer(gross,accident,funds,fgsp,ppk,previous) { return attempt(function () {
    var g=minor(gross),a=rate(accident,3.33),q=rate(ppk,4),prior=minor(previous);
    if(q>0 && q<1.5) throw new Error('ppk-rate');
    var cap=nonnegative(minor(P.annualPensionCap)-prior),base=g<cap?g:cap;
    var pension=percent(base,9.76),disability=percent(base,6.5),workAccident=percent(g,a),
      fpfs=funds?percent(g,2.45):0n,guarantee=fgsp?percent(g,.1):0n,capital=percent(g,q),
      contributions=pension+disability+workAccident+fpfs+guarantee+capital;
    return {gross:major(g),pension:major(pension),disability:major(disability),accident:major(workAccident),fpfs:major(fpfs),fgsp:major(guarantee),ppk:major(capital),contributions:major(contributions),total:major(g+contributions)};
  }); }
  function pit(revenue,costs,social,lumpRate,paidLinear,paidLump) { return attempt(function () {
    var r=minor(revenue),c=minor(costs),s=minor(social),hl=minor(paidLinear),hr=minor(paidLump);
    rate(lumpRate,100);
    if([2,3,5.5,8.5,10,12,12.5,14,15,17].indexOf(lumpRate)<0) throw new Error('lump-rate');
    var income=nonnegative(r-c-s),cap=minor(P.healthDeductionLimit),
      scale=halfUp(income,100n),linear=halfUp(nonnegative(income-(hl<cap?hl:cap)),100n),
      lump=halfUp(nonnegative((r-s)*2n-hr),200n),
      scaleTax=scale<=120000n?nonnegative(scale*12n-360000n):1080000n+(scale-120000n)*32n;
    return {scaleBase:Number(scale),linearBase:Number(linear),lumpBase:Number(lump),
      scale:Number(halfUp(scaleTax,100n)),linear:Number(percent(linear,19)),lump:Number(percent(lump,lumpRate))};
  }); }
  function zus(mode,taxForm,income,month,sickness,smallBase,fundMode) { return attempt(function () {
    if(!Number.isInteger(month)||month<1||month>12) throw new Error('month');
    if(['pelny','pref','maly','tylko'].indexOf(mode)<0||['auto','on','off'].indexOf(fundMode)<0) throw new Error('mode');
    var base=mode==='pelny'?minor(P.full):mode==='pref'?minor(P.preferential):mode==='tylko'?0n:minor(smallBase);
    if(mode==='maly'&&(base<minor(P.preferential)||base>minor(P.full))) throw new Error('small-base');
    var minimum=minor(month===1?P.healthJanuary:P.healthMinimum),health;
    if(taxForm==='ogolna'||taxForm==='liniowy') {health=percent(minor(income),taxForm==='ogolna'?9:4.9);if(health<minimum)health=minimum;}
    else if(taxForm==='karta')health=minor(P.healthMinimum);
    else if(taxForm==='r60')health=minor(P.healthLump[0]);
    else if(taxForm==='r300')health=minor(P.healthLump[1]);
    else if(taxForm==='rpow')health=minor(P.healthLump[2]);
    else throw new Error('tax-form');
    var pension=percent(base,19.52),disability=percent(base,8),illness=sickness?percent(base,2.45):0n,accident=percent(base,1.67),
      fpfs=(mode!=='tylko'&&(fundMode==='on'||(fundMode==='auto'&&base>=minor(P.minWage))))?percent(base,2.45):0n,
      social=pension+disability+illness+accident;
    return {base:major(base),health:major(health),pension:major(pension),disability:major(disability),sickness:major(illness),accident:major(accident),fpfs:major(fpfs),social:major(social),total:major(social+fpfs+health)};
  }); }

  function mount(doc) {
    if (!doc.getElementById('zinc-dochod') || doc.documentElement.dataset.lpCalculators==='2026') return;
    doc.documentElement.dataset.lpCalculators='2026';
    var en=(doc.documentElement.lang||'').indexOf('en')===0,prefix=en?'x':'e',w=doc.defaultView,
      nf=new Intl.NumberFormat(en?'en-GB':'pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2});
    function tr(pl,eng) { return en?eng:pl; }
    function el(id) { return doc.getElementById(id); }
    function num(id) { var x=el(id);return !x || x.value.trim()===''?NaN:Number(x.value); }
    function checked(id) { return !!(el(id) && el(id).checked); }
    function money(n) { return nf.format(n)+' PLN'; }
    function put(id,text) { if (el(id)) el(id).textContent=text; }
    function output(id,result,htmlText) {
      var target=el(id);if (!target) return;
      target.setAttribute('role','status');target.setAttribute('aria-live','polite');
      target.classList.toggle('lp-calc-error',!!result.error);
      if (result.error) target.textContent=tr('Sprawdź dane: wymagane są poprawne, nieujemne kwoty i daty z 2026 r.','Check the inputs: use valid non-negative amounts and dates in 2026.');
      else target.innerHTML=htmlText;
    }
    function taxUi() {
      var x=pit(num(prefix+'-r'),num(prefix+'-c'),num(prefix+'-s'),num(prefix+'-rate')*100,num(prefix+'-hl'),num(prefix+'-hr'));
      output(prefix+'-tax',x,x.error?'':tr('Roczny PIT — skala','Annual PIT — tax scale')+': <b>'+money(x.scale)+'</b><br>'+tr('Liniowy','Flat-rate income tax')+': <b>'+money(x.linear)+'</b><br>'+tr('Ryczałt','Revenue lump-sum tax')+': <b>'+money(x.lump)+'</b>');
    }
    function vatLimitUi() {
      var x=limit(el(prefix+'-vs').value,num(prefix+'-v'),P.vatLimit,el(prefix+'-vd').value);
      output(prefix+'-vat',x,x.error?'':tr('Limit','Threshold')+': <b>'+money(x.limit)+'</b> · '+tr('Sprzedaż','Sales')+': <b>'+money(x.sales)+'</b><br>'+tr('Pozostało','Remaining')+': <b>'+money(x.remaining)+'</b> · '+tr('Wykorzystanie','Used')+': <b>'+nf.format(x.usedPercent)+'%</b>');
    }
    function employerUi() {
      var x=employer(num(prefix+'-g'),num(prefix+'-a'),checked(prefix+'-funds'),checked(prefix+'-fgsp'),num(prefix+'-ppk'),num(prefix+'-prior'));
      var parts=x.error?'':[[tr('Brutto','Gross pay'),x.gross],[tr('Emerytalna pracodawcy','Employer pension'),x.pension],
        [tr('Rentowa pracodawcy','Employer disability'),x.disability],[tr('Wypadkowa','Accident insurance'),x.accident],
        ['FP + FS',x.fpfs],['FGŚP',x.fgsp],[tr('PPK pracodawcy','Employer PPK'),x.ppk]].map(function(row){return row[0]+': '+money(row[1]);}).join('<br>');
      output(prefix+'-emp',x,x.error?'':parts+'<br><strong>'+tr('Całkowity koszt pracodawcy','Total employer cost')+': '+money(x.total)+'</strong>');
    }
    w.eTax=w.xTax=taxUi;w.eVat=w.xVat=vatLimitUi;w.eEmp=w.xEmp=employerUi;
    [prefix+'-tax',prefix+'-vat',prefix+'-emp','kf-res-val','zval-tot'].forEach(function(id){if(el(id)){el(id).setAttribute('aria-live','polite');el(id).setAttribute('role','status');}});
    // VAT modes use the same rounded monetary results as the other calculators.
    var vatMode='netto',vatRate=23;
    function updateVat() {
      var x=vat(num('kv2-inp'),vatRate,vatMode);
      put('kv2-rn',x.error?'—':money(x.net));put('kv2-rv',x.error?'—':money(x.tax));put('kv2-rb',x.error?'—':money(x.gross));
      if (el('kv2-error')) { put('kv2-error',x.error?tr('Podaj nieujemną kwotę. Przy stawce 0%/ZW wybierz netto albo brutto.','Enter a non-negative amount. For a zero rate/exemption select net or gross.'): '');el('kv2-error').hidden=!x.error; }
    }
    function updateSlider(value) { var x=Math.min(100000,Math.max(100,value));el('kv2-sl').style.setProperty('--pct',((x-100)/99900*100)+'%');put('kv2-sv',money(value)); }
    w.kv2OnInp=function(value){var x=Number(value);if(Number.isFinite(x)&&x>=0){el('kv2-sl').value=Math.min(100000,Math.max(100,x));updateSlider(x);}updateVat();};
    w.kv2OnSl=function(value){el('kv2-inp').value=value;updateSlider(Number(value));updateVat();};
    w.kv2Type=function(mode,button){vatMode=mode;doc.querySelectorAll('.kv-type button').forEach(function(b){b.classList.remove('kv-on');});button.classList.add('kv-on');updateVat();};
    w.kv2Rate=function(button){vatRate=Number(button.dataset.r)*100;doc.querySelectorAll('#kv2-rates button').forEach(function(b){b.classList.remove('kv-on');});button.classList.add('kv-on');put('kv2-rvs',vatRate===0?'0% / ZW':vatRate+'%');updateVat();};
    el('kv2-inp').value='1000';updateSlider(1000);updateVat();
    var lastFiscal='';
    function fiscalUi() {
      var x=limit(el('kf-date').value,0,P.fiscalLimit);
      put('kf-res-val',x.error?tr('Wybierz datę z 2026 r.','Select a date in 2026.'):money(x.limit));
      el('kf-card').className='kf-res-card'+(x.error?' empty':'');el('kf-badges').className='kf-badges'+(x.error?'':' show');
      el('kf-info-low').className='kf-info'+(!x.error&&x.days<60?' show':'');
      put('kf-days',x.error?'—':String(x.days));put('kf-yrdays','365');lastFiscal=x.error?'':money(x.limit);
    }
    el('kf-date').addEventListener('change',fiscalUi);el('kf-date').addEventListener('input',fiscalUi);
    w.kfCopy=function(){if(lastFiscal) w.navigator.clipboard.writeText(lastFiscal).then(function(){if(w.showToast)w.showToast(tr('Skopiowano','Copied'));}).catch(function(){if(w.showToast)w.showToast(tr('Nie udało się skopiować','Copy failed'));});};
    var socialLabels={pelny:tr('Pełny ZUS','Standard ZUS'),pref:tr('Preferencyjny ZUS','Preferential ZUS'),maly:'Mały ZUS+',tylko:tr('Tylko zdrowotna','Health insurance only')};
    function zusUi() {
      var mode=doc.querySelector('input[name="zrodzaj"]:checked').value,form=doc.querySelector('input[name="zforma"]:checked').value,
        monthly=form==='ogolna'||form==='liniowy',x=zus(mode,form,num('zinc-dochod'),num('zmonth'),checked('ztog-chorob'),num('zinc-dochod-rok'),el('zfunds').value);
      el('zsec-dochod').style.display=monthly?'':'none';el('zsec-dochod-rok').style.display=mode==='maly'?'':'none';
      el('zsec-chorob').style.display=mode==='tylko'?'none':'';el('zinfo-maly').style.display=mode==='maly'?'block':'none';
      el('zinfo-wakacje').className='zus-info'+(mode==='tylko'?' show':'');
      if (x.error) { ['zval-zdrow','zval-sp','zval-em','zval-re','zval-ch','zval-wy','zval-fp','zval-tot','zval-tot-c'].forEach(function(id){put(id,'—');});put('znote',tr('Sprawdź kwoty, miesiąc i podstawę Małego ZUS+.','Check amounts, month and the Mały ZUS+ assessment basis.'));el('zchart-bars').innerHTML='';return; }
      put('zlbl-zdrow',tr('Ubezpieczenie zdrowotne','Health insurance')+' · '+String(num('zmonth'))+'/2026');
      [['zval-zdrow',x.health],['zval-sp',x.social],['zval-em',x.pension],['zval-re',x.disability],['zval-ch',x.sickness],['zval-wy',x.accident],['zval-fp',x.fpfs],['zval-tot',x.total],['zval-tot-c',x.total]].forEach(function(row){put(row[0],money(row[1]));});
      el('zcard-sp').style.display=mode==='tylko'?'none':'';el('zcard-fp').style.display=x.fpfs>0?'':'none';
      put('znote',socialLabels[mode]+' · '+tr('Podstawa społecznych','Social contribution basis')+': '+money(x.base)+' · '+tr('Zaokrąglono każdą składkę do groszy.','Each contribution is rounded to cents.'));
      var bars=[[tr('Zdrowotna','Health'),x.health],[tr('Emerytalna','Pension'),x.pension],[tr('Rentowa','Disability'),x.disability],[tr('Chorobowa','Sickness'),x.sickness],[tr('Wypadkowa','Accident'),x.accident],['FP + FS',x.fpfs]];
      el('zchart-bars').innerHTML=bars.filter(function(row){return row[1]>0;}).map(function(row){return '<div class="zus-bar-row"><div class="zus-bar-top"><span>'+row[0]+'</span><span>'+money(row[1])+'</span></div><div class="zus-bar-track"><div class="zus-bar-fill" style="width:'+(row[1]/x.total*100).toFixed(2)+'%"></div></div></div>';}).join('');
    }
    doc.querySelectorAll('input[name="zrodzaj"],input[name="zforma"],#ztog-chorob,#zmonth,#zfunds').forEach(function(node){node.addEventListener('change',zusUi);});
    ['zinc-dochod','zinc-dochod-rok'].forEach(function(id){el(id).addEventListener('input',zusUi);});
    w.zSwitchTab=function(tab){el('ztab-t').className='zus-tab'+(tab==='t'?' on':'');el('ztab-w').className='zus-tab'+(tab==='w'?' on':'');el('zview-t').className='zus-tv'+(tab==='t'?'':' hide');el('zview-w').className='zus-chart-view'+(tab==='w'?' on':'');};
    w.zCopy=function(id){var value=el(id).textContent.trim();if(value==='—')return;w.navigator.clipboard.writeText(value).then(function(){if(w.showToast)w.showToast(tr('Skopiowano','Copied'));}).catch(function(){if(w.showToast)w.showToast(tr('Nie udało się skopiować','Copy failed'));});};
    taxUi();vatLimitUi();employerUi();fiscalUi();zusUi();
  }
  return Object.freeze({parameters:P,round2:r2,vat:vat,limit:limit,employer:employer,pit:pit,zus:zus,mount:mount});
});

const {test,expect}=require('@playwright/test');
const articles=['blog-ksiegowosc-jako-informacja-zarzadcza.html','blog-laczenie-danych-firmowych-z-ksiegowoscia.html','en/blog-accounting-as-management-information.html','en/blog-combining-business-data-with-accounting.html','blog-progi-pit-2027-sejm.html'];
const pages=['index.html','en/index.html','uslugi.html','en/uslugi.html','ksiegowosc.html','en/ksiegowosc.html','kadry.html','en/kadry.html','narzedzia.html','en/narzedzia.html','blog.html','en/blog.html','kontakt.html','en/kontakt.html',...articles];
test.beforeEach(async({page,context})=>{
  await context.addCookies([{name:'cookie_consent',value:'rejected',url:'http://127.0.0.1:8778/'}]);
  await page.route('**/*',route=>{
    const r=route.request();
    if(r.method()!=='GET'||!r.url().startsWith('http://127.0.0.1:8778/'))return route.abort();
    if(r.url().includes('/contact.php?action=prepare'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,guardVersion:2,token:'a'.repeat(48),question:'3 + 4',minWait:2,expiresIn:3600})});
    return route.continue();
  });
});
for(const width of [360,768,1440])for(const file of pages)test(`layout ${width} ${file}`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/'+file);await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await expect(page.locator('#nav .logo img')).toBeVisible();
});
for(const file of articles)test('mobile article navigation '+file,async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/'+file);
  const button=page.locator('.hamburger');await button.click();await expect(button).toHaveAttribute('aria-expanded','true');await expect(page.locator('#mobMenu')).toHaveClass(/open/);
  await page.locator('.mob-close').click();await expect(button).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('footer .footer-grid')).toHaveCount(1);
  const links=await page.locator('#nav .lang-link').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
  if(file===articles[0])expect(links).toContain('/en/'+articles[2].split('/').pop());
  if(file===articles[2])expect(links).toContain('/'+articles[0]);
});
for(const prefix of ['', 'en/']){
  test('VAT exact cents and visible mobile results '+prefix,async({page})=>{
    await page.setViewportSize({width:375,height:812});await page.goto('/'+prefix+'narzedzia.html');
    await page.locator('#kv2-inp').fill('86027.90');await page.locator('#kv2-rates button').filter({hasText:/^5%$/}).click();
    const tax=(await page.locator('#kv2-rv').innerText()).replace(/[^0-9]/g,'');expect(tax).toBe('430140');
    const gross=(await page.locator('#kv2-rb').innerText()).replace(/[^0-9]/g,'');expect(gross).toBe('9032930');
    await page.locator('#kv2-inp').fill('99999999.99');
    const geometry=await page.locator('.kv-res-grid .kv-card').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect(),p=c.closest('.kv-res-grid').getBoundingClientRect();return {left:r.left,right:r.right,parentLeft:p.left,parentRight:p.right}}));
    expect(geometry).toHaveLength(3);for(const r of geometry){expect(r.left).toBeGreaterThanOrEqual(r.parentLeft-1);expect(r.right).toBeLessThanOrEqual(r.parentRight+1);}
  });
  test('Employer rounding and service link '+prefix,async({page})=>{
    await page.goto('/'+prefix+'narzedzia.html');const p=prefix?'x':'e';
    await page.locator('#'+p+'-g').fill('13850');await page.locator('#'+p+'-a').fill('1.91');await page.locator('#'+p+'-ppk').fill('2');await page.locator('#'+p+'-prior').fill('157962.86');await page.locator('#'+p+'-fgsp').uncheck();
    await page.locator('#kalkulator-kosztu-pracownika button').click();expect((await page.locator('#'+p+'-emp').innerText()).replace(/[\s\u00a0]/g,'')).toMatch(/16[.,]?982[.,]88/);
    await expect(page.locator('#kalkulator-kosztu-pracownika a[href="kadry.html"]')).toBeVisible();
  });
  test('ZUS is operable with keyboard '+prefix,async({page})=>{
    await page.goto('/'+prefix+'narzedzia.html');const radio=page.locator('#zr-pelny');await radio.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#zr-tylko')).toBeChecked();
    await page.keyboard.press('ArrowLeft');await expect(page.locator('#zr-pelny')).toBeChecked();
    const box=page.locator('#ztog-chorob');await box.focus();const initial=await box.isChecked();await page.keyboard.press('Space');expect(await box.isChecked()).toBe(!initial);
    expect(await radio.evaluate(e=>getComputedStyle(e).display)).not.toBe('none');
  });
  test('Consent defaults off; withdrawal remains available '+prefix,async({page,context})=>{
    await context.clearCookies();await page.goto('/'+prefix+'blog.html');await page.locator('#lpCookieReject').click();await page.locator('#lpCookieSettings').click();await expect(page.locator('#lpCookieBanner')).toBeVisible();
    await expect(page.locator('script[src^="https://www.googletagmanager.com/gtag/js"]')).toHaveCount(0);
  });
  for(const file of ['ksiegowosc.html','kadry.html'])test('Three real related services '+prefix+file,async({page})=>{
    await page.goto('/'+prefix+file);const links=await page.locator('.other-card').evaluateAll(a=>a.map(x=>({href:x.getAttribute('href'),text:x.textContent})));
    expect(links).toHaveLength(3);expect(new Set(links.map(a=>a.href)).size).toBe(3);expect(links.map(a=>a.href)).not.toContain(file);expect(links.map(a=>a.text).join(' ')).not.toMatch(/Analizy finansowe|Financial analyses|Projekty UE|EU projects/);
  });
}
test('PIT article is the newest tax post and opens from blog',async({page})=>{
  await page.goto('/blog.html');const first=page.locator('#blogGrid .blog-card').first();await expect(first.locator('h2 a')).toHaveAttribute('href','blog-progi-pit-2027-sejm.html');
  await page.getByRole('button',{name:'Podatki',exact:true}).click();await expect(first).toBeVisible();await first.locator('h2 a').click();await expect(page.locator('.article-table')).toHaveCount(2);await expect(page.locator('main')).toContainText('nowe zasady jeszcze nie obowiązują');
});

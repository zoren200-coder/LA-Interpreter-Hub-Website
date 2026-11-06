const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.HUB_BASE_URL||'http://127.0.0.1:8000';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const open=async path=>{const r=await page.goto(base+'/'+path);assert.equal(r.status(),200);};
  for(const width of [320,375,768,850,851,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   await open('index.html');
   if(width<=850)await page.locator('.menu').click();
   assert.equal(await page.locator('#navigation a[href="events.html"], #navigation a[href="directory.html"]').count(),0);
   assert.equal(await page.locator('.hero-note').count(),0);
   assert(!(await page.locator('body').textContent()).includes('Many languages.'));
   const left=await page.locator('.hero-inner > div').boundingBox();
   const features=await page.locator('.hero-features').boundingBox();
   const search=await page.locator('.library-tools').boundingBox();
   assert(features.y+features.height < search.y, 'Feature boxes do not overlap search');
   if(width>850)assert(features.x>=left.x+left.width, 'Desktop features to right of hero content');
   else assert(features.y>=left.y+left.height, 'Small-screen features below hero content');
   const boxes=await page.locator('.feature-card').all();assert.equal(boxes.length,2);
   const first=await boxes[0].boundingBox(), second=await boxes[1].boundingBox();assert(first.y+first.height<second.y);
   if(width<=850)await page.locator('.menu').click();
   for(const [selector,path] of [['.feature-events','events.html'],['.feature-directory','directory.html']]){
    await open('index.html');const box=page.locator(selector);assert(await box.isVisible());
    assert.equal(await box.getAttribute('href'),path);
    // The button-styled label and the card share one keyboard-accessible anchor.
    assert.equal(await box.locator('a,button').count(),0);
    await box.focus();await Promise.all([page.waitForURL('**/'+path),page.keyboard.press('Enter')]);assert(page.url().endsWith('/'+path));
    assert.equal(await page.locator('#navigation a[href="events.html"], #navigation a[href="directory.html"]').count(),0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await open('index.html');await Promise.all([page.waitForURL('**/'+path),page.locator(selector+' .feature-action').click()]);assert(page.url().endsWith('/'+path));
   }
  }
  await open('events.html');assert.equal(await page.locator('#upcoming-results article').count(),0);
  assert.equal(await page.locator('#event-empty').textContent(),'New professional events and opportunities will be announced here.');
  await page.locator('#event-search').fill('anything');await page.locator('#event-type').selectOption('Webinar');assert(await page.locator('#event-empty').isVisible());
  await open('directory.html');assert.equal(await page.locator('#directory-results article').count(),0);
  assert.equal(await page.locator('#directory-empty').textContent(),'Our interpreter directory is growing. Check back soon to connect with participating professionals.');
  assert(await page.locator('#directory-request button').isDisabled());assert(await page.locator('[name="publicationConsent"]').isDisabled());
  assert(await page.locator('#directory-request input').evaluateAll(inputs=>inputs.every(i=>i.matches(':disabled'))));
  assert(!await page.locator('#directory-request').getAttribute('action'));
  assert.equal(await page.locator('#directory-request').evaluate(form=>{const e=new Event('submit',{cancelable:true});return !form.dispatchEvent(e)}),true);
  assert.deepEqual(await page.evaluate(()=>({events:HUB_COMMUNITY.events,interpreters:HUB_COMMUNITY.interpreters})),{events:[],interpreters:[]});
  console.log('Responsive homepage feature boxes, keyboard/button links, navigation removal, empty catalogs and inactive consent form pass.');
  // Synthetic test records only: intercepted in-memory, never in public page data.
  const event=(id,startAt,type='Webinar')=>({id,title:'TEST ONLY '+id,type,startAt,timeZone:'America/Chicago',location:'Online',organizer:'Test organizer',description:'Test description',url:'https://example.org/'+id});
  const profile=(name,changes={})=>({id:name,name,languages:['Spanish ↔ English'],specializations:['Court'],credentials:['Member supplied credential'],serviceArea:'Test city',availability:'Remote',website:'https://example.org/profile',contactURL:'https://example.org/contact',contactAuthorized:true,approved:true,publicationAuthorized:true,...changes});
  const fixture={eventTypes:['Webinar','Workshop'],events:[event('later','2099-06-02T12:00:00Z'),event('earlier','2099-06-01T12:00:00Z','Workshop'),event('past','2000-01-01T12:00:00Z'),event('invalid','invalid')],interpreters:[profile('TEST ONLY Approved'),profile('TEST ONLY Second',{languages:['Arabic ↔ English'],specializations:['Medical'],credentials:['Other credential'],serviceArea:'Other city',contactAuthorized:false}),profile('TEST ONLY NoConsent',{publicationAuthorized:false}),profile('TEST ONLY Pending',{approved:false})]};
  await page.route('**/data/community.js',route=>route.fulfill({contentType:'text/javascript',body:'window.HUB_COMMUNITY='+JSON.stringify(fixture)}));
  await open('events.html');assert.deepEqual(await page.locator('#upcoming-results h2').allTextContents(),['TEST ONLY earlier','TEST ONLY later']);
  assert.equal(await page.locator('#past-results h2').textContent(),'TEST ONLY past');assert(await page.locator('#past-section').isVisible());
  await page.locator('#event-type').selectOption('Workshop');assert.equal(await page.locator('#upcoming-results article').count(),1);
  await page.locator('#event-search').fill('no matches');assert.equal(await page.locator('#upcoming-results article').count(),0);
  await open('directory.html');assert.equal(await page.locator('#directory-results article').count(),2);
  assert(!(await page.locator('#directory-results').textContent()).includes('NoConsent'));assert(!(await page.locator('#directory-results').textContent()).includes('Pending'));
  assert.equal(await page.getByRole('link',{name:'Contact interpreter',exact:true}).count(),1);
  await page.locator('#directory-language').selectOption('Arabic ↔ English');assert.equal(await page.locator('#directory-results h2').textContent(),'TEST ONLY Second');
  await page.locator('#directory-specialization').selectOption('Medical');await page.locator('#directory-location').selectOption('Other city');await page.locator('#directory-credential').selectOption('Other credential');
  assert.equal(await page.locator('#directory-results article').count(),1);assert.equal(await page.getByRole('link',{name:'Contact interpreter',exact:true}).count(),0);
  await page.locator('#directory-search').fill('no match');assert(await page.locator('#directory-empty').isVisible());
  assert.equal(errors.length,0,errors.join('\n'));console.log('Event chronology, past separation, search/type filters, directory filters and consent/contact authorization gates pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

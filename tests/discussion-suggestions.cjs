const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.HUB_BASE_URL||'http://127.0.0.1:8000';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/');const field=page.locator('#related-resource-question'),results=page.locator('#related-resource-suggestions');
 assert(await field.isVisible());assert(!(await results.isVisible()));
 const requests=[];page.on('request',r=>requests.push({url:r.url(),postData:r.postData()}));
 await field.fill('I-485 private-draft-marker');
 assert.equal(await results.locator('a').count(),2);
 assert.equal(await results.locator('a').first().textContent(),'Suggested resource · I -485 Questionnaire Glossary');
 assert.equal(await results.locator('a').first().getAttribute('href'),'https://drive.google.com/file/d/15y68EvDwaJn0sTCq-pzg_rWbofDLDdwg/view?usp=sharing');
 await field.fill('adjustment of status glossary');const english=await results.locator('a').allTextContents();
 await field.fill('glosario de ajuste de estatus');assert.deepEqual(await results.locator('a').allTextContents(),english);
 await field.fill('What is the best pizza dough recipe?');assert(!(await results.isVisible()));assert.equal(await results.locator('a').count(),0);
 await field.fill('court interpreter');assert(!(await results.isVisible()));
 await field.fill('');assert(!(await results.isVisible()));
 assert.equal(requests.length,0,'Typing does not create network requests');
 assert.equal(await page.evaluate(()=>location.search),'');assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 assert.equal(await page.locator('#community .community-conversation').count(),1);
 assert((await page.locator('.conversation-access').textContent()).includes('Register to reply'));
 assert.equal(await page.locator('.conversation-actions a').count(),3);
 for(const width of [320,375,768,1024,1440]){
  await page.setViewportSize({width,height:900});await field.fill('I-485 glossary');assert(await field.isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await results.locator('a').first().focus();assert(await results.locator('a').first().evaluate(a=>document.activeElement===a));
 }
 // Replace one sample post in the HTTP test response only, to exercise title/body integration.
 await page.route('**/index.html',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync(require.resolve('../index.html'),'utf8').replace('</section>\n\n    <section id="about"', '<article class="thread"><div class="thread-content"><h3>A question about I-485</h3><p>How can I prepare adjustment of status terminology?</p></div></article></section>\n\n    <section id="about"')}));
 await page.goto(base+'/index.html');
 const post=page.locator('.thread').first().locator('.discussion-suggestions a');assert.equal(await post.count(),2);
 assert.equal(await post.first().textContent(),'Suggested resource · I -485 Questionnaire Glossary');
 assert.equal(errors.length,0,errors.join('\n'));console.log('Local-only draft finder, strong/empty results, live-region links, static post integration, keyboard and responsive layouts pass.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict');const fs=require('node:fs');const {chromium}=require('playwright');
const {mapRow,value,fetchRows}=require('../assets/supabase-directory.js');
const base=process.env.HUB_BASE_URL||'http://127.0.0.1:8000';
(async()=>{
 assert.equal(value(null),'');assert.equal(value('  '),'');assert.equal(value([]),'');assert.equal(value({}),'');assert.equal(value(0),'0');assert.equal(value(false),'false');
 const profile=mapRow({'Full Name':'TEST ONLY Name','Languages':['Spanish ↔ English'],'Certification':'Test certificate','Email':'test@example.org','Phone Number':'+1 (555) 010-0200','Other Public Field':'Test detail','Empty':null});
 assert.equal(profile.name,'TEST ONLY Name');assert.equal(profile.contacts.length,2);assert.deepEqual(profile.details,[['Other Public Field','Test detail']]);
 const pages=[];const client={from(table){assert.equal(table,'Interpreters');return{select(columns){assert.equal(columns,'*');return{async range(start,end){pages.push([start,end]);return{data:start===0?[{n:1},{n:2}]:start===2?[{n:3}]:[],error:null}}}}}}};
 assert.equal((await fetchRows(client,'Interpreters',2)).length,3);assert.deepEqual(pages,[[0,1],[2,3],[3,4]]);
 await assert.rejects(fetchRows({from(){return{select(){return{async range(){return{data:null,error:new Error('denied')}}}}}}}));
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
 try{
  const page=await b.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const sdkPath=process.env.SUPABASE_SDK_PATH||'/tmp/hub-supabase-v2-cdn.js';
  assert(fs.existsSync(sdkPath),'Download the official @supabase/supabase-js@2 CDN script into SUPABASE_SDK_PATH before this test');
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(sdkPath,'utf8')}));
  let mode='populated',calls=[];
  await page.route('https://gykeddempkafqqmzuydy.supabase.co/**',async route=>{
   const request=route.request(),u=new URL(request.url());
   assert.equal(u.pathname,'/rest/v1/Interpreters');assert.equal(request.method(),'GET');assert.equal(u.searchParams.get('select'),'*');
   assert.deepEqual([...u.searchParams.keys()].sort(),['limit','offset','select']);
   assert(request.headers()['apikey'].startsWith('sb_publishable_'));calls.push(request.url());
   if(mode==='error'){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'PRIVATE ERROR DETAILS MUST NOT APPEAR'})});return;}
   const data=mode==='empty'||Number(u.searchParams.get('offset'))>0?[]:[
    {'Full Name':'TEST ONLY One','Languages':'Spanish ↔ English','Certification':'Test certificate','Email':'test@example.org','Phone Number':'+1 (555) 010-0200','Specialization':'Court','City':'Test city','Availability':'Remote','Professional Bio':'<img src=x onerror=alert(1)>','Empty Optional':null,'Blank':' ','Zero':0,'Test Flag':false},
    {'Full Name':'','Languages':'Arabic ↔ English','Certification':'','Email':null,'Phone Number':'','Specialization':'Medical','Location':'Other city','Website':'javascript:alert(1)'}
   ];await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(base+'/directory.html');await page.waitForFunction(()=>document.querySelector('#directory-results').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#directory-results article').count(),2);assert.equal(calls.length,2);
  const first=page.locator('#directory-results article').first();assert.equal(await first.locator('h2').textContent(),'TEST ONLY One');
  assert((await first.textContent()).includes('Spanish ↔ English'));assert((await first.textContent()).includes('Test certificate'));
  assert((await first.textContent()).includes('Zero: 0'));assert((await first.textContent()).includes('Test Flag: false'));
  assert(!(await first.textContent()).includes('Empty Optional'));assert(!(await first.textContent()).includes('Blank:'));
  assert.equal(await first.locator('img').count(),0);assert((await first.textContent()).includes('<img'));
  assert.equal(await first.locator('a[href^="mailto:"]').count(),1);assert.equal(await first.locator('a[href^="tel:"]').count(),1);
  assert.equal(await page.locator('#directory-results a[href^="javascript:"]').count(),0);
  await page.locator('#directory-language').selectOption('Arabic ↔ English');assert.equal(await page.locator('#directory-results article').count(),1);
  await page.locator('#directory-language').selectOption('');await page.locator('#directory-search').fill('Test city');assert.equal(await page.locator('#directory-results article').count(),1);
  await page.locator('#directory-search').fill('');assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  for(const width of [320,375,768,1024,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  mode='empty';await page.reload();await page.waitForFunction(()=>document.querySelector('#directory-results').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#directory-results article').count(),0);assert((await page.locator('#directory-empty').textContent()).includes('directory is growing'));
  mode='error';await page.reload();await page.waitForFunction(()=>document.querySelector('#directory-results').getAttribute('aria-busy')==='false');
  assert(await page.locator('#directory-retry').isVisible());assert((await page.locator('#directory-status').textContent()).includes('temporarily unavailable'));
  assert(!(await page.locator('body').textContent()).includes('PRIVATE ERROR DETAILS'));
  mode='populated';await page.locator('#directory-retry').click();await page.waitForFunction(()=>document.querySelectorAll('#directory-results article').length===2);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Real Supabase v2 SDK, exact table/columns, pagination, null/empty handling, all returned rows, contact links, safe extra fields, filters, responsive layouts, empty/error/retry states pass with simulated API responses.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

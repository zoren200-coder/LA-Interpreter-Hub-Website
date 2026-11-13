const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base=process.env.HUB_BASE_URL||'http://127.0.0.1:8060';
(async()=>{
 const sdk=fs.readFileSync(process.env.SUPABASE_SDK_PATH||'/tmp/hub-supabase-v2-cdn.js','utf8');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
 try{
  for(const width of [375,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900}});
   const page=await context.newPage();page.setDefaultTimeout(10000);
   const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'text/javascript',body:sdk}));
   // All Supabase calls are intercepted: no test account or email is created remotely.
   await page.route('https://gykeddempkafqqmzuydy.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    assert.equal(url.pathname,'/auth/v1/signup');assert.equal(request.method(),'POST');
    assert.equal(url.searchParams.get('redirect_to'),base+'/membership.html');
    const body=request.postDataJSON();requests.push(body);
    assert.equal(body.email,'test-member@example.org');assert.equal(body.data.full_name,'TEST ONLY Member');assert(body.data.membership_consent_at);
    await route.fulfill({contentType:'application/json',body:JSON.stringify({user:{id:'00000000-0000-4000-8000-000000000001',email:body.email,aud:'authenticated',role:'authenticated',user_metadata:body.data,created_at:'2026-01-01T00:00:00Z'},session:null})});
   });
   await page.goto(base+'/index.html');
   const join=page.locator('.join-hub'),social=page.locator('.social-box').filter({has:page.locator('#social-title')});
   const j=await join.boundingBox(),s=await social.boundingBox();
   if(width>700){assert(j.x+j.width<=s.x);assert(Math.abs(j.y-s.y)<2);}else assert(j.y+j.height<=s.y);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.equal(await page.locator('.social-links a').count(),3);
   const button=join.getByRole('link',{name:'Sign Up',exact:true});assert.equal(await button.getAttribute('href'),'membership.html?mode=signup');
   assert((await button.boundingBox()).height>=44);await button.click();
   assert.equal(new URL(page.url()).pathname,'/membership.html');assert.equal(new URL(page.url()).search,'?mode=signup');
   await page.waitForFunction(()=>!document.querySelector('#member-forms').hidden);
   assert(await page.locator('#member-signup').isVisible());assert(await page.locator('#member-login-panel').isHidden());
   await page.waitForFunction(()=>document.activeElement.id==='signup-name');
   const field=await page.locator('#signup-name').boundingBox();assert(field.y>=0 && field.y<900);
   await page.locator('#signup-name').fill('TEST ONLY Member');await page.locator('#signup-email').fill('test-member@example.org');await page.locator('#signup-password').fill('test-only-password-123');await page.locator('#signup-consent').check();
   await page.locator('#member-signup button').click();await page.waitForFunction(()=>document.querySelector('#member-status').textContent.includes('Check your email'));
   assert.equal(requests.length,1);assert.equal(await page.locator('#signup-password').inputValue(),'');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
   await page.locator('#member-signin-link a').click();await page.waitForFunction(()=>!document.querySelector('#member-forms').hidden);assert(await page.locator('#member-login-panel').isVisible());
   console.log(width+'px: bottom layout, one-click signup, immediate field focus, real SDK simulated signup, confirmation notice and sign-in link pass.');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

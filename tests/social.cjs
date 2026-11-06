const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=process.env.HUB_BASE_URL||'http://127.0.0.1:8000';
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});try{
 const p=await b.newPage();
 for(const width of [320,375,768,1024,1440,1920]){
  await p.setViewportSize({width,height:900});await p.goto(base+'/');
  assert.equal(await p.locator('.social-box').count(),1);
  assert.equal(await p.locator('#social-title').textContent(),'Connect With the Hub');
  assert.deepEqual(await p.locator('.social-links a').evaluateAll(a=>a.map(x=>x.getAttribute('href'))),[
   'https://www.facebook.com/profile.php?id=61590693230571','https://www.instagram.com/laterphub/','https://www.linkedin.com/in/504-louisiana-interpreter-hub/'
  ]);
  const layout=await p.evaluate(()=>{
   const box=document.querySelector('.social-box'),section=box.closest('section'),r=box.getBoundingClientRect(),outer=section.parentElement.getBoundingClientRect();
   const about=document.querySelector('#about').getBoundingClientRect(),footer=document.querySelector('footer').getBoundingClientRect();
   const ancestors=[];for(let e=box;e;e=e.parentElement)ancestors.push(getComputedStyle(e).position);
   return {after:section===section.parentElement.lastElementChild,right:Math.abs(r.right-outer.right)<1,afterAbout:r.top>=about.bottom,beforeFooter:r.bottom<footer.top,noFloating:!ancestors.some(v=>['fixed','sticky'].includes(v)),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(Object.entries(layout).every(([k,v])=>k==='overflow'?!v:v),JSON.stringify({width,...layout}));
  await p.locator('.social-box').scrollIntoViewIfNeeded();assert(await p.locator('.social-box').isVisible());
  const before=await p.locator('.social-box').boundingBox();await p.evaluate(()=>window.scrollBy(0,-100));const after=await p.locator('.social-box').boundingBox();assert(after.y>before.y,'Box follows page scrolling');
  for(const a of await p.locator('.social-links a').all()){
   assert.equal(await a.getAttribute('target'),'_blank');assert((await a.getAttribute('rel')).includes('noopener'));
   await a.focus();assert(await a.evaluate(el=>document.activeElement===el));assert.equal(await a.locator('svg[aria-hidden="true"]').count(),1);
  }
  await p.screenshot({path:'/tmp/hub-social-'+width+'.png'});
 }
 console.log('Bottom-right document flow, footer spacing, exact social URLs, icons and keyboard access pass at six widths.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

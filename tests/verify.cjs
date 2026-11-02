// Run a static server, then HUB_BASE_URL=http://127.0.0.1:8000 node tests/verify.cjs.
// Requires Playwright and Chromium; fixtures are injected in-memory, never published.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.HUB_BASE_URL || 'http://127.0.0.1:8000';
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium'});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const open = async path => {
      const response = await page.goto(base + '/' + path);
      assert.equal(response.status(), 200, path);
      await page.waitForFunction(() => document.querySelector('#navigation details'));
    };
    await open('index.html');
    const catalog = await page.evaluate(() => window.HUB_CATALOG);
    assert.equal(catalog.categories[0].subcategories.length, 6);
    assert.equal(catalog.categories[1].subcategories.length, 3);
    assert.equal(catalog.categories[2].subcategories.length, 2);
    assert.equal(catalog.resources.length, 0, 'No invented materials');
    const links = await page.locator('#navigation a').evaluateAll(nodes => nodes.map(a => a.href));
    for (const url of links) {
      const response = await page.request.get(url);
      assert.equal(response.status(), 200, url);
    }
    for (const category of catalog.categories) {
      for (const sub of category.subcategories) {
        await open(`resources.html?category=${category.id}&subcategory=${sub.id}`);
        assert.equal(await page.locator('#page-title').textContent(), sub.title);
        assert.equal(await page.locator('#resource-subcategory').inputValue(), sub.id);
        assert(await page.locator('#library-empty').isVisible());
      }
    }
    console.log('All navigation destinations and 11 subcategory views load.');
    for (const width of [320, 375, 600, 768, 850, 851, 1024, 1440]) {
      await page.setViewportSize({width, height: 1000});
      await open('index.html');
      const mobile = width <= 850;
      if (mobile) await page.locator('.menu').click();
      for (const title of ['Resources and Knowledge', 'Ethics and Professional Practice', 'More']) {
        const summary = page.locator('#navigation > details > summary', {hasText: title});
        await summary.focus();
        await page.keyboard.press('Enter');
        assert(await summary.evaluate(el => el.parentElement.open));
        await page.keyboard.press('Tab');
        assert(await page.evaluate(() => document.activeElement.tagName === 'A' || document.activeElement.tagName === 'SUMMARY'));
        if (title === 'More') {
          const nested = page.locator('#navigation details details > summary');
          await nested.focus(); await page.keyboard.press('Space');
          assert(await nested.evaluate(el => el.parentElement.open));
          assert(await page.getByRole('link', {name: 'Official Documents', exact: true}).isVisible());
          const outside = await page.locator('#navigation details details .nav-panel').evaluate(el => { const r=el.getBoundingClientRect();return r.left<0 || r.right>innerWidth; });
          assert(!outside, 'Nested panel fits viewport at ' + width);
          await page.keyboard.press('Escape');
          assert(!(await nested.evaluate(el => el.parentElement.open)));
          assert(await page.locator('#navigation > details').last().evaluate(el => el.open));
        }
        await summary.focus(); await page.keyboard.press('Escape');
        assert(!(await summary.evaluate(el => el.parentElement.open)));
      }
      const ratio = await page.locator('.brand-logo').evaluate(async image => { await image.decode(); const r=image.getBoundingClientRect(); return r.width/r.height; });
      assert(Math.abs(ratio - 2170/725) < 0.01);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Home overflow ' + width);
      if (mobile) {
        await page.locator('#navigation > details > summary').first().click();
        await page.getByRole('link', {name: 'Spanish ↔ English Resources', exact: true}).click();
        assert.equal(await page.locator('.menu').getAttribute('aria-expanded'), 'false');
      }
      await open('resources.html');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Library overflow ' + width);
    }
    console.log('Dropdowns, nested menus, keyboard controls, logo and layouts pass at 8 viewport widths.');
    await open('index.html');
    assert.equal(await page.locator('.card').count(), 3);
    await page.locator('#search').fill('confidentiality');
    assert.equal(await page.locator('.card:visible').count(), 1);
    await page.locator('.card:visible summary').click();
    assert(await page.locator('.card:visible details').evaluate(el => el.open));
    await page.locator('#search').fill('');
    await page.locator('#category').selectOption('training');
    assert.equal(await page.locator('.card:visible').count(), 1);
    assert.equal(await page.locator('.thread').count(), 3);
    assert(await page.locator('#about').count());
    console.log('Existing homepage topics, filters, disclosure content, community preview and About remain accessible.');
    await open('resources.html#resource-search');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'resource-search');
    // Synthetic test data stays in this browser context; it is not a real catalog.
    await page.evaluate(() => {
      HUB_CATALOG.resources.push(
        {id:'test-a',title:'Alpha',description:'First test',category:'knowledge',subcategory:'spanish-english',type:'pdf',language:'Spanish',source:'Test author',url:'index.html',status:'published'},
        {id:'test-b',title:'Beta',description:'Second test',category:'ethics',subcategory:'codes',type:'video',language:'English',source:'Test author',url:'index.html',status:'published'},
        {id:'test-review',title:'Review record',category:'ethics',subcategory:'codes',language:'English',type:'pdf',url:'index.html',status:'review'},
        {id:'test-unsafe',title:'Unsafe record',category:'knowledge',language:'English',type:'external',url:'javascript:alert(1)',status:'published'}
      );
      const script = document.createElement('script');script.src='assets/library.js';document.body.append(script);
    });
    await page.waitForFunction(() => document.querySelectorAll('#resource-results article').length === 2);
    await page.locator('#resource-search').fill('alpha');
    assert.equal(await page.locator('#resource-results article').count(), 1);
    await page.locator('#resource-search').fill('');
    await page.locator('#resource-language').selectOption('English');
    assert.equal(await page.locator('#resource-results article h2').textContent(), 'Beta');
    await page.locator('#resource-type').selectOption('pdf');
    assert(await page.locator('#library-empty').isVisible());
    await page.locator('#resource-language').selectOption('');
    await page.locator('#resource-type').selectOption('');
    await page.locator('#resource-category').selectOption('knowledge');
    await page.locator('#resource-subcategory').selectOption('spanish-english');
    assert.equal(await page.locator('#resource-results article h2').textContent(), 'Alpha');
    assert.equal(await page.locator('#resource-results dd').allTextContents().then(a=>a.join('|')), 'Resources and Knowledge|Spanish ↔ English Resources|PDF|Spanish|Test author');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('Search, combined category/language/type filters, metadata rendering and review/unsafe-link exclusion pass. No JavaScript errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

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
      assert.equal(await page.locator('#resource-results article dl, #resource-results article dt, #resource-results article dd').count(), 0);
      assert(await page.locator('#resource-results article').evaluateAll(cards => cards.every(card => [...card.children].every(child => ['H2','P','A'].includes(child.tagName) || (card.classList.contains('training-video-group') && child.tagName === 'UL')))));

    };
    await open('index.html');
    const catalog = await page.evaluate(() => window.HUB_CATALOG);
    assert.equal(catalog.categories[0].subcategories.length, 6);
    assert.equal(catalog.categories[1].subcategories.length, 3);
    assert.equal(catalog.categories[2].subcategories.length, 2);
    assert.equal(catalog.resources.length, 61, 'Sixty-one unique resource records');
    assert.equal(catalog.reviewQueue.length, 0, 'Both Drive files approved for source linking');
    assert.equal(new Set([...catalog.resources, ...catalog.reviewQueue].map(r=>r.id)).size, 61);
    assert.equal(new Set([...catalog.resources, ...catalog.reviewQueue].map(r=>r.url)).size, 61);
    assert.deepEqual(await page.locator('#navigation > *').evaluateAll(nodes => nodes.map(n => n.tagName === 'DETAILS' ? n.querySelector('summary').textContent : n.textContent)), ['Home', 'Resources and Knowledge', 'Ethics and Professional Practice', 'Archive and Important Documents', 'About the Hub', 'Search']);
    assert.equal(await page.locator('#navigation details details').count(), 0);
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
        if (sub.id === 'spanish-english') {
          assert.equal(await page.locator('#resource-results article').count(), 14);
          for (const [id, subject, url] of [
            ['maritime-dictionary', 'Maritime', 'https://drive.google.com/file/d/1mZufRauXg89ij-v6uobB3cBc8sh83fsl/view?usp=drive_link'],
            ['i485-questionnaire-glossary', 'Immigration', 'https://drive.google.com/file/d/15y68EvDwaJn0sTCq-pzg_rWbofDLDdwg/view?usp=sharing']
          ]) {
            const record = catalog.resources.find(r => r.id === id);
            assert.equal(record.url, url);
            const parsed = new URL(record.url);assert.equal(parsed.hostname, 'drive.google.com');
            assert(/^\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(parsed.pathname));
            await page.locator('#resource-subject').selectOption(subject);
            assert.equal(await page.locator('#resource-results article').count(), 1);
            const button = page.locator('#resource-results article a');
            assert.equal(await button.textContent(), 'View Resource');
            assert.equal(await button.getAttribute('href'), url);
            assert.equal(await button.getAttribute('target'), '_blank');
            assert((await button.getAttribute('rel')).includes('noopener'));
            await page.locator('#resource-search').fill(id === 'maritime-dictionary' ? 'shipping contracts' : 'voluntary departure');
            assert.equal(await page.locator('#resource-results article h2').textContent(), record.title);
            await page.locator('#resource-search').fill('');
          }
          await page.locator('#resource-subject').selectOption('Legal and judicial');
          assert.equal(await page.locator('#resource-results article').count(), 4);
          await page.locator('#resource-search').fill('Vera Institute');
          assert.equal(await page.locator('#resource-results article h2').textContent(), 'A Spanish Glossary for New York City');
          assert.equal(await page.locator('#resource-results article a').getAttribute('href'), 'https://www.nycourts.gov/d10files/2018-05/translatingJustice_Spanish.pdf');
        } else if (sub.id === 'vietnamese-english') {
          assert.equal(await page.locator('#resource-results article').count(), 3);
          for (const record of catalog.resources.filter(r => r.subcategory === 'vietnamese-english')) {
            await page.locator('#resource-search').fill(record.title);
            assert.equal(await page.locator('#resource-results article').count(), 1);
            const button = page.locator('#resource-results article a');
            assert.equal(await button.textContent(), 'View Resource');
            assert.equal(await button.getAttribute('href'), record.url);
            assert.equal(await button.getAttribute('target'), '_blank');
          }
          await page.locator('#resource-search').fill('');
          await page.locator('#resource-subject').selectOption('Consecutive interpreting practice');
          assert.equal(await page.locator('#resource-results article').count(), 1);
          await page.locator('#resource-type').selectOption('video');
          assert.equal(await page.locator('#resource-results article').count(), 1);
          await page.locator('#resource-language').selectOption('Vietnamese / English');
          assert.equal(await page.locator('#resource-results article').count(), 1);
          assert.equal(await page.locator('#resource-results article a').getAttribute('href'), 'https://www.youtube.com/watch?v=r1v5Q5eeXPg');
        } else if (sub.id === 'arabic-english') {
          assert.equal(await page.locator('#resource-results article').count(), 6);
          const expected = [
            ['Glossary of Legal Terminology: English–Arabic – Wisconsin Court System', 'https://www.wicourts.gov/services/interpreter/docs/arabicglossary.pdf'],
            ['Online Resources for Arabic–English Translators – Cadenza Academic Translations', 'https://www.cadenza-academictranslations.com/blog/2022/02/11/online-resources-for-arabicenglish-translators/'],
            ['Arabic–English Consecutive Interpretation Practice', 'https://www.youtube.com/watch?v=iO-nITg0ydE'],
            ['Arabic–English Simultaneous Interpreting… No Booth?! Interpreter in Action', 'https://www.youtube.com/watch?v=eiBw8uiADXY'],
            ['Eliane Sfeir-Markus on Arabic Interpreting – Episode 63', 'https://www.youtube.com/watch?v=Y5a2S2Je-X8'],
            ['Miranda Warnings Translations – Multilingual Legal Resource', 'https://www.mirandawarningstranslations.com/']
          ];
          for (const [title, url] of expected) {
            await page.locator('#resource-search').fill(title);
            assert.equal(await page.locator('#resource-results article').count(), 1);
            assert.equal(await page.locator('#resource-results article h2').textContent(), title);
            assert.equal(await page.locator('#resource-results article a').textContent(), 'View Resource');
            assert.equal(await page.locator('#resource-results article a').getAttribute('href'), url);
          }
          await page.locator('#resource-search').fill('');
          await page.locator('#resource-type').selectOption('video');
          assert.equal(await page.locator('#resource-results article').count(), 3);
          await page.locator('#resource-subject').selectOption('Simultaneous interpreting practice');
          assert.equal(await page.locator('#resource-results article').count(), 1);
          await page.locator('#resource-language').selectOption('Arabic / English');
          assert.equal(await page.locator('#resource-results article').count(), 1);
        } else if (sub.id === 'training') {
          const records = catalog.resources.filter(r => r.subcategory === 'training');
          const videos = records.filter(r => r.type === 'video');
          assert.equal(videos.length, 9);
          const confidentIndex = records.findIndex(r => r.id === 'confident-interpreter');
          assert.equal(records[confidentIndex + 1].id, 'i485-translation-project');
          assert.equal(records[confidentIndex + 1].title, 'Form I-485 (Spanish Reference Guide)');
          const headings = await page.locator('#resource-results > article > h2').allTextContents();
          assert.equal(headings[headings.indexOf('The Confident Interpreter – Professional Interpreter Training Resources') + 1], 'Form I-485 (Spanish Reference Guide)');
          assert.equal(await page.locator('#resource-results > article').count(), 4);
          assert.equal(await page.locator('.training-video-group').count(), 1);
          assert.equal(await page.locator('.training-video-group h2').textContent(), 'Videos: simultaneous trial practice');
          assert((await page.locator('.training-video-group').textContent()).includes('rest every 30 minutes!!'));
          assert((await page.locator('.training-video-group').textContent()).includes('violent content'));
          assert.deepEqual(await page.locator('.training-video-group li a').evaluateAll(links => links.map(a => ({title:a.textContent,url:a.href}))), videos.map(r => ({title:r.title,url:r.url})));
          for (const record of records) {
            await page.locator('#resource-search').fill(record.title);
            assert.equal(await page.locator('#resource-results > article').count(), 1);
            const link = record.type === 'video' ? page.locator('.training-video-group li a') : page.locator('#resource-results article a');
            assert.equal(await link.count(), 1);
            assert.equal(await link.getAttribute('href'), record.url);
            assert.equal(await link.getAttribute('target'), '_blank');
          }
          await page.locator('#resource-search').fill('');
          await page.locator('#resource-subject').selectOption('Simultaneous interpreting practice');
          assert.equal(await page.locator('#resource-results > article').count(), 2);
          assert.equal(await page.locator('.training-video-group li a').count(), 9);
          await page.locator('#resource-type').selectOption('video');
          assert.equal(await page.locator('#resource-results > article').count(), 1);
          assert.equal(await page.locator('.training-video-group li a').count(), 9);
          await page.locator('#resource-type').selectOption('');
          await page.locator('#resource-subject').selectOption('Immigration interview preparation');
          assert.equal(await page.locator('.training-video-group').count(), 0);
          assert.equal(await page.locator('#resource-results article a').getAttribute('href'), 'https://drive.google.com/file/d/12JlpqTv23vIca_BjluA4kp9gOCNxQ79S/view?usp=drive_link');
        } else if (sub.id === 'news') {
          assert.equal(await page.locator('#resource-results article').count(), 10);
          assert.deepEqual(await page.locator('.resource-date-heading').allTextContents(), ['Dated articles — supplied dates unverified', 'Undated articles and publications']);
          const order = await page.locator('#resource-results article h2').allTextContents();
          assert.equal(order[0], 'Trump Administration and Green Cards Abroad – NPR (2026)');
          assert.equal(order[4], 'Would You Like Some Cheese With Your Whine? – Athena Sky Interpreting');
          const records = catalog.resources.filter(r => r.subcategory === 'news');
          assert.equal(records.length, 10);
          assert.equal(records.filter(r=>r.publicationDate).length, 5);
          for (const record of records) {
            await page.locator('#resource-search').fill(record.title);
            assert.equal(await page.locator('#resource-results article').count(), 1);
            assert.equal(await page.locator('#resource-results article h2').textContent(), record.title);
            assert.equal(await page.locator('#resource-results article a').textContent(), 'Read Article');
            assert.equal(await page.locator('#resource-results article a').getAttribute('href'), record.url);
            assert.equal(await page.locator('#resource-results article a').getAttribute('target'), '_blank');
          }
          assert.equal(await page.locator('#resource-results article dl, #resource-results article dt, #resource-results article dd').count(), 0);
          await page.locator('#resource-search').fill('Inside the Interpreter');
          assert(!(await page.locator('#resource-results article').textContent()).includes('Commercial book listing'));
          assert(catalog.resources.find(r=>r.id==='inside-interpreters-mind').availabilityNote.includes('Commercial book listing'));
          await page.locator('#resource-search').fill('');
          await page.locator('#resource-subject').selectOption('Immigration');
          assert.equal(await page.locator('#resource-results article').count(), 2);
          await page.locator('#resource-search').fill('asylum');
          assert.equal(await page.locator('#resource-results article').count(), 1);
          await page.locator('#resource-search').fill('');
          await page.locator('#resource-subject').selectOption('Research and Publications');
          assert.equal(await page.locator('#resource-results article').count(), 2);
          assert.deepEqual(await page.locator('.resource-date-heading').allTextContents(), ['Undated articles and publications']);
        } else if (sub.id === 'general') {
          assert.equal(await page.locator('#resource-results article').count(), 5);
          const expected = [
            ['Tips for Working with Interpreters in the Courtroom – Professional Guidelines', 'https://drive.google.com/file/d/1Gfb0Brx-jQqKhmY22mIIccZUgBDh7YQG/view?usp=drive_link'],
            ['Language Access Board Act of 2026 – H.R. 8604', 'https://drive.google.com/file/d/1Ts25L6F5oj5tNr-yTSrR8nTX89jPCNPT/view?usp=drive_link'],
            ['Free Interpreter Oral Exam Training to Manage Exam Anxiety', 'https://www.youtube.com/watch?v=EkWjr6lJXQk'],
            ['USAGov en Español – Official U.S. Government Information', 'https://www.usa.gov/es/'],
            ['Tips for Working with Court Interpreters in the Louisiana Courts – Louisiana Supreme Court', 'https://drive.google.com/file/d/10baMvwPGoxmUXl-nTZngS08b7jBRDj2f/view?usp=drive_link']
          ];
          assert.equal(catalog.resources.filter(r=>r.subcategory==='general').length, expected.length);
          for (const [title, url] of expected) {
            await page.locator('#resource-search').fill(title);
            assert.equal(await page.locator('#resource-results article').count(), 1);
            assert.equal(await page.locator('#resource-results article h2').textContent(), title);
            assert.equal(await page.locator('#resource-results article a').textContent(), 'View Resource');
            assert.equal(await page.locator('#resource-results article a').getAttribute('href'), url);
            assert.equal(await page.locator('#resource-results article a').getAttribute('target'), '_blank');
          }
          await page.locator('#resource-search').fill('');
          await page.locator('#resource-subject').selectOption('Courtroom interpreting guidelines');
          assert.equal(await page.locator('#resource-results article').count(), 2);
          await page.locator('#resource-type').selectOption('document');
          assert.equal(await page.locator('#resource-results article').count(), 2);
          await page.locator('#resource-search').fill('NAJIT');
          assert.equal(await page.locator('#resource-results article').count(), 1);
        } else if (category.id === 'ethics' && ['codes','scenarios'].includes(sub.id)) {
          const records = catalog.resources.filter(r=>r.category==='ethics' && r.subcategory===sub.id);
          assert.equal(records.length, sub.id==='codes' ? 2 : 1);
          assert.equal(await page.locator('#resource-results article').count(), records.length);
          for (const record of records) {
            await page.locator('#resource-search').fill(record.title);
            assert.equal(await page.locator('#resource-results article').count(), 1);
            assert.equal(await page.locator('#resource-results article h2').textContent(), record.title);
            const link = page.locator('#resource-results article a');
            assert.equal(await link.textContent(), 'View Resource');
            assert.equal(await link.getAttribute('href'), record.url);
            assert.equal(await link.getAttribute('target'), '_blank');
            await page.locator('#resource-subject').selectOption(record.subject);
            await page.locator('#resource-type').selectOption('external');
            assert.equal(await page.locator('#resource-results article').count(), 1);
            await page.locator('#resource-subject').selectOption('');
          }
        } else if (sub.id === 'official') {
          assert.equal(await page.locator('#resource-results article').count(), 3);
          const records = catalog.resources.filter(r=>r.category==='archive' && r.subcategory==='official');
          assert.equal(records.length, 3);
          for (const record of records) {
            await page.locator('#resource-search').fill(record.title);
            assert.equal(await page.locator('#resource-results article').count(), 1);
            assert.equal(await page.locator('#resource-results article h2').textContent(), record.title);
            const link = page.locator('#resource-results article a');
            assert.equal(await link.getAttribute('href'), new URL(record.url, base + '/').href);
            if (record.type === 'pdf') {
              assert.equal(await link.textContent(), 'Download PDF');
              assert.equal(await link.getAttribute('download'), record.download);
              const response = await page.request.get(base + '/' + record.url);
              assert.equal(response.status(), 200);
              assert(response.headers()['content-type'].includes('application/pdf'));
              const bytes=await response.body();assert.equal(bytes.subarray(0,5).toString(), '%PDF-');
              assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),record.sha256);
            } else {
              assert.equal(record.url,'https://www.lasc.org/LPOR-Forms?p=index_1-25_espanol');
              assert.equal(await link.textContent(),'View Resource');
            }
          }
          await page.locator('#resource-search').fill('');
          await page.locator('#resource-type').selectOption('pdf');
          assert.equal(await page.locator('#resource-results article').count(), 2);
          await page.locator('#resource-subject').selectOption('Courtroom interpreting and language access');
          assert.equal(await page.locator('#resource-results article').count(), 2);
        } else if (sub.id === 'papers') {
          const records=catalog.resources.filter(r=>r.category==='archive'&&r.subcategory==='papers');
          assert.equal(records.length,6);assert.equal(await page.locator('#resource-results article').count(),6);
          assert.equal(records.filter(r=>r.type==='pdf').length,4);
          assert.deepEqual(records.filter(r=>r.type==='external').map(r=>r.url),[
            'https://ccj.ncsc.org/resources-courts/support-efforts-ensure-adequate-court-interpretation-services?utm_source=chatgpt.com',
            'https://www.atanet.org/advocacy-outreach/ata-position-paper-on-remote-interpreting/'
          ]);
          for(const record of records){
            await page.locator('#resource-search').fill(record.title);
            assert.equal(await page.locator('#resource-results article').count(),1);
            assert.equal(await page.locator('#resource-results article h2').textContent(),record.title);
            const link=page.locator('#resource-results article a');
            assert.equal(await link.getAttribute('href'),new URL(record.url,base+'/').href);
            assert.equal(await link.textContent(),record.type==='pdf'?'View Document':'View Resource');
            assert.equal(await link.getAttribute('target'),'_blank');
            if(record.type==='pdf'){
              const response=await page.request.get(base+'/'+record.url);assert.equal(response.status(),200);
              assert(response.headers()['content-type'].includes('application/pdf'));
              const bytes=await response.body();assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
              assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),record.sha256);
            }
          }
          await page.locator('#resource-search').fill('');await page.locator('#resource-type').selectOption('pdf');
          assert.equal(await page.locator('#resource-results article').count(),4);
          await page.locator('#resource-subject').selectOption('Team interpreting');
          assert.equal(await page.locator('#resource-results article').count(),1);
        } else assert(await page.locator('#library-empty').isVisible());
      }
    }
    await open('resources.html');
    assert.equal(await page.locator('#resource-results article').count(), 61);
    await page.locator('#resource-search').fill('Miranda');
    assert.equal(await page.locator('#resource-results article').count(), 1, 'Cross-list is not a duplicate global result');
    console.log('All navigation destinations and 11 subcategory views load; 6 Arabic listings and unique global results verified.');
    for (const width of [320, 375, 600, 768, 850, 851, 1024, 1280, 1440]) {
      await page.setViewportSize({width, height: 1000});
      await open('index.html');
      const mobile = width <= 850;
      if (mobile) await page.locator('.menu').click();
      assert.equal(await page.locator('#navigation summary').filter({hasText: /^More$/}).count(), 0);
      if (!mobile) {
        const items = await page.locator('#navigation > *').evaluateAll(nodes => nodes.map(node => {
          const control = node.tagName === 'DETAILS' ? node.querySelector('summary') : node;
          const r = control.getBoundingClientRect(); const style = getComputedStyle(control);
          return {visible:r.width>0 && r.height>0 && r.left>=0 && r.right<=innerWidth, center:r.top+r.height/2, clipped:control.scrollWidth>control.clientWidth, ellipsis:style.textOverflow==='ellipsis'};
        }));
        assert(items.every(item => item.visible && !item.clipped && !item.ellipsis), 'All desktop headings fully visible at ' + width);
        assert(Math.max(...items.slice(0,5).map(i=>i.center))-Math.min(...items.slice(0,5).map(i=>i.center)) < 2, 'Original desktop headings share one row');
        assert(!(await page.locator('.menu').isVisible()));
      }
      for (const title of ['Resources and Knowledge', 'Ethics and Professional Practice', 'Archive and Important Documents']) {
        const summary = page.locator('#navigation > details > summary', {hasText: title});
        await summary.focus();
        await page.keyboard.press('Enter');
        assert(await summary.evaluate(el => el.parentElement.open));
        await page.keyboard.press('Tab');
        assert(await page.evaluate(() => document.activeElement.tagName === 'A' || document.activeElement.tagName === 'SUMMARY'));
        if (title === 'Archive and Important Documents') {
          assert(await page.getByRole('link', {name: 'Official Documents', exact: true}).isVisible());
          assert(await page.getByRole('link', {name: 'Position Papers & White Papers', exact: true}).isVisible());
        }
        const outside = await summary.locator('..').locator('.nav-panel').evaluate(el => {const r=el.getBoundingClientRect();return r.left<0 || r.right>innerWidth;});
        assert(!outside, 'Dropdown fits viewport at ' + width);
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
      await open('resources.html?category=knowledge&subcategory=arabic-english');
      assert.equal(await page.locator('#resource-results article').count(), 6);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Arabic library overflow ' + width);
      await open('resources.html?category=knowledge&subcategory=training');
      assert.equal(await page.locator('#resource-results article').count(), 4);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Training library overflow ' + width);
      await open('resources.html?category=knowledge&subcategory=news');
      assert.equal(await page.locator('#resource-results article').count(), 10);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'News overflow ' + width);
      await open('resources.html?category=knowledge&subcategory=general');
      assert.equal(await page.locator('#resource-results article').count(), 5);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'General resources overflow ' + width);
      await open('resources.html?category=ethics');
      assert.equal(await page.locator('#resource-results article').count(), 3);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Ethics overflow ' + width);
      await open('resources.html?category=archive&subcategory=official');
      assert.equal(await page.locator('#resource-results article').count(), 3);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Official Documents overflow ' + width);
      await open('resources.html?category=archive&subcategory=papers');
      assert.equal(await page.locator('#resource-results article').count(),6);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Position Papers overflow ' + width);
    }
    console.log('Top-level dropdowns, keyboard controls, logo and layouts pass at 9 viewport widths.');
    await open('index.html');
    assert.equal(await page.locator('.card').count(), 3);
    assert.equal(await page.locator('.card .tag:visible').count(), 0);
    assert.equal(await page.locator('#search, #resource-status, #empty').count(), 0);
    const libraryLink = page.getByRole('link', {name: 'Search the resource library', exact: true});
    assert.equal(await libraryLink.getAttribute('href'), 'resources.html');
    await libraryLink.click();
    assert.equal(new URL(page.url()).pathname, new URL(base + '/resources.html').pathname);
    await open('index.html');
    await page.locator('#category').selectOption('ethics');
    assert.equal(await page.locator('.card:visible').count(), 1);
    assert.equal(await page.locator('.card:visible .resource-card-link').getAttribute('href'), 'resources.html?category=ethics');
    await page.locator('#category').selectOption('training');
    assert.equal(await page.locator('.card:visible').count(), 1);
    await page.locator('#category').selectOption('all');
    const destinations = ['resources.html?category=knowledge', 'resources.html?category=ethics', 'resources.html?category=knowledge&subcategory=training'];
    assert.deepEqual(await page.locator('.resource-card-link').evaluateAll(links => links.map(a => a.getAttribute('href'))), destinations);
    for (let i = 0; i < destinations.length; i++) {
      await open('index.html');
      await page.locator('.resource-card-link').nth(i).click();
      await page.waitForFunction(() => document.querySelectorAll('#resource-results article').length > 0);
      assert.equal(await page.locator('#resource-category').inputValue(), i === 1 ? 'ethics' : 'knowledge');
      if (i === 2) assert.equal(await page.locator('#resource-subcategory').inputValue(), 'training');
    }
    await open('index.html');
    assert.equal(await page.locator('.thread, .reply, #community-note, .card details').count(), 0);
    assert(await page.locator('#community-topics').isVisible());
    assert.equal(await page.locator('#community-topics a, #community-topics button, #community-topics input').count(), 0);
    assert.equal(await page.locator('#community .community-actions a').count(), 3);
    assert(await page.locator('#about').count());
    console.log('Homepage resource links, category filters, social channels, future discussion space and About verified.');
    await open('resources.html#resource-search');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'resource-search');
    // Synthetic test data stays in this browser context; it is not a real catalog.
    await page.evaluate(() => {
      HUB_CATALOG.resources = [];
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
    assert.equal(await page.locator('#resource-results dd').count(), 0);
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('Search, combined category/language/type filters, metadata rendering and review/unsafe-link exclusion pass. No JavaScript errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

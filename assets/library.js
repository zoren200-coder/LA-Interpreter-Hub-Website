(() => {
  const catalog = window.HUB_CATALOG;
  const $ = id => document.getElementById(id);
  const fields = ['q', 'category', 'subcategory', 'language', 'type', 'subject'];
  const controls = [$('resource-search'), $('resource-category'), $('resource-subcategory'), $('resource-language'), $('resource-type'), $('resource-subject')];
  const [search, category, subcategory, language, type, subject] = controls;
  const params = new URLSearchParams(location.search);
  const option = (value, title) => new Option(title, value);
  catalog.categories.forEach(c => category.add(option(c.id, c.title)));
  Object.entries(catalog.types).forEach(([id, title]) => type.add(option(id, title)));
  [...new Set(catalog.resources.map(r => r.language || 'Not specified'))].sort().forEach(l => language.add(option(l, l)));
  [...new Set(catalog.resources.map(r => r.subject).filter(Boolean))].sort().forEach(value => subject.add(option(value, value)));
  const fillSubcategories = () => {
    subcategory.replaceChildren(option('', 'All subcategories'));
    catalog.categories.filter(c => !category.value || c.id === category.value).forEach(c => {
      c.subcategories.forEach(s => subcategory.add(option(s.id, s.title)));
    });
  };
  category.value = params.get('category') || '';
  fillSubcategories();
  controls.forEach((control, index) => { control.value = params.get(fields[index]) || ''; });
  const text = (tag, content) => { const el = document.createElement(tag); el.textContent = content; return el; };
  const safeURL = value => {
    try { const url = new URL(value, location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  };
  const render = () => {
    const q = search.value.trim().toLocaleLowerCase();
    // Use section-specific labels for cross-listed records, retaining one source URL.
    const results = catalog.resources.map(r => {
      const listing = (r.additionalListings || []).find(l => l.subcategory === subcategory.value && (!category.value || l.category === category.value));
      return listing ? {...r, ...listing} : r;
    }).filter(r => r.status !== 'review' && safeURL(r.url) &&
      (!category.value || r.category === category.value) &&
      (!subcategory.value || r.subcategory === subcategory.value) &&
      (!language.value || (r.language || 'Not specified') === language.value) && (!type.value || r.type === type.value) &&
      (!subject.value || r.subject === subject.value) &&
      [r.title, r.description, r.source, r.subject, ...(r.additionalListings || []).map(l => [l.title, l.description, l.subject].join(' '))].join(' ').toLocaleLowerCase().includes(q));
    const selectedCategory = catalog.categories.find(c => c.id === category.value);
    const selectedSubcategory = catalog.categories.flatMap(c => c.subcategories).find(s => s.id === subcategory.value);
    const title = selectedSubcategory?.title || selectedCategory?.title || 'Resource library';
    $('page-title').textContent = title;
    document.title = title + ' | Louisiana Interpreters Hub';
    const note = catalog.sectionNotes?.[subcategory.value];
    const noteBox = $('resource-section-note');
    noteBox.hidden = !note || (!!subject.value && subject.value !== note.subject);
    noteBox.replaceChildren();
    if (!noteBox.hidden) noteBox.append(text('h2', note.title), text('p', note.text), text('strong', note.warning));
    $('results-status').textContent = results.length + (results.length === 1 ? ' resource' : ' resources');
    const isNews = subcategory.value === 'news';
    const dateKey = r => /^\d{4}(-\d{2}-\d{2})?$/.test(r.publicationDate || '') ? r.publicationDate : '';
    const ordered = isNews ? [...results].sort((a, b) => dateKey(b).localeCompare(dateKey(a))) : results;
    const cards = ordered.map(r => {
      const article = document.createElement('article');
      article.append(text('h2', r.title));
      if (r.description) article.append(text('p', r.description));
      const a = text('a', r.linkLabel || (r.type === 'pdf' ? 'Open PDF at source' : r.type === 'document' ? 'Open document at source' : 'Visit resource')); a.href = safeURL(r.url);
      if (r.download) a.download = r.download;
      if (r.openInNewTab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      a.className = 'button'; a.setAttribute('aria-label', a.textContent + ': ' + r.title + (r.openInNewTab ? ' (opens in a new tab)' : ''));
      article.append(a); return article;
    });
    const content = [];
    let previousGroup = null;
    cards.forEach((card, index) => {
      if (isNews) {
        const group = dateKey(ordered[index]) ? 'Dated articles — supplied dates unverified' : 'Undated articles and publications';
        if (group !== previousGroup) {
          const heading = text('h2', group); heading.className = 'resource-date-heading';
          content.push(heading); previousGroup = group;
        }
      }
      content.push(card);
    });
    $('resource-results').replaceChildren(...content);
    $('library-empty').hidden = results.length > 0;
    $('library-empty').textContent = catalog.resources.length ? 'No resources match these filters. Try another search or category.' : 'No materials have been published in this catalog yet. Existing study topics are preserved on the homepage.';
    const url = new URL(location.href); url.search = '';
    controls.forEach((control, index) => { if (control.value) url.searchParams.set(fields[index], control.value); });
    history.replaceState(null, '', url);
  };
  document.querySelector('.resource-filters').addEventListener('submit', event => { event.preventDefault(); render(); });
  search.addEventListener('input', render);
  category.addEventListener('change', () => { fillSubcategories(); render(); });
  [subcategory, language, type, subject].forEach(control => control.addEventListener('change', render));
  render();
  if (location.hash === '#resource-search') search.focus();
  document.getElementById('year').textContent = new Date().getFullYear();
})();

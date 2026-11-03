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
    const results = catalog.resources.filter(r => r.status !== 'review' && safeURL(r.url) &&
      (!category.value || r.category === category.value) &&
      (!subcategory.value || r.subcategory === subcategory.value) &&
      (!language.value || (r.language || 'Not specified') === language.value) && (!type.value || r.type === type.value) &&
      (!subject.value || r.subject === subject.value) &&
      [r.title, r.description, r.source, r.subject].join(' ').toLocaleLowerCase().includes(q));
    const selectedCategory = catalog.categories.find(c => c.id === category.value);
    const selectedSubcategory = catalog.categories.flatMap(c => c.subcategories).find(s => s.id === subcategory.value);
    const title = selectedSubcategory?.title || selectedCategory?.title || 'Resource library';
    $('page-title').textContent = title;
    document.title = title + ' | Louisiana Interpreters Hub';
    $('results-status').textContent = results.length + (results.length === 1 ? ' resource' : ' resources');
    $('resource-results').replaceChildren(...results.map(r => {
      const article = document.createElement('article');
      article.append(text('h2', r.title), text('p', r.description));
      const meta = document.createElement('dl');
      const c = catalog.categories.find(c => c.id === r.category);
      const s = c?.subcategories.find(s => s.id === r.subcategory);
      for (const [label, value] of Object.entries({Category: c?.title, Subcategory: s?.title, Type: catalog.types[r.type], Language: r.language, 'Source or author': r.source, Subject: r.subject})) {
        meta.append(text('dt', label), text('dd', value || 'Not specified'));
      }
      const a = text('a', r.type === 'pdf' ? 'Open PDF at source' : r.type === 'document' ? 'Open document at source' : 'Visit resource'); a.href = safeURL(r.url);
      a.className = 'button'; a.setAttribute('aria-label', a.textContent + ': ' + r.title);
      article.append(meta, a); return article;
    }));
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

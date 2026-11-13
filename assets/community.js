(() => {
  const data = window.HUB_COMMUNITY;
  const $ = id => document.getElementById(id);
  const text = (tag, value) => { const node = document.createElement(tag); node.textContent = value; return node; };
  const safeURL = (value, contact = false) => {
    if (!value) return null;
    try { const u = new URL(value); return (contact ? ['https:', 'mailto:', 'tel:'] : ['https:']).includes(u.protocol) ? u.href : null; }
    catch { return null; }
  };
  const link = (label, url) => { const a = text('a', label); a.href = url; a.className = 'button'; a.rel = 'noopener noreferrer'; a.target = '_blank'; return a; };
  if ($('event-search')) {
    const search = $('event-search'), type = $('event-type');
    data.eventTypes.forEach(value => type.add(new Option(value, value)));
    const valid = data.events.filter(e => e.title && e.startAt && /(?:Z|[+-]\d\d:\d\d)$/.test(e.startAt) && Number.isFinite(Date.parse(e.startAt)) && e.timeZone && safeURL(e.url));
    const format = e => {
      try { return new Intl.DateTimeFormat('en-US', {dateStyle:'full', timeStyle:'short', timeZone:e.timeZone}).format(new Date(e.startAt)) + ' (' + e.timeZone + ')'; }
      catch { return null; }
    };
    const render = () => {
      const now = Date.now(), q = search.value.trim().toLowerCase();
      const found = valid.filter(e => format(e) && (!type.value || e.type === type.value) && [e.title,e.description,e.organizer,e.location].join(' ').toLowerCase().includes(q));
      const upcoming = found.filter(e => Date.parse(e.endAt || e.startAt) >= now).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));
      const past = found.filter(e => Date.parse(e.endAt || e.startAt) < now).sort((a,b)=>Date.parse(b.startAt)-Date.parse(a.startAt));
      const card = e => {
        const article = document.createElement('article'); article.append(text('h2',e.title));
        const time = text('time', format(e)); time.dateTime = e.startAt;
        article.append(time,text('p', e.location || 'Location not supplied'),text('p',e.organizer || 'Organizer not supplied'),text('p',e.description || ''),link('Event details and registration',safeURL(e.url))); return article;
      };
      $('upcoming-results').replaceChildren(...upcoming.map(card));
      $('past-results').replaceChildren(...past.map(card)); $('past-section').hidden = !past.length;
      $('event-empty').hidden = !!upcoming.length;
      $('event-empty').textContent = !valid.length ? 'New professional events and opportunities will be announced here.' : 'No upcoming events match your search and filters.';
      $('event-status').textContent = upcoming.length + ' upcoming events' + (past.length ? ' · ' + past.length + ' past events' : '');
    };
    search.addEventListener('input',render); type.addEventListener('change',render); render();
  }
  if ($('directory-search')) {
    // Publishing requires both editorial approval and explicit publication authorization.
    let profiles = data.interpreters.filter(p => p.approved === true && p.publicationAuthorized === true);
    const search = $('directory-search');
    const filters = [['directory-language','languages'],['directory-specialization','specializations'],['directory-location','serviceArea'],['directory-credential','credentials']];
    const values = (p, field) => Array.isArray(p[field]) ? p[field] : (p[field] ? [p[field]] : []);
    const fillFilters = () => filters.forEach(([id,field]) => {
      const select=$(id), previous=select.value, all=select.options[0].cloneNode(true);
      select.replaceChildren(all);
      [...new Set(profiles.flatMap(p=>values(p,field)))].sort().forEach(value=>select.add(new Option(value,value)));
      if ([...select.options].some(option=>option.value===previous)) select.value=previous;
    });
    fillFilters();
    const render = () => {
      const q = search.value.trim().toLowerCase();
      const found = profiles.filter(p => [p.name,...values(p,'languages'),...values(p,'specializations'),p.serviceArea,...values(p,'credentials'),...(p.details||[]).flat(),...(p.contacts||[]).map(c=>c.value)].join(' ').toLowerCase().includes(q) && filters.every(([id,field])=>!$(id).value||values(p,field).includes($(id).value)));
      $('directory-results').replaceChildren(...found.map(p => {
        const article = document.createElement('article');if(p.name)article.append(text('h2',p.name));
        for (const [label,field] of [['Languages','languages'],['Specializations','specializations'],['Professional credentials (member supplied)','credentials'],['Service area','serviceArea'],['Availability','availability']]) {
          const v=values(p,field);if(v.length)article.append(text('p',label+': '+v.join(', ')));
        }
        for (const [label,value] of p.details||[]) article.append(text('p',label+': '+value));
        for (const contact of p.contacts||[]) {
          if (contact.url) article.append(link(contact.label+': '+contact.value,contact.url));
          else article.append(text('p',contact.label+': '+contact.value));
        }
        const website=safeURL(p.website);if(website)article.append(link('Professional website',website));
        const contact=p.contactAuthorized === true && safeURL(p.contactURL,true);if(contact)article.append(link('Contact interpreter',contact));
        return article;
      }));
      $('directory-empty').hidden=!!found.length;
      $('directory-empty').textContent=!profiles.length ? 'Our interpreter directory is growing. Check back soon to connect with participating professionals.' : 'No interpreters match your search and filters.';
      $('directory-status').textContent=found.length+' participating interpreters';
    };
    window.HubDirectory = {setProfiles: records => {
      profiles=records.filter(p=>p.approved===true && p.publicationAuthorized===true);
      fillFilters();render();
    }};
    search.addEventListener('input',render);filters.forEach(([id])=>$(id).addEventListener('change',render));render();
  }
  $('year').textContent=new Date().getFullYear();
})();

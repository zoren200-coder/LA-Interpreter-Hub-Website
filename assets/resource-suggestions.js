/* Pure, browser-local matching. The resource catalog remains the only resource source. */
(function (root) {
  'use strict';
  const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\bi\s*[-–—]?\s*485\b/g, ' i485 ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  const concepts = {
    i485: ['i485', 'adjustment of status', 'adjust status', 'ajuste de estatus', 'ajuste de estado'],
    deposition: ['deposition', 'depositions', 'deposicion', 'deposiciones'],
    najit: ['najit', 'national association of judiciary interpreters and translators'],
    ata: ['ata', 'american translators association'],
    uscis: ['uscis', 'united states citizenship and immigration services', 'servicios de ciudadania e inmigracion'],
    lep: ['lep', 'limited english proficiency', 'dominio limitado del ingles'],
    simultaneous: ['simultaneous interpreting', 'simultaneous interpretation', 'interpretacion simultanea'],
    consecutive: ['consecutive interpreting', 'consecutive interpretation', 'interpretacion consecutiva'],
    courtcertification: ['court interpreter certification', 'court certification', 'certificacion de interpretes judiciales', 'certificacion judicial'],
    teaminterpreting: ['team interpreting', 'team interpretation', 'interpretacion en equipo', 'interpretacion en equipos'],
    attorneyprivilege: ['attorney client privilege', 'privilegio abogado cliente', 'secreto profesional abogado cliente']
  };
  const bilingual = {
    glosario:'glossary', glosarios:'glossary', impuestos:'tax', tributario:'tax', tributaria:'tax',
    confidencialidad:'confidentiality', privilegiadas:'privileged', privilegiada:'privileged',
    maritimo:'maritime', maritima:'maritime', inmigracion:'immigration', deportacion:'deportation',
    testigo:'witness', testigos:'witness', jurado:'jury', fatiga:'fatigue',
    interprete:'interpreter', interpretes:'interpreter', interpreting:'interpreter', interpreters:'interpreter',
    tribunal:'court', tribunales:'court', corte:'court', judicial:'court', courts:'court',
    etica:'ethics', traduccion:'translation', recursos:'resources', recurso:'resources'
  };
  const stop = new Set(('a an the and or of to in on for from with by is are be as at it this that my i we you how what can do does need help question about please ' +
    'el la los las un una unos unas y o de del al en para por con es son se mi mis me como que cual puedo puede necesito ayuda pregunta sobre favor').split(' '));
  const broad = new Set('court interpreter interpretation legal language professional resources resource training article video glossary english spanish ingles espanol practice information terminology term terms reference references glossaries guide guides specialty toolkit assignment settings study'.split(' '));
  const aliases = Object.entries(concepts).flatMap(([key,terms]) => terms.map(term=>[fold(term),key])).sort((a,b)=>b[0].length-a[0].length);
  function normalize(value) {
    let result = ' ' + fold(value) + ' ';
    // Spaces implement whole-term boundaries, so ATA never matches an unrelated word.
    for (const [term,key] of aliases) result = result.split(' '+term+' ').join(' '+key+' ');
    return result.trim().split(/\s+/).map(t=>bilingual[t]||t).join(' ');
  }
  const tokens = value => [...new Set(normalize(value).split(/\s+/).filter(t=>t && !stop.has(t)))];
  const safeLink = value => {
    if (typeof value !== 'string' || !value.trim()) return false;
    // Allow catalog-local paths and HTTPS/HTTP links, never executable schemes.
    if (value.startsWith('//') || /[\x00-\x1f]/.test(value)) return false;
    try { return ['https:', 'http:'].includes(new URL(value, 'https://hub.invalid/').protocol); }
    catch { return false; }
  };
  function buildIndex(catalog) {
    const categories = new Map((catalog.categories || []).map(c=>[c.id,c]));
    const seen = new Set();
    const entries = (catalog.resources || []).filter(r => r.status === 'published' && safeLink(r.url)).filter(r=>{
      if (seen.has(r.url)) return false; seen.add(r.url); return true;
    }).map(r=>{
      const category=categories.get(r.category);
      const variants=r.additionalListings||[];
      const tags=Array.isArray(r.tags)?r.tags:(r.tags?[r.tags]:[]);
      const title = new Set(tokens(r.title));
      const all = new Set(tokens([r.title,r.description,category?.title,category?.subcategories?.find(s=>s.id===r.subcategory)?.title,r.subject,r.source,...tags,
        ...variants.flatMap(v=>[v.title,v.description,v.subject,...(Array.isArray(v.tags)?v.tags:[])])].join(' ')));
      return {id:r.id,title:r.title,url:r.url,titleTokens:title,tokens:all};
    });
    const frequency = new Map();
    entries.forEach(e=>e.tokens.forEach(t=>frequency.set(t,(frequency.get(t)||0)+1)));
    return {entries,frequency};
  }
  function suggest(index, title, body = '') {
    const query = tokens(String(title || '')+' '+String(body || ''));
    if (!query.length) return [];
    return index.entries.map(entry=>{
      let score=0, specific=0, meaningful=0;
      query.forEach(term=>{
        if (!entry.tokens.has(term)) return;
        if (broad.has(term)) {score+=0.15;return;}
        meaningful++;
        if (Object.hasOwn(concepts,term)) {score+=10;specific++;}
        else score+=Math.min(3.5,1+Math.log((index.entries.length+1)/((index.frequency.get(term)||0)+1)));
        if (entry.titleTokens.has(term)) score+=2;
      });
      // A concise title improves ranking without hard-coding preferred resource IDs.
      if (meaningful) score+=1/(entry.titleTokens.size+1);
      return {id:entry.id,title:entry.title,url:entry.url,score,strong:score>=8 && (specific>0||meaningful>=2)};
    }).filter(r=>r.strong).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,2)
      .map(({id,title,url})=>({id,title,url}));
  }
  const api={normalize,buildIndex,suggest};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.HubResourceSuggestions=api;
})(typeof window !== 'undefined' ? window : globalThis);

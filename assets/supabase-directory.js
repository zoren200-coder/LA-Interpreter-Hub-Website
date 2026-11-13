/* All rows/contact fields in this table are pre-approved for public display by the owner. */
(function (root) {
  'use strict';
  const value = input => {
    if (input == null) return '';
    if (Array.isArray(input)) return input.map(value).filter(Boolean).join(', ');
    if (typeof input === 'object') return Object.entries(input).map(([k,v])=>value(v)?k+': '+value(v):'').filter(Boolean).join('; ');
    return String(input).trim();
  };
  const list = input => Array.isArray(input) ? input.map(value).filter(Boolean) : (value(input) ? [value(input)] : []);
  const safeWebsite = input => {
    try { const u=new URL(value(input));return ['https:','http:'].includes(u.protocol)?u.href:null; } catch { return null; }
  };
  function mapRow(row) {
    // Bracket notation intentionally preserves Supabase's case-sensitive column names.
    const details=[];
    const known=new Set(['Full Name','Languages','Certification','Email','Phone Number','Specialization','Specializations','City','Service Area','Location','Availability','Website']);
    for (const [column,input] of Object.entries(row)) if (!known.has(column) && value(input)) details.push([column,value(input)]);
    const locationColumns=['Service Area','City','Location'];
    const primaryLocation=locationColumns.find(column=>value(row[column]));
    for (const column of locationColumns) if (column!==primaryLocation && value(row[column])) details.push([column,value(row[column])]);
    if (value(row['Website']) && !safeWebsite(row['Website'])) details.push(['Website',value(row['Website'])]);
    const email=value(row['Email']), phone=value(row['Phone Number']);
    const contacts=[];
    if (email) contacts.push({label:'Email',value:email,url:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?'mailto:'+encodeURIComponent(email):null});
    if (phone) {
      const dial=phone.replace(/[^\d+]/g,'');
      contacts.push({label:'Phone Number',value:phone,url:/^\+?\d+$/.test(dial)?'tel:'+dial:null});
    }
    return {
      name:value(row['Full Name']),languages:list(row['Languages']),credentials:list(row['Certification']),
      specializations:[...new Set([...list(row['Specializations']),...list(row['Specialization'])])],
      serviceArea:value(row['Service Area']) || value(row['City']) || value(row['Location']),
      availability:value(row['Availability']),website:safeWebsite(row['Website']),details,contacts,
      // Local display flags reflect the owner's table-wide authorization, not DB filters.
      approved:true,publicationAuthorized:true
    };
  }
  async function fetchRows(client,table='Interpreters',pageSize=500) {
    const rows=[];
    for (let offset=0;;) {
      const {data,error,status}=await client.from(table).select('*').range(offset,offset+pageSize-1);
      if (error) {
        const issue=new Error('Directory request failed');
        issue.httpStatus=status;
        issue.code=/^[A-Za-z0-9_-]{1,40}$/.test(error.code||'')?error.code:'REQUEST_FAILED';
        throw issue;
      }
      if (!Array.isArray(data)) throw new Error('Invalid directory response');
      if (!data.length) break;
      rows.push(...data);
      offset+=data.length;
    }
    return rows;
  }
  const api={value,mapRow,fetchRows};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  else {
    root.HubSupabaseDirectory=api;
    const load=async()=>{
      const status=document.getElementById('directory-status'), empty=document.getElementById('directory-empty');
      const retry=document.getElementById('directory-retry'), controls=document.querySelectorAll('#directory-search, .directory-filters select');
      retry.hidden=true;controls.forEach(c=>{c.disabled=true;});
      document.getElementById('directory-results').setAttribute('aria-busy','true');
      status.textContent='Loading interpreters…';empty.hidden=true;
      let loaded=false;
      try {
        const config=root.HUB_SUPABASE_DIRECTORY;
        if (!config || !root.supabase?.createClient) {const issue=new Error('Directory client unavailable');issue.code='SDK_UNAVAILABLE';throw issue;}
        const endpoint=new URL(config.url);
        if (endpoint.protocol!=='https:' || endpoint.hostname==='supabase.co' || endpoint.pathname!=='/' || endpoint.username || endpoint.password) throw new Error('Invalid project URL');
        const client=root.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
        const rows=await fetchRows(client,config.table);
        root.HubDirectory.setProfiles(rows.map(mapRow));loaded=true;status.removeAttribute('data-error-code');
        if (!rows.length) empty.textContent='No public interpreter profiles were returned. Please check back for updates.';
      } catch (issue) {
        // Only expose a safe category/status, never raw errors or credentials.
        root.HubDirectory.setProfiles([]);
        const code=issue.code||'CONNECTION_FAILED';status.dataset.errorCode=code;
        const diagnostic=issue.httpStatus?'HTTP '+issue.httpStatus+' · '+code:code;
        status.textContent='Interpreter directory temporarily unavailable. Reference: '+diagnostic+'.';
        if (code==='SDK_UNAVAILABLE') empty.textContent='The directory service could not load. Please reload this page and try again.';
        else if ([401,403].includes(issue.httpStatus)) empty.textContent='Directory access is unavailable. Please contact the Hub administrator.';
        else if (issue.httpStatus===404) empty.textContent='The directory data source is unavailable. Please contact the Hub administrator.';
        else empty.textContent='We could not connect to the interpreter registry. Please try again shortly.';
        empty.hidden=false;retry.hidden=false;
      } finally {
        document.getElementById('directory-results').setAttribute('aria-busy','false');
        controls.forEach(c=>{c.disabled=!loaded;});
      }
    };
    document.getElementById('directory-retry').addEventListener('click',load);
    load();
  }
})(typeof window!=='undefined'?window:globalThis);

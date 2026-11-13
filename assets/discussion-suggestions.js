(() => {
  const matcher=window.HubResourceSuggestions;
  const index=matcher.buildIndex(window.HUB_CATALOG);
  function show(container,title,body) {
    const matches=matcher.suggest(index,title,body);
    container.replaceChildren();container.hidden=!matches.length;
    for (const resource of matches) {
      const a=document.createElement('a');
      a.textContent='Suggested resource · '+resource.title;
      a.href=resource.url;
      container.append(a);
    }
  }
  const field=document.getElementById('related-resource-question');
  const results=document.getElementById('related-resource-suggestions');
  field.addEventListener('input',()=>show(results,'',field.value));
  // The existing board contains read-only sample posts, not a publishing editor.
  document.querySelectorAll('#community .thread').forEach(post=>{
    const content=post.querySelector('.thread-content');
    const heading=content.querySelector('h3').cloneNode(true);
    heading.querySelectorAll('.reply').forEach(node=>node.remove());
    const suggestions=document.createElement('div');
    suggestions.className='discussion-suggestions';suggestions.hidden=true;
    content.append(suggestions);
    show(suggestions,heading.textContent,content.querySelector('p')?.textContent||'');
  });
})();

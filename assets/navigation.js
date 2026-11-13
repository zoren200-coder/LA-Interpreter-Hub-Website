(() => {
  const nav = document.querySelector('#navigation');
  const catalog = window.HUB_CATALOG;

  const link = (title, href) => {
    const a = document.createElement('a');
    a.textContent = title;
    a.href = href;
    return a;
  };

  const group = (title, children) => {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = title;

    const panel = document.createElement('div');
    panel.className = 'nav-panel';
    panel.append(...children);

    details.append(summary, panel);
    return details;
  };

  const categoryGroup = category => group(category.title, [
    link(
      'View all ' + category.title.toLowerCase(),
      'resources.html?category=' + category.id
    ),
    ...category.subcategories.map(sub => link(
      sub.title,
      'resources.html?category=' + category.id + '&subcategory=' + sub.id
    ))
  ]);

  const search = link('Search', 'resources.html#resource-search');
  search.className = 'nav-search';
  search.setAttribute('aria-label', 'Search resources');

  const searchLabel = document.createElement('span');
  searchLabel.className = 'visually-hidden';
  searchLabel.textContent = 'Search';
  search.replaceChildren(searchLabel);

  const icon = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  );
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML =
    '<circle cx="10" cy="10" r="6"></circle><path d="m15 15 6 6"></path>';
  search.prepend(icon);

  nav.replaceChildren(
    link('Home', 'index.html'),
    categoryGroup(catalog.categories[0]),
    categoryGroup(catalog.categories[1]),
    categoryGroup(catalog.categories[2]),
    link('Interpreter Directory', 'directory.html'),
    link('About the Hub', 'index.html#about'),
    link('Membership', 'membership.html'),
    search
  );

  const button = document.querySelector('.menu');

  const closeAll = () => {
    nav.querySelectorAll('details[open]').forEach(details => {
      details.open = false;
    });
  };

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';

    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);

    if (!open) {
      closeAll();
    }
  });

  nav.addEventListener('click', event => {
    if (event.target.closest('a')) {
      closeAll();
      nav.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    }
  });

  // Native summary controls support Enter/Space.
  // Tab reaches all links inside open dropdowns.
  nav.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const current = event.target.closest('details[open]');

      if (current) {
        current.open = false;
        current.querySelector('summary').focus();
      } else {
        closeAll();
        nav.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');

        if (matchMedia('(max-width:850px)').matches) {
          button.focus();
        } else {
          nav.querySelector('a').focus();
        }
      }

      event.preventDefault();
    }
  });

  nav.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open) {
        [...details.parentElement.children].forEach(sibling => {
          if (
            sibling !== details &&
            sibling.tagName === 'DETAILS'
          ) {
            sibling.open = false;

            sibling.querySelectorAll('details').forEach(child => {
              child.open = false;
            });
          }
        });
      }
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.header-nav')) {
      closeAll();
    }
  });

  const media = matchMedia('(max-width:850px)');

  media.addEventListener('change', () => {
    closeAll();
    nav.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  });
})();

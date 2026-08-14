(() => {
  const data = window.SKILL_SHELF_DATA || { config: {}, skills: [] };
  const config = data.config || {};
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const order = Array.isArray(config.categoryOrder) ? config.categoryOrder : [];

  const $ = (selector) => document.querySelector(selector);
  const root = $('#skills-root');
  const filters = $('#filters');
  const search = $('#search');
  const status = $('#status');
  const empty = $('#empty-state');
  const template = $('#card-template');
  const dialog = $('#skill-dialog');

  let activeCategory = '全部';
  let activeSkill = null;

  document.title = config.siteTitle || 'My Skills';
  $('#site-title').textContent = config.siteTitle || 'My Skills';
  $('#hero-title').textContent = config.siteTitle || 'My Skills';
  $('#site-subtitle').textContent = config.siteSubtitle || '打开、搜索、一键复制。';

  function categoryRank(name) {
    const i = order.indexOf(name);
    return i === -1 ? 999 : i;
  }

  function categories() {
    return [...new Set(skills.map((s) => s.category || '其他'))]
      .sort((a, b) => categoryRank(a) - categoryRank(b) || a.localeCompare(b, 'zh-CN'));
  }

  function normalize(text) {
    return String(text || '').toLocaleLowerCase('zh-CN');
  }

  function matches(skill, query) {
    if (activeCategory !== '全部' && skill.category !== activeCategory) return false;
    if (!query) return true;
    const haystack = [skill.title, skill.description, skill.category, ...(skill.tags || []), skill.content]
      .map(normalize).join('\n');
    return haystack.includes(normalize(query));
  }

  async function copyText(text, button, doneLabel = '已复制') {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    if (!button) return;
    const old = button.textContent;
    button.textContent = '✓ ' + doneLabel;
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = old;
      button.classList.remove('copied');
    }, 1300);
  }

  function makeTag(tag) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    return span;
  }

  function openSkill(skill, pushHash = true) {
    activeSkill = skill;
    $('#dialog-category').textContent = skill.category || '其他';
    $('#dialog-title').textContent = skill.title;
    $('#dialog-description').textContent = skill.description || '';
    $('#dialog-content').textContent = skill.content || '';
    const tags = $('#dialog-tags');
    tags.replaceChildren(...(skill.tags || []).map(makeTag));
    if (!dialog.open) dialog.showModal();
    if (pushHash) history.replaceState(null, '', `#${encodeURIComponent(skill.slug)}`);
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
    activeSkill = null;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }

  function createCard(skill) {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.skill-card');
    card.dataset.slug = skill.slug;
    node.querySelector('.category-pill').textContent = skill.category || '其他';
    node.querySelector('.card-title').textContent = skill.title;
    node.querySelector('.card-description').textContent = skill.description || '';
    node.querySelector('.card-preview').textContent = skill.content || '';
    const tags = node.querySelector('.card-tags');
    tags.replaceChildren(...(skill.tags || []).slice(0, 3).map(makeTag));

    const copy = node.querySelector('.copy-button');
    copy.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(skill.content || '', copy);
    });
    node.querySelector('.card-open').addEventListener('click', () => openSkill(skill));
    node.querySelector('.view-button').addEventListener('click', () => openSkill(skill));
    return node;
  }

  function renderFilters() {
    const all = ['全部', ...categories()];
    filters.replaceChildren(...all.map((category) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-button' + (category === activeCategory ? ' active' : '');
      btn.textContent = category;
      btn.addEventListener('click', () => {
        activeCategory = category;
        renderFilters();
        render();
      });
      return btn;
    }));
  }

  function render() {
    const query = search.value.trim();
    const visible = skills.filter((skill) => matches(skill, query));
    status.textContent = `共 ${visible.length} 个 Skill${query ? ` · 搜索“${query}”` : ''}`;
    root.replaceChildren();
    empty.hidden = visible.length !== 0;
    if (!visible.length) return;

    const grouped = new Map();
    visible.forEach((skill) => {
      const cat = skill.category || '其他';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push(skill);
    });

    [...grouped.entries()]
      .sort(([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b, 'zh-CN'))
      .forEach(([category, items]) => {
        const section = document.createElement('section');
        section.className = 'category-section';
        section.id = 'category-' + category;
        const head = document.createElement('div');
        head.className = 'category-header';
        const title = document.createElement('h2');
        title.textContent = category;
        const count = document.createElement('span');
        count.className = 'category-count';
        count.textContent = `${items.length} 项`;
        head.append(title, count);
        const grid = document.createElement('div');
        grid.className = 'card-grid';
        items.forEach((skill) => grid.appendChild(createCard(skill)));
        section.append(head, grid);
        root.appendChild(section);
      });
  }

  search.addEventListener('input', render);
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search && !dialog.open) {
      e.preventDefault();
      search.focus();
    }
    if (e.key === 'Escape' && dialog.open) closeDialog();
  });

  $('#dialog-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });
  $('#dialog-copy').addEventListener('click', (e) => activeSkill && copyText(activeSkill.content || '', e.currentTarget));
  $('#dialog-link').addEventListener('click', (e) => activeSkill && copyText(location.href, e.currentTarget, '链接已复制'));

  const themeToggle = $('#theme-toggle');
  const savedTheme = localStorage.getItem('skill-shelf-theme');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('skill-shelf-theme', next);
  });

  renderFilters();
  render();

  if (location.hash) {
    const slug = decodeURIComponent(location.hash.slice(1));
    const skill = skills.find((s) => s.slug === slug);
    if (skill) openSkill(skill, false);
  }
})();

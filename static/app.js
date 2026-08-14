(() => {
  const data = window.SKILL_SHELF_DATA || { config: {}, skills: [] };
  const config = data.config || {};
  const skills = Array.isArray(data.skills) ? data.skills : [];

  const $ = (selector) => document.querySelector(selector);
  const root = $('#skills-root');
  const search = $('#search');
  const empty = $('#empty-state');
  const template = $('#card-template');
  const dialog = $('#skill-dialog');

  let activeSkill = null;

  const FAV_KEY = 'skill-shelf-favs';
  let favs;
  try { favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch { favs = new Set(); }

  function toggleFav(slug) {
    if (favs.has(slug)) favs.delete(slug); else favs.add(slug);
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch { /* 存储不可用时忽略 */ }
    render();
  }

  function highlightText(text, query) {
    if (!query) return [document.createTextNode(String(text || ''))];
    const source = String(text || '');
    const lower = source.toLocaleLowerCase('zh-CN');
    const needle = query.toLocaleLowerCase('zh-CN');
    const nodes = [];
    let i = 0;
    while (true) {
      const hit = lower.indexOf(needle, i);
      if (hit === -1) {
        nodes.push(document.createTextNode(source.slice(i)));
        break;
      }
      if (hit > i) nodes.push(document.createTextNode(source.slice(i, hit)));
      const mark = document.createElement('mark');
      mark.textContent = source.slice(hit, hit + query.length);
      nodes.push(mark);
      i = hit + query.length;
    }
    return nodes;
  }

  document.title = config.siteTitle || 'My Skills';

  function normalize(text) {
    return String(text || '').toLocaleLowerCase('zh-CN');
  }

  function matches(skill, query) {
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
    dialog.dataset.category = skill.category || '其他';
    $('#dialog-category').textContent = skill.category || '其他';
    const query = search.value.trim();
    $('#dialog-title').replaceChildren(...highlightText(skill.title || '', query));
    $('#dialog-content').replaceChildren(...highlightText(skill.content || '', query));
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
    card.dataset.category = skill.category || '其他';
    const query = search.value.trim();

    const title = node.querySelector('.card-title');
    title.replaceChildren(...highlightText(skill.title || '', query));
    const preview = node.querySelector('.card-preview');
    preview.replaceChildren(...highlightText(skill.content || '', query));

    const fav = node.querySelector('.fav-button');
    const isFav = favs.has(skill.slug);
    fav.classList.toggle('active', isFav);
    fav.textContent = isFav ? '★' : '☆';
    fav.setAttribute('aria-label', isFav ? '取消收藏' : '收藏');
    fav.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFav(skill.slug);
    });

    const copy = node.querySelector('.copy-button');
    copy.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(skill.content || '', copy);
    });
    node.querySelector('.card-open').addEventListener('click', () => openSkill(skill));
    return node;
  }

  function render() {
    const query = search.value.trim();
    const ranked = [...skills].sort(
      (a, b) => (favs.has(a.slug) ? 0 : 1) - (favs.has(b.slug) ? 0 : 1)
    );
    const visible = ranked.filter((skill) => matches(skill, query));
    root.replaceChildren();
    empty.hidden = visible.length !== 0;
    if (!visible.length) return;

    const favSkills = visible.filter((s) => favs.has(s.slug));
    const otherSkills = visible.filter((s) => !favs.has(s.slug));
    const split = favSkills.length > 0 && otherSkills.length > 0;
    document.body.classList.toggle('layout-with-favs', split);
    if (split) {
      root.className = '';
      const layout = document.createElement('div');
      layout.className = 'skills-layout';
      const favGrid = document.createElement('div');
      favGrid.className = 'card-grid fav-column';
      favSkills.forEach((s) => favGrid.appendChild(createCard(s)));
      const otherGrid = document.createElement('div');
      otherGrid.className = 'card-grid';
      otherSkills.forEach((s) => otherGrid.appendChild(createCard(s)));
      layout.append(favGrid, otherGrid);
      root.appendChild(layout);
    } else {
      root.className = 'card-grid';
      visible.forEach((skill) => root.appendChild(createCard(skill)));
    }
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

  const themeToggle = $('#theme-toggle');
  const savedTheme = localStorage.getItem('skill-shelf-theme');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('skill-shelf-theme', next);
  });

  render();

  if (location.hash) {
    const slug = decodeURIComponent(location.hash.slice(1));
    const skill = skills.find((s) => s.slug === slug);
    if (skill) openSkill(skill, false);
  }
})();

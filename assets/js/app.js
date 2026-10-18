(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = {
    catalog: [],
    category: 'all',
    type: 'all',
    query: '',
    sort: 'featured',
    favoritesOnly: false,
    favorites: loadFavorites(),
  };
  let toastTimer;

  function loadFavorites() {
    try {
      const parsed = JSON.parse(localStorage.getItem('luavang:favorites') || '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []);
    } catch {
      return new Set();
    }
  }

  function persistFavorites() {
    try {
      localStorage.setItem('luavang:favorites', JSON.stringify([...state.favorites]));
    } catch {
      showToast('Trình duyệt không cho phép lưu danh sách trên thiết bị này.');
    }
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function formatCategory(category) {
    const labels = {
      all: 'Tất cả', heart: 'Trái tim', love: 'Tình yêu', couple: 'Cặp đôi',
      cards: 'Thiệp', birthday: 'Sinh nhật', tools: 'App / Tool / Game', other: 'Khác'
    };
    return labels[category] || 'Khám phá';
  }

  function formatType(type) {
    return ({ web: 'Web app', website: 'Website', game: 'App / Game' })[type] || 'Trải nghiệm';
  }

  function productMatches(product) {
    if (state.category !== 'all' && product.category !== state.category) return false;
    if (state.type !== 'all' && product.type !== state.type) return false;
    if (state.favoritesOnly && !state.favorites.has(product.id)) return false;
    if (state.query) {
      const haystack = [product.name, product.description, product.label, ...(product.tags || [])].join(' ').toLocaleLowerCase('vi');
      if (!haystack.includes(state.query.toLocaleLowerCase('vi'))) return false;
    }
    return true;
  }

  function getFilteredProducts() {
    const list = state.catalog.filter(productMatches);
    list.sort((a, b) => {
      if (state.sort === 'name') return a.name.localeCompare(b.name, 'vi');
      if (state.sort === 'newest') return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
    return list;
  }

  function cardMarkup(product) {
    const saved = state.favorites.has(product.id);
    const tone = /^[a-z-]+$/.test(product.tone || '') ? product.tone : 'lilac';
    return `
      <article class="product-card" data-product-id="${escapeHTML(product.id)}">
        <div class="card-visual tone-${escapeHTML(tone)}" role="img" aria-label="Minh họa ${escapeHTML(product.name)}">
          <span class="card-visual-label">LUAVANG / EXPLORE</span>
          <span class="card-glyph" aria-hidden="true">${escapeHTML(product.icon || '✦')}</span>
          <span class="card-type-mark" aria-hidden="true">${product.type === 'website' ? '↗' : product.type === 'game' ? '▷' : '⌘'}</span>
        </div>
        <button class="favorite-button ${saved ? 'is-saved' : ''}" type="button" data-favorite="${escapeHTML(product.id)}" aria-label="${saved ? 'Bỏ lưu' : 'Lưu'} ${escapeHTML(product.name)}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button>
        <div class="card-content">
          <div class="card-meta"><span class="card-type">${escapeHTML(formatType(product.type))}</span><span class="demo-badge">Mẫu minh họa</span></div>
          <h3>${escapeHTML(product.name)}</h3>
          <p class="card-description">${escapeHTML(product.description)}</p>
          <div class="card-footer"><span class="card-label">${escapeHTML(product.label || formatCategory(product.category))}</span><button class="card-open" type="button" data-open-product="${escapeHTML(product.id)}">Khám phá <span aria-hidden="true">↗</span></button></div>
        </div>
      </article>`;
  }

  function updateCounts() {
    $$('[data-saved-count]').forEach(node => { node.textContent = String(state.favorites.size); });
    const types = {
      all: state.catalog.length,
      web: state.catalog.filter(item => item.type === 'web').length,
      website: state.catalog.filter(item => item.type === 'website').length,
      game: state.catalog.filter(item => item.type === 'game').length,
    };
    Object.entries(types).forEach(([key, count]) => {
      const node = $(`[data-type-count="${key}"]`);
      if (node) node.textContent = String(count);
    });
  }

  function renderCatalog() {
    const grid = $('[data-product-grid]');
    const empty = $('[data-empty-state]');
    const summary = $('[data-result-summary]');
    const heading = $('[data-catalog-heading]');
    if (!grid) return;

    const products = getFilteredProducts();
    grid.innerHTML = products.map(cardMarkup).join('');
    grid.setAttribute('aria-busy', 'false');
    empty.hidden = products.length !== 0;
    grid.hidden = products.length === 0;

    if (state.favoritesOnly) heading.textContent = 'Những điều bạn đã lưu';
    else if (state.query) heading.textContent = 'Kết quả khám phá';
    else if (state.category !== 'all') heading.textContent = `Khám phá: ${formatCategory(state.category)}`;
    else heading.textContent = 'Điều đáng để khám phá';

    summary.textContent = `${products.length} ${products.length === 1 ? 'trải nghiệm' : 'trải nghiệm'}${state.favoritesOnly ? ' trong danh sách đã lưu' : ''}`;
    updateCounts();
  }

  function setCategory(category) {
    state.category = category;
    state.favoritesOnly = false;
    $$('[data-category]').forEach(button => {
      const active = button.dataset.category === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderCatalog();
  }

  function setType(type) {
    state.type = type;
    $$('[data-type]').forEach(button => {
      const active = button.dataset.type === type;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderCatalog();
  }

  function showToast(message) {
    const toast = $('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2700);
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
      showToast('Đã bỏ khỏi danh sách đã lưu.');
    } else {
      state.favorites.add(id);
      showToast('Đã lưu vào danh sách của bạn.');
    }
    persistFavorites();
    renderCatalog();
  }

  function openFavorites() {
    state.favoritesOnly = true;
    state.category = 'all';
    state.type = 'all';
    state.query = '';
    $('#search-input').value = '';
    $$('[data-category]').forEach(button => {
      const active = button.dataset.category === 'all';
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    setType('all');
    renderCatalog();
    $('#catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#mobile-nav').hidden = true;
    $('.mobile-menu-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function openDetail(id) {
    const product = state.catalog.find(item => item.id === id);
    if (!product) return;
    const dialog = $('[data-detail-dialog]');
    const content = $('[data-detail-content]');
    const tone = /^[a-z-]+$/.test(product.tone || '') ? product.tone : 'lilac';
    const tags = Array.isArray(product.tags) ? product.tags : [];
    const url = typeof product.url === 'string' ? product.url.trim() : '';
    const safeURL = url && /^https?:\/\//i.test(url) ? url : '';
    content.innerHTML = `
      <div class="detail-visual tone-${escapeHTML(tone)}"><span class="card-glyph" aria-hidden="true">${escapeHTML(product.icon || '✦')}</span></div>
      <div class="detail-body">
        <div class="card-meta"><span class="card-type">${escapeHTML(formatType(product.type))}</span><span class="demo-badge">${product.demo ? 'Mẫu minh họa' : 'Đã cấu hình'}</span></div>
        <h2 id="detail-title">${escapeHTML(product.name)}</h2>
        <p>${escapeHTML(product.description)}</p>
        <div class="detail-tag-list">${tags.map(tag => `<span class="detail-tag">#${escapeHTML(tag)}</span>`).join('')}</div>
        ${safeURL ? '<p class="detail-notice">Liên kết được cấu hình cho trải nghiệm này. Hãy kiểm tra tên miền trước khi nhập thông tin cá nhân.</p>' : '<p class="detail-notice">Đây là dữ liệu mẫu để kiểm tra giao diện và bộ lọc. Chưa có liên kết sản phẩm thật nên nút mở trải nghiệm sẽ chưa xuất hiện. Hãy cập nhật trường <code>url</code> trong <code>data/catalog.json</code> khi có đích đến hợp lệ.</p>'}
        <div class="detail-actions">
          ${safeURL ? `<a class="button button-primary" href="${escapeHTML(safeURL)}" target="_blank" rel="noopener noreferrer">Mở trải nghiệm ↗</a>` : '<button class="button button-primary" type="button" data-demo-notice>Nội dung đang cập nhật</button>'}
          <button class="button button-outline" type="button" data-favorite="${escapeHTML(product.id)}" aria-pressed="${state.favorites.has(product.id)}">${state.favorites.has(product.id) ? '♥ Đã lưu' : '♡ Lưu trải nghiệm'}</button>
        </div>
      </div>`;
    if (!dialog.open) dialog.showModal();
  }

  async function copyCurrentURL() {
    const field = $('[data-copy-feedback]');
    const text = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temporary = document.createElement('textarea');
        temporary.value = text;
        temporary.setAttribute('readonly', '');
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.appendChild(temporary);
        temporary.select();
        const copied = document.execCommand('copy');
        temporary.remove();
        if (!copied) throw new Error('Copy unavailable');
      }
      if (field) field.textContent = 'Đã sao chép địa chỉ trang.';
    } catch {
      if (field) field.textContent = `Địa chỉ trang: ${text}`;
    }
  }

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('luavang:theme', next); } catch { /* Preference remains for this session. */ }
    showToast(next === 'dark' ? 'Đã bật giao diện tối.' : 'Đã bật giao diện sáng.');
  }

  function loadTheme() {
    try {
      const saved = localStorage.getItem('luavang:theme');
      if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
    } catch { /* Use the default theme. */ }
  }

  function clearFilters() {
    state.query = '';
    state.favoritesOnly = false;
    $('#search-input').value = '';
    $('#sort-select').value = 'featured';
    state.sort = 'featured';
    setCategory('all');
    setType('all');
    $('#search-input').focus();
  }

  function bindEvents() {
    $$('[data-category]').forEach(button => button.addEventListener('click', () => setCategory(button.dataset.category)));
    $$('[data-type]').forEach(button => button.addEventListener('click', () => setType(button.dataset.type)));

    $('#search-input').addEventListener('input', event => {
      state.query = event.currentTarget.value.trim();
      state.favoritesOnly = false;
      renderCatalog();
    });
    $('#sort-select').addEventListener('change', event => {
      state.sort = event.currentTarget.value;
      renderCatalog();
    });
    $('[data-clear-filters]').addEventListener('click', clearFilters);
    $$('[data-show-favorites]').forEach(button => button.addEventListener('click', openFavorites));
    $$('[data-open-support]').forEach(button => button.addEventListener('click', () => {
      $('#mobile-nav').hidden = true;
      $('.mobile-menu-toggle').setAttribute('aria-expanded', 'false');
      const dialog = $('[data-support-dialog]');
      if (!dialog.open) dialog.showModal();
    }));
    $('[data-support-copy]').addEventListener('click', copyCurrentURL);
    $('.theme-toggle').addEventListener('click', toggleTheme);

    $('.mobile-menu-toggle').addEventListener('click', event => {
      const menu = $('#mobile-nav');
      menu.hidden = !menu.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!menu.hidden));
    });
    $$('#mobile-nav a').forEach(link => link.addEventListener('click', () => {
      $('#mobile-nav').hidden = true;
      $('.mobile-menu-toggle').setAttribute('aria-expanded', 'false');
    }));

    document.addEventListener('click', event => {
      const favorite = event.target.closest('[data-favorite]');
      if (favorite) {
        event.preventDefault();
        toggleFavorite(favorite.dataset.favorite);
        const detail = $('[data-detail-dialog]');
        if (detail?.open) openDetail(favorite.dataset.favorite);
        return;
      }
      const opener = event.target.closest('[data-open-product]');
      if (opener) openDetail(opener.dataset.openProduct);
      if (event.target.closest('[data-demo-notice]')) showToast('Thêm liên kết thật vào data/catalog.json để bật trải nghiệm.');
    });

    document.addEventListener('keydown', event => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const active = document.activeElement;
        if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
        event.preventDefault();
        $('#search-input').focus();
      }
      if (event.key === 'Escape') {
        $('#mobile-nav').hidden = true;
        $('.mobile-menu-toggle').setAttribute('aria-expanded', 'false');
      }
    });
  }

  async function init() {
    loadTheme();
    $('[data-year]').textContent = String(new Date().getFullYear());
    bindEvents();
    try {
      const response = await fetch('/data/catalog.json', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new TypeError('Catalog should be an array');
      state.catalog = payload.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string');
      renderCatalog();
    } catch (error) {
      console.error('[LUAVANG] Could not load catalog:', error);
      $('[data-product-grid]').hidden = true;
      $('[data-product-grid]').setAttribute('aria-busy', 'false');
      $('[data-empty-state]').hidden = false;
      $('[data-result-summary]').textContent = 'Không tải được dữ liệu bộ sưu tập.';
      $('[data-empty-state] h3').textContent = 'Chưa thể tải bộ sưu tập';
      $('[data-empty-state] p').textContent = 'Kiểm tra tệp data/catalog.json hoặc tải lại trang.';
    }
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();

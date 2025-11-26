// Functional, debounced search for /api/medicines/search
(function () {
  const API = window.MediFind?.API_URL || 'http://localhost:8000/api';
  // updated to use products endpoint for user page
  const SEARCH_ENDPOINT = `${API}/products/search`;
  const input = document.getElementById('product-search');
  const btn = document.getElementById('search-btn');
  const resultsEl = document.getElementById('search-results');
  const feedbackEl = document.getElementById('search-feedback');

  function showLoading() {
    feedbackEl.textContent = 'Searching...';
    feedbackEl.className = 'search-feedback loading';
  }

  function showMessage(msg) {
    feedbackEl.textContent = msg;
    feedbackEl.className = 'search-feedback';
  }

  function renderCard(p) {
    return `
      <article class="product-card">
        <div class="card-left">
          <div class="product-title">${escapeHtml(p.name)}</div>
          <div class="product-sub muted">${escapeHtml(p.composition_short || '')}</div>
          <div class="product-meta muted">${escapeHtml(p.manufacturer || '')}</div>
          <div class="keywords muted">${(p.keywords || []).slice(0,5).map(k => escapeHtml(k)).join(', ')}</div>
        </div>
        <div class="card-right">
          ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" class="product-image"/>` : ''}
          <div class="prescription ${p.is_prescription_required ? 'required' : 'not-required'}">
            ${p.is_prescription_required ? 'Prescription required' : 'OTC'}
          </div>
        </div>
      </article>
    `;
  }

  function escapeHtml(str = '') {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function fetchSearch(q) {
    if (!q) {
      resultsEl.innerHTML = '';
      showMessage('Type anything above and press Search or Enter');
      return;
    }
    showLoading();
    resultsEl.innerHTML = '';
    try {
      const res = await fetch(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const { results } = await res.json();
      if (!results || results.length === 0) {
        resultsEl.innerHTML = `<div class="placeholder">No results for <strong>${escapeHtml(q)}</strong></div>`;
        showMessage('0 results');
        return;
      }
      resultsEl.innerHTML = results.map(renderCard).join('');
      showMessage(`${results.length} result${results.length > 1 ? 's' : ''}`);
    } catch (err) {
      resultsEl.innerHTML = `<div class="placeholder">Search failed — try again</div>`;
      showMessage('Search failed');
      // eslint-disable-next-line no-console
      console.error('search error', err);
    }
  }

  // Simple debounce
  function debounce(fn, wait = 350) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  const debouncedFetch = debounce((q) => fetchSearch(q), 350);

  document.addEventListener('DOMContentLoaded', () => {
    showMessage('Type a medicine name and press enter');

    if (!input || !btn || !resultsEl) return;

    btn.addEventListener('click', () => {
      fetchSearch(input.value.trim());
    });

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (!q) {
        showMessage('Type anything to search');
        resultsEl.innerHTML = '';
        return;
      }
      debouncedFetch(q);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchSearch(input.value.trim());
      }
    });
  });
})();
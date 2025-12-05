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
    const title = p.name || 'Unknown';
    const manufacturer = p.manufacturer || 'Generic';
    const composition = p.composition || '';
    const uses = p.uses ? p.uses.split(' ').slice(0, 4).join(' ') + '...' : ''; // Show first few words
    const imageSrc = p.image_url || 'https://via.placeholder.com/150';
    const price = p.price || 0;
    const productId = p._id || p.id;

    return `
      <article class="medicine-card" style="display: flex; flex-direction: column; height: 100%;">
        <a href="product.html?id=${productId}" style="text-decoration: none; color: inherit; flex-grow: 1;">
            <div style="text-align: center; margin-bottom: 15px;">
                 <img src="${imageSrc}" alt="${escapeHtml(title)}" style="height: 140px; object-fit: contain; width: 100%;">
            </div>

            <div>
                <div class="product-title" style="font-weight: 700; color: #30363c; font-size: 16px; margin-bottom: 5px;">
                    ${escapeHtml(title)}
                </div>
                
                <div class="muted" style="font-size: 12px; margin-bottom: 8px;">
                    By ${escapeHtml(manufacturer)}
                </div>

                ${composition ? `
                <div style="font-size: 11px; color: #555; background: #f0f4ff; padding: 4px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">
                    ${escapeHtml(composition)}
                </div>` : ''}

                ${uses ? `
                <div style="font-size: 11px; color: #666; margin-top: 5px;">
                    <strong>Uses:</strong> ${escapeHtml(uses)}
                </div>` : ''}
            </div>
        </a>

        <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div class="price" style="font-size: 18px; font-weight: 700;">₹${price}</div>
            </div>
            <button class="add-btn" 
                onclick="addToCart('${productId}', '${escapeHtml(title).replace(/'/g, "\\'")}', ${price})"
                style="width: 100%; background: #10847e; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer;">
                ADD TO CART
            </button>
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
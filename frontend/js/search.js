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
    // 1. Handle data inconsistencies (Elasticsearch vs Mongo fields)
    const title = p.display_name || p.name || 'Unknown Product';
    const manufacturer = p.manufacturer_name || p.manufacturer || 'Generic';
    const composition = p.composition_short || p.description || '';
    
    // 2. Generate a price if missing (Mocking for display purposes)
    const price = p.price || p.unit_price || (Math.random() * (50 - 5) + 5).toFixed(2);
    
    // 3. Handle Images (Use placeholder if link is broken or missing)
    // Checking if image_url exists and doesn't contain markdown syntax like [url](url)
    let imageSrc = p.image_url || '';
    if (imageSrc.includes('(')) { 
        // extracting url from markdown format [text](url) if present
        const match = imageSrc.match(/\((.*?)\)/);
        if(match) imageSrc = match[1];
    }
    if (!imageSrc || imageSrc.includes('example.com')) {
        // Default medical placeholder
        imageSrc = 'https://img.freepik.com/free-vector/medical-healthcare-blue-color-cross-background_1017-26807.jpg'; 
    }

    return `
      <article class="medicine-card" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
        <div style="text-align: center; margin-bottom: 15px;">
             <img src="${imageSrc}" alt="${escapeHtml(title)}" style="height: 120px; object-fit: contain; width: 100%; border-radius: 8px;">
        </div>

        <div>
            <div class="product-title" style="font-weight: 700; color: #30363c; font-size: 16px; margin-bottom: 5px; line-height: 1.4;">
                ${escapeHtml(title)}
            </div>
            
            <div class="product-meta muted" style="font-size: 12px; color: #8897a2; margin-bottom: 5px;">
                ${escapeHtml(manufacturer)}
            </div>

            ${composition ? `
            <div class="product-sub muted" style="font-size: 12px; color: #555; background: #f4f7fb; padding: 4px; border-radius: 4px; display: inline-block; margin-bottom: 10px;">
                ${escapeHtml(composition)}
            </div>` : ''}
        </div>

        <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div class="price" style="font-size: 18px; font-weight: 700; color: #30363c;">₹${price}</div>
                <div class="prescription ${p.is_prescription_required ? 'required' : 'not-required'}" 
                     style="font-size: 10px; padding: 2px 6px; border-radius: 4px; ${p.is_prescription_required ? 'background:#ffeaea; color:#d63031;' : 'background:#e3fdfd; color:#00b894;'}">
                    ${p.is_prescription_required ? 'Rx Required' : 'OTC'}
                </div>
            </div>
            <button class="add-btn" 
                onclick="addToCart('${p.id || p._id}', '${escapeHtml(title).replace(/'/g, "\\'")}', ${price}, 'demo_pharmacy')"
                style="width: 100%; background: #10847e; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.3s;">
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
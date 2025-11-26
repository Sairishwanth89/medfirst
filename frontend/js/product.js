(function () {
  const API = window.MediFind?.API_URL || 'http://localhost:8000/api';
  const LIST_ENDPOINT = `${API}/products`;
  const SEARCH_ENDPOINT = `${API}/products/search`;

  function escapeHtml(str = '') {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function fetchProductById(id) {
    const res = await fetch(`${LIST_ENDPOINT}/${id}`);
    if (!res.ok) throw new Error(`Product ${id} not found (status ${res.status})`);
    return res.json();
  }

  function renderProduct(p) {
    const loader = document.getElementById('loader');
    const content = document.getElementById('product-content');
    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'block';

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.innerText = value ?? '';
    };

    setText('crumb-name', p.name);
    setText('p-name', p.name);
    setText('box-name', p.name);
    setText('p-manufacturer', p.manufacturer || 'Generic');

    const price = `₹${Number(p.unit_price ?? 0).toFixed(2)}`;
    setText('p-price', price);
    setText('box-price', price);
    setText('p-mrp', `MRP ₹${(Number(p.unit_price ?? 0) * 1.2).toFixed(2)}`);

    setText('p-desc', p.description || 'No description available.');
    setText('p-benefits', p.benefits || 'Consult your doctor for details.');
    setText('p-use', p.how_to_use || 'Use as directed by your doctor.');

    const addBtn = document.getElementById('add-btn');
    if (addBtn) {
      addBtn.onclick = () => {
        const addToCart = window.MediFind?.addToCart || window.addToCart;
        if (typeof addToCart === 'function') {
          addToCart(p.id ?? p._id, p.name, p.unit_price ?? 0, p.pharmacy_id);
        } else {
          // fallback behavior: store a simple cart in localStorage
          const cart = JSON.parse(localStorage.getItem('cart') || '[]');
          cart.push({ id: p.id ?? p._id, name: p.name, price: p.unit_price ?? 0 });
          localStorage.setItem('cart', JSON.stringify(cart));
          alert('Added to cart');
        }
      };
    }
  }

  async function loadSimilarProducts(name) {
    const container = document.getElementById('similar-container');
    if (!container) return;
    container.innerHTML = '<div class="placeholder">Loading...</div>';
    try {
      const query = (name || '').split(/\s+/)[0] || name || '';
      if (!query) {
        container.innerHTML = '';
        return;
      }
      const res = await fetch(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search request failed');
      const { results } = await res.json();
      const filtered = (results || []).filter(r => !r.name?.includes(name)).slice(0, 6);
      if (!filtered.length) {
        container.innerHTML = '<div class="placeholder">No similar products</div>';
        return;
      }
      container.innerHTML = filtered.map(item => `
        <div class="medicine-card">
          <div class="m-title">${escapeHtml(item.name)}</div>
          <div class="m-manuf">${escapeHtml(item.manufacturer || '')}</div>
          <div class="price">₹${Number(item.unit_price ?? 0).toFixed(2)}</div>
          <a href="product.html?id=${item.id}" class="view-link">View</a>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error loading similar products', err);
      container.innerHTML = '<div class="placeholder">Failed to load similar products</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search || '');
    const productId = urlParams.get('id');
    if (!productId) {
      // no product id — redirect to home
      window.location.href = 'index.html';
      return;
    }

    const loader = document.getElementById('loader');
    if (loader) loader.innerHTML = '<p>Loading product…</p>';

    try {
      const p = await fetchProductById(productId);
      // normalize _id -> id for consistency with other endpoints
      p.id = p.id ?? p._id ?? productId;
      renderProduct(p);
      loadSimilarProducts(p.name || p.display_name || '');
    } catch (err) {
      console.error(err);
      if (loader) loader.innerHTML = '<p>Failed to load product.</p>';
    }
  });
})();
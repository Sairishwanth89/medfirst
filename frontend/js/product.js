(function () {
  const API = window.MediFind?.API_URL || 'http://localhost:8000/api';
  const PRODUCTS_ENDPOINT = `${API}/products`;
  const SEARCH_ENDPOINT = `${API}/products/search`;

  async function fetchProductById(id) {
    const res = await fetch(`${PRODUCTS_ENDPOINT}/${id}`);
    if (!res.ok) throw new Error(`Product not found`);
    return res.json();
  }

  function renderProduct(p) {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('product-content').style.display = 'block';

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.textContent = val || '';
    };

    // Basic Info
    const title = p.name || p.display_name || 'Unknown';
    setText('crumb-name', title);
    setText('p-name', title);
    setText('p-manufacturer', p.manufacturer || p.manufacturer_name || 'Generic');
    setText('p-composition', p.composition || p.composition_short || 'Composition not available');
    
    // Image
    let img = p.image_url || '';
    if(img.includes('(')) img = img.match(/\((.*?)\)/)[1]; // Clean markdown
    if(!img || img.includes('example.com')) img = 'https://img.freepik.com/free-vector/medical-healthcare-blue-color-cross-background_1017-26807.jpg';
    document.getElementById('p-image').src = img;

    // Price
    const price = p.price || p.unit_price || (Math.random() * 45 + 5).toFixed(2);
    setText('p-price', `₹${price}`);

    // Detailed Info
    setText('p-uses', p.uses || 'Consult doctor for uses.');
    
    // Render Side Effects as tags
    const sideEffectsContainer = document.getElementById('p-side-effects');
    if(p.side_effects) {
        sideEffectsContainer.innerHTML = p.side_effects.split(' ')
            .slice(0, 10) // Limit to 10 words/tags for UI
            .map(se => `<span class="side-effect-tag">${se.replace(/,/g, '')}</span>`)
            .join('');
    } else {
        sideEffectsContainer.textContent = 'No specific side effects listed.';
    }

    // Reviews
    if(p.reviews) {
        setText('rev-excellent', `${p.reviews.excellent}%`);
        setText('rev-avg', `${p.reviews.average}%`);
        setText('rev-poor', `${p.reviews.poor}%`);
    }

    // Add to Cart Logic
    const addBtn = document.getElementById('add-btn');
    addBtn.onclick = () => {
        if(window.addToCart) {
            window.addToCart(p.id || p._id, title, price, p.pharmacy_id);
        } else {
            alert('Cart system initializing...');
        }
    };

    return { title, uses: p.uses };
  }

  async function loadSimilarProducts(currentId, queryTerm) {
    const container = document.getElementById('similar-container');
    container.innerHTML = '<div class="placeholder">Loading suggestions...</div>';
    
    try {
        // Search by 'Uses' or Name to find similar items
        const term = queryTerm ? queryTerm.split(' ')[0] : 'medicine';
        const res = await fetch(`${SEARCH_ENDPOINT}?q=${term}`);
        const data = await res.json();
        
        const similar = (data.results || [])
            .filter(item => (item._id || item.id) !== currentId) // Exclude current
            .slice(0, 4); // Take 4

        if(!similar.length) {
            container.innerHTML = '<p style="color:#999;">No similar products found.</p>';
            return;
        }

        container.innerHTML = similar.map(item => {
            const iTitle = item.name || item.display_name;
            const iPrice = item.price || (Math.random()*50).toFixed(2);
            let iImg = item.image_url || '';
            if(!iImg || iImg.includes('example')) iImg = 'https://img.freepik.com/free-vector/medical-healthcare-blue-color-cross-background_1017-26807.jpg';

            return `
            <div class="medicine-card">
                <a href="product.html?id=${item._id || item.id}" style="text-decoration:none; color:inherit;">
                    <div style="height:120px; text-align:center; margin-bottom:10px;">
                        <img src="${iImg}" style="height:100%; object-fit:contain;">
                    </div>
                    <h4 style="font-size:14px; margin-bottom:5px;">${iTitle}</h4>
                    <div class="price" style="font-size:16px;">₹${iPrice}</div>
                </a>
            </div>
            `;
        }).join('');

    } catch(e) { console.error(e); }
  }

  // Init
  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if(!id) { window.location.href = 'index.html'; return; }

    try {
        const product = await fetchProductById(id);
        const { uses } = renderProduct(product.results || product); // Handle API wrapper
        
        // Load similar based on 'Uses' or 'Name'
        loadSimilarProducts(id, uses || product.name);
    } catch(e) {
        console.error(e);
        document.getElementById('loader').innerHTML = 'Product details could not be loaded.';
    }
  });
})();
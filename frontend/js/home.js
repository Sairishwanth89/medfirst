document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.MediFind?.API_URL || 'http://localhost:8000/api';

    const searchInput       = document.getElementById('medicine-query');
    const searchFeedback    = document.getElementById('search-feedback');
    const resultsSection    = document.getElementById('results-section');
    const resultsContainer  = document.getElementById('results-container');
    const loadingSpinner    = document.getElementById('loading');

    // ------------------------
    // 1. LOAD HOME DATA (New / Trending)
    // ------------------------
    loadHomeData();

    async function loadHomeData() {
    try {
        const res = await fetch(`${API_URL}/products?limit=40`);
        if (res.ok) {
            const data = await res.json();
            const products = data.results || data;
            if (products.length > 0) {
                // ⬇️ show more items now
                renderSection('new-launches-container', products.slice(0, 12));
                renderSection('trending-container',      products.slice(12, 32));
                return;
            }
        }
        throw new Error("No API data");
    } catch (err) {
        console.warn("Using CSV Fallback Data", err);
        const csvData = getCSVFallbackData();
        renderSection('new-launches-container', csvData.slice(0, 8));
        renderSection('trending-container',      csvData.slice(8, 16));
    }
}

    function renderSection(elementId, products) {
        const container = document.getElementById(elementId);
        if (!container) return;

        container.innerHTML = products.map(p => `
            <article class="medicine-card" style="cursor: pointer;" onclick="window.location.href='product.html?id=${p.id || p._id}'">
                <div style="height: 150px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px; margin-bottom: 12px; overflow: hidden; position: relative;">
                    <img src="${p.image_url}" 
                         alt="${p.name}" 
                         style="max-height: 90%; max-width: 90%; object-fit: contain;"
                         onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
                </div>
                
                <div style="flex-grow: 1;">
                    <div style="font-size: 10px; color: #64748b; background: #f1f5f9; display: inline-block; padding: 2px 6px; border-radius: 4px; margin-bottom: 5px;">${(p.manufacturer || 'Generic').substring(0, 20)}...</div>
                    <h4 style="margin: 0 0 5px; font-size: 14px; color: #333; line-height: 1.4; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                        ${p.name}
                    </h4>
                    <p style="font-size: 11px; color: #94a3b8; margin: 0; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">
                        ${p.uses || 'Health Product'}
                    </p>
                </div>

                <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                    <span style="font-weight: 700; font-size: 15px; color: #059669;">₹${(p.price || p.unit_price || 0).toFixed(2)}</span>
                    
                    <button class="pe-btn-primary" 
                            style="margin:0; width:auto; padding: 5px 10px; font-size: 12px;"
                            onclick="event.stopPropagation(); addToCart('${p.id || p._id}', '${p.name.replace(/'/g, "\\'")}', ${p.price || p.unit_price || 0})">
                        Add +
                    </button>
                </div>
            </article>
        `).join('');
    }

    // 2. Prescription Modal Logic
    window.openPrescriptionModal = () => document.getElementById('prescription-modal').style.display = 'flex';
    window.closePrescriptionModal = () => document.getElementById('prescription-modal').style.display = 'none';
    
    window.handleFileSelect = (input) => {
        const fileNameEl = document.getElementById('file-name');
        if (input.files.length > 0) {
            fileNameEl.textContent = `Selected: ${input.files[0].name}`;
            fileNameEl.style.color = '#059669';
        }
    };

    window.onclick = (e) => {
        const modal = document.getElementById('prescription-modal');
        if (e.target === modal) closePrescriptionModal();
    };

    
    // ------------------------
    // 2. SEARCH LOGIC (FRONTEND FILTER)
    // ------------------------

    window.handleSearch = async function () {
        if (!searchInput) {
            console.error('Search input #medicine-query not found');
            return;
        }

        const raw = searchInput.value || '';
        const query = raw.trim().toLowerCase();

        if (!query) {
            if (searchFeedback) searchFeedback.textContent = 'Please enter a medicine name.';
            if (resultsSection) resultsSection.style.display = 'none';
            return;
        }

        if (searchFeedback) searchFeedback.textContent = '';
        if (resultsSection) resultsSection.style.display = 'block';
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading-spinner">Searching...</div>';
        }
        if (loadingSpinner) loadingSpinner.style.display = 'block';

        let allProducts = [];

        // Get ALL products (no server-side filtering)
        try {
            const res = await fetch(`${API_URL}/products?limit=200`);
            if (res.ok) {
                const data = await res.json();
                allProducts = data.results || data || [];
            }
        } catch (e) {
            console.warn('API fetch failed, using CSV fallback for search', e);
        }

        if (!allProducts.length) {
            allProducts = getCSVFallbackData();
        }

        const filtered = allProducts.filter(p => {
            const name = (p.name || '').toLowerCase();
            const uses = (p.uses || '').toLowerCase();
            const manu = (p.manufacturer || '').toLowerCase();
            return (
                name.includes(query) ||
                uses.includes(query) ||
                manu.includes(query)
            );
        });

        if (loadingSpinner) loadingSpinner.style.display = 'none';
        renderSearchResults(filtered, raw);
    };

    function renderSearchResults(products, originalQuery) {
        if (!resultsContainer) return;

        if (!products || products.length === 0) {
            resultsContainer.innerHTML = `
                <p style="color:#555;font-size:14px;">
                    No results found for "<strong>${originalQuery}</strong>".
                </p>`;
            if (searchFeedback) {
                searchFeedback.textContent = 'Try checking spelling or searching a different medicine.';
            }
            return;
        }

        if (searchFeedback) {
            searchFeedback.textContent = `Showing ${products.length} result(s) for "${originalQuery}"`;
        }

        resultsContainer.innerHTML = products.map(p => `
            <article class="medicine-card">
                <div style="height:160px;display:flex;align-items:center;justify-content:center;background:#f8f9fa;border-radius:8px;margin-bottom:15px;overflow:hidden;">
                    <img src="${p.image_url}"
                         alt="${p.name}"
                         style="max-height:100%;max-width:100%;object-fit:contain;"
                         onerror="this.src='https://via.placeholder.com/200?text=Medicine'">
                </div>

                <div style="flex-grow:1;">
                    <span class="med-tag" style="background:#e0f2fe;color:#0284c7;padding:2px 8px;border-radius:4px;font-size:11px;">
                        ${p.manufacturer || 'MediFind'}
                    </span>
                    <h4 style="margin:8px 0;font-size:15px;color:#333;">
                        ${p.name}
                    </h4>
                    <p style="font-size:12px;color:#666;margin-bottom:10px;">
                        ${p.uses || ''}
                    </p>
                </div>

                <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;padding-top:10px;">
                    <span style="font-weight:700;font-size:1.1rem;color:#059669;">₹${p.price}</span>
                    <button class="btn-outline"
                            style="padding:6px 12px;font-size:13px;border:1px solid #059669;color:#059669;background:white;border-radius:4px;cursor:pointer;"
                            onclick="addToCart('${p.id}', '${p.name}', ${p.price})">
                        Add <i class="fas fa-plus"></i>
                    </button>
                </div>
            </article>
        `).join('');
    }

    // Enter key also triggers search
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.handleSearch();
            }
        });
    }

    // ------------------------
    // 3. PRESCRIPTION MODAL
    // ------------------------
    window.openPrescriptionModal = () => {
        const modal = document.getElementById('prescription-modal');
        if (modal) modal.style.display = 'flex';
    };

    window.closePrescriptionModal = () => {
        const modal = document.getElementById('prescription-modal');
        if (modal) modal.style.display = 'none';
    };

    window.handleFileSelect = (input) => {
        const fileNameEl = document.getElementById('file-name');
        if (input.files.length > 0 && fileNameEl) {
            fileNameEl.textContent = `Selected: ${input.files[0].name}`;
            fileNameEl.style.color = 'green';
        }
    };

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('prescription-modal');
        if (modal && e.target === modal) window.closePrescriptionModal();
    });
    // Carousel scroll helper – used by the left/right buttons in index.html
    window.scrollCarousel = (id, direction) => {
    const container = document.getElementById(id);
    if (!container) return;
    const scrollAmount = 280;
    container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
};

    // ------------------------
    // 4. CSV FALLBACK DATA
    // ------------------------
    function getCSVFallbackData() {
        return [
            { id: 'm1', name: "Avastin 400mg Injection", manufacturer: "Roche Products India Pvt Ltd", price: 32000.00, uses: "Cancer Treatment", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/f5a26c491e4d48199ab116a69a969be3.jpg" },
            { id: 'm2', name: "Augmentin 625 Duo Tablet", manufacturer: "GlaxoSmithKline", price: 223.42, uses: "Bacterial infections", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/wy2y9bdipmh6rgkrj0zm.jpg" },
            { id: 'm3', name: "Azithral 500 Tablet", manufacturer: "Alembic Pharma", price: 132.40, uses: "Bacterial infections", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/kqkouvaqejbyk47dvjfu.jpg" },
            { id: 'm4', name: "Ascoril LS Syrup", manufacturer: "Glenmark Pharma", price: 118.00, uses: "Cough with mucus", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/3205599cc49d4073ae66cbb0dbfded86.jpg" },
            { id: 'm5', name: "Aciloc 150 Tablet", manufacturer: "Cadila Pharma", price: 45.34, uses: "Acid reflux, Peptic ulcer", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/pn7apngctvrtweencwi1.jpg" },
            { id: 'm6', name: "Avil 25 Tablet", manufacturer: "Sanofi India", price: 10.97, uses: "Allergies", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/mmsye6bf97tkcocat24j.jpg" },
            { id: 'm7', name: "Allegra 120mg Tablet", manufacturer: "Sanofi India", price: 218.66, uses: "Allergic conditions", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/fa7427131ec64163b5bbafb529df0736.jpg" },
            { id: 'm8', name: "Atarax 25mg Tablet", manufacturer: "Dr Reddy's", price: 86.50, uses: "Anxiety, Itching", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/v9py58kciridvbi7bqls.jpg" },
            { id: 'm9', name: "Anovate Cream", manufacturer: "USV Ltd", price: 145.00, uses: "Piles treatment", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/gnsem6ircqxmwmjkprkw.jpg" },
            { id: 'm10', name: "Alex Syrup", manufacturer: "Glenmark Pharma", price: 128.50, uses: "Dry cough", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/mqdfwomjrjv3lvlq08ae.jpg" },
            { id: 'm11', name: "Arkamin Tablet", manufacturer: "Torrent Pharma", price: 62.40, uses: "High blood pressure", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/kvdgswy8eyzkwmulwlyf.jpg" },
            { id: 'm12', name: "Aldigesic-SP Tablet", manufacturer: "Alkem Labs", price: 115.00, uses: "Pain relief", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/86cc6259fcc8462f876cdeb85d9aa87d.jpg" },
            { id: 'm13', name: "Asthalin Syrup", manufacturer: "Cipla Ltd", price: 22.00, uses: "Asthma, COPD", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/45fbf90154794c7dae0630d5c201f368.jpg" },
            { id: 'm14', name: "Azee 500 Tablet", manufacturer: "Cipla Ltd", price: 132.00, uses: "Bacterial infections", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/jbpnjvst3ph0xnrq199o.jpg" },
            { id: 'm15', name: "Betadine 2% Gargle", manufacturer: "Win-Medicare", price: 160.00, uses: "Sore throat", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/rvdebdxaajeckalhwlyh.jpg" },
            { id: 'm16', name: "Calpol 650mg", manufacturer: "GSK", price: 30.50, uses: "Fever, Pain", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/d1b5d11ee8ba4b68a6a5c6f1c872dbfc.jpg" },
            { id: 'm17', name: "Dolo 650 Tablet", manufacturer: "Micro Labs", price: 33.00, uses: "Fever, Pain", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/rn8ixatnbt4vrz5nr842.jpg" },
            { id: 'm18', name: "Zestasil 100 Tablet", manufacturer: "TBG pharma", price: 120.00, uses: "Erectile dysfunction", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/qmxopz9yrmnuwdjmv3lj.jpg" },
            { id: 'm19', name: "Zedruff Shampoo", manufacturer: "Cipla", price: 195.00, uses: "Dandruff", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/blxexvdro4jxtxn5irh3.jpg" }
        ];
    }
});
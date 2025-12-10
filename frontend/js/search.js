document.addEventListener('DOMContentLoaded', () => {
    // 1. Match IDs from your HTML
    const searchInput = document.getElementById('medicine-query') || document.getElementById('product-search');
    const resultsContainer = document.getElementById('search-results');
    const API_URL = window.MediFind?.API_URL || 'http://localhost:8000/api';

    // 2. Global handleSearch
    window.handleSearch = async () => {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if (query.length > 0) {
            await performSearch(query);
        }
    };

    // 3. Real-time typing listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 1) {
                performSearch(query);
            } else {
                if (resultsContainer) {
                    resultsContainer.style.display = 'none';
                    resultsContainer.innerHTML = '';
                }
            }
        });

        // Hide when clicking outside
        document.addEventListener('click', (e) => {
            if (resultsContainer && !searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.style.display = 'none';
            }
        });
    }

    async function performSearch(query) {
        try {
            // A. Try Backend Search (Now Enabled)
            const res = await fetch(`${API_URL}/products/search?q=${query}`);
            if (res.ok) {
                const data = await res.json();
                displayResults(data.results || []);
                return;
            }

            // B. Fallback (If backend fails)
            console.warn("Backend search failed, using local");
            const localData = getLocalMedicines();
            const filtered = localData.filter(item =>
                item.name.toLowerCase().includes(query.toLowerCase()) ||
                item.uses.toLowerCase().includes(query.toLowerCase())
            );

            displayResults(filtered);

        } catch (err) {
            console.error(err);
        }
    }

    function displayResults(products) {
        if (!resultsContainer) return;

        if (products.length === 0) {
            resultsContainer.innerHTML = '<div style="padding:15px; color:#666; text-align:center;">No medicines found.</div>';
            resultsContainer.style.display = 'block';
            return;
        }

        resultsContainer.innerHTML = products.slice(0, 6).map(p => {
            const productId = p.id || p._id;
            const safeName = p.name.replace(/'/g, "\\'"); // Escape quotes for JS

            return `
            <div class="search-item" 
                 onclick="window.location.href='product.html?id=${productId}'" 
                 style="display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;">
                
                <img src="${p.image_url}" 
                     onerror="this.src='https://via.placeholder.com/50?text=Rx'" 
                     style="width: 50px; height: 50px; object-fit: contain; border: 1px solid #eee; border-radius: 6px; background:white;">
                
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 4px; font-size: 15px; color: #333;">${p.name}</h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">${p.uses}</p>
                </div>
                
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                    <span style="font-weight: 700; color: #059669;">₹${(p.price || p.unit_price).toFixed(2)}</span>
                    
                    <button class="pe-btn-primary" 
                            style="margin:0; padding: 4px 10px; font-size: 11px; width: auto;"
                            onclick="event.stopPropagation(); addToCart('${productId}', '${safeName}', ${p.price || p.unit_price})">
                        ADD
                    </button>
                </div>
            </div>
            `;
        }).join('');

        resultsContainer.style.display = 'block';
    }

    // --- DATA FROM CSV (Must match home.js for consistency) ---
    function getLocalMedicines() {
        return [
            { id: 'm1', name: "Avastin 400mg Injection", manufacturer: "Roche Products", price: 32000.00, uses: "Cancer Treatment", image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/f5a26c491e4d48199ab116a69a969be3.jpg" },
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
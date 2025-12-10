document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Product ID from URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        alert("Product not found");
        window.location.href = 'index.html';
        return;
    }

    const loader = document.getElementById('loader');
    const content = document.getElementById('product-content');

    try {
        // 2. Fetch Product Details
        // Try accessing via API first
        console.log("Fetching product:", productId);
        let product = null;

        // MOCK DATA FALLBACK for Cart Recommendations (m1..m4, r1..r4)
        const mockDb = {
            'm1': { name: "Augmentin 625 Duo Tablet", manufacturer: "GlaxoSmithKline", unit_price: 223.42, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/wy2y9bdipmh6rgkrj0zm.jpg", uses: "Bacterial infections", composition: "Amoxycillin (500mg) + Clavulanic Acid (125mg)" },
            'm2': { name: "Azithral 500 Tablet", manufacturer: "Alembic Pharma", unit_price: 132.40, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/kqkouvaqejbyk47dvjfu.jpg", uses: "Respiratory tract infection", composition: "Azithromycin (500mg)" },
            'm3': { name: "Ascoril LS Syrup", manufacturer: "Glenmark Pharma", unit_price: 118.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/3205599cc49d4073ae66cbb0dbfded86.jpg", uses: "Cough with mucus", composition: "Ambroxol + Levosalbutamol + Guaifenesin" },
            'm4': { name: "Aciloc 150 Tablet", manufacturer: "Cadila Pharma", unit_price: 45.34, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/pn7apngctvrtweencwi1.jpg", uses: "Acid reflux", composition: "Ranitidine (150mg)" },
            'r1': { name: "Horlicks Health Drink", manufacturer: "GSK", unit_price: 450.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/f4e66d25-7833-488f-97a6-42f022a1562b.png", uses: "Nutrition", composition: "Malted Milk" },
            'r2': { name: "Dettol Antiseptic Liquid", manufacturer: "Reckitt Benckiser", unit_price: 180.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/d4b31c93-68d7-463d-888e-6c03975001c4.jpg", uses: "First Add", composition: "Chloroxylenol" },
            'r3': { name: "Ensure Diabetes Care", manufacturer: "Abbott", unit_price: 1100.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/b62153a7-33b8-479c-9c71-332d431c463f.jpg", uses: "Diabetes Nutrition", composition: "Protein + Complex Carbs" },
            'r4': { name: "Shelcal 500 Tablet", manufacturer: "Torrent Pharma", unit_price: 110.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/ba246679-0524-4f9e-9904-486162383d47.jpg", uses: "Calcium deficiency", composition: "Calcium + Vit D3" }
        };

        if (mockDb[productId]) {
            console.log("Using Mock Data for", productId);
            product = { _id: productId, ...mockDb[productId] };
        } else {
            const res = await fetch(`${window.MediFind.API_URL}/products/${productId}`);
            if (res.ok) {
                const data = await res.json();
                product = data.results || data;
            } else {
                console.warn("API fetch failed");
            }
        }

        if (!product) throw new Error("Product data unavailable");

        // 3. Render Details
        document.getElementById('p-name').textContent = product.name;
        document.getElementById('crumb-name').textContent = product.name;
        document.getElementById('p-manufacturer').textContent = product.manufacturer || 'Generic';

        // Handle Price (Product schema has 'price' or 'unit_price')
        const price = product.unit_price || product.price || 0;
        document.getElementById('p-price').textContent = `₹${price.toFixed(2)}`;

        document.getElementById('p-composition').textContent = product.composition || 'N/A';
        document.getElementById('p-uses').textContent = product.uses || 'No description available.';
        document.getElementById('p-side-effects').textContent = product.side_effects || 'None listed.';

        // Reviews
        if (product.reviews) {
            document.getElementById('rev-excellent').textContent = `${product.reviews.excellent || 0}%`;
            document.getElementById('rev-avg').textContent = `${product.reviews.average || 0}%`;
            document.getElementById('rev-poor').textContent = `${product.reviews.poor || 0}%`;
        }

        // Image
        const img = document.getElementById('p-image');
        img.src = product.image_url || 'https://via.placeholder.com/400';
        img.onerror = () => img.src = 'https://via.placeholder.com/400?text=No+Image';

        // Add to Cart Button
        const addBtn = document.getElementById('add-btn');
        addBtn.onclick = () => {
            console.log("Add to cart clicked for", product.name);
            if (typeof window.addToCart === 'function') {
                window.addToCart(
                    product._id || product.id,
                    product.name,
                    price,
                    product.pharmacy_id || product.pharmacyId || 'demo_pharmacy'
                );
            } else {
                alert("Cart system is initializing, please check console or refresh.");
                console.error("window.addToCart is not defined");
            }
        };

        // Similar Products (Demo)
        loadSimilarProducts();

        // Show content
        loader.style.display = 'none';
        content.style.display = 'block';

    } catch (err) {
        console.error(err);
        loader.innerHTML = '<div style="text-align:center;"><h3>Failed to load product details</h3><p>' + err.message + '</p><a href="index.html">Go Back</a></div>';
    }
});

async function loadSimilarProducts() {
    const container = document.getElementById('similar-container');
    if (!container) return;

    // Just fetch some random products as "Similar"
    try {
        const res = await fetch(`${window.MediFind.API_URL}/products?limit=4`);
        const data = await res.json();
        const products = data.results || [];

        container.innerHTML = products.map(p => `
            <div class="medicine-card" onclick="window.location.href='product.html?id=${p._id}'" style="cursor:pointer;">
                <div style="height:100px; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                     <img src="${p.image_url || 'https://via.placeholder.com/150'}" style="max-height:100%; max-width:100%; object-fit:contain;">
                </div>
                <h4>${p.name}</h4>
                <p style="font-size:12px; color:#666;">${p.manufacturer || 'Generic'}</p>
                <div class="price">₹${(p.unit_price || p.price || 0).toFixed(2)}</div>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '';
    }
}
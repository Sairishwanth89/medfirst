document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('cart-items-container');
    const countLabel = document.getElementById('items-count');
    const totalLabel = document.getElementById('cart-total-display');
    const checkoutBtn = document.getElementById('checkout-btn');

    // Load Cart
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // --- Geolocation Auto-Fill ---
    window.fillCurrentLocation = function () {
        const btn = document.querySelector('button[onclick="fillCurrentLocation()"]');
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';

        if (!navigator.geolocation) {
            alert("Geolocation not supported");
            if (btn) btn.innerHTML = '<i class="fas fa-crosshairs"></i> Detect Location';
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // Mock Reverse Geocoding
                setTimeout(() => {
                    document.getElementById('addr-street').value = "Flat 402, Sunshine Apartments, MG Road";
                    document.getElementById('addr-city').value = "Mumbai";
                    document.getElementById('addr-pincode').value = "400001";

                    if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Detected';
                    setTimeout(() => {
                        if (btn) btn.innerHTML = '<i class="fas fa-crosshairs"></i> Detect Location';
                    }, 2000);
                }, 1000);
            },
            (err) => {
                alert("Location access denied or failed.");
                if (btn) btn.innerHTML = '<i class="fas fa-crosshairs"></i> Detect Location';
            }
        );
    };

    // --- Render Cart Function ---
    function renderPage() {
        const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
        const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        if (countLabel) countLabel.textContent = totalItems;
        // Mock MRP logic
        if (document.getElementById('summary-mrp')) document.getElementById('summary-mrp').textContent = `₹${totalPrice.toFixed(2)}`;

        // Final Total = Price + 10 (Platform fee)
        const finalTotal = totalItems > 0 ? totalPrice + 10 : 0;
        if (totalLabel) totalLabel.textContent = `₹${finalTotal.toFixed(2)}`;

        if (cart.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <i class="fas fa-shopping-basket fa-3x" style="color:#cbd5e1;"></i>
                    <p style="margin-top:15px; color:#64748b;">Your cart is empty.</p>
                </div>`;
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
            }
        } else {
            container.innerHTML = cart.map((item, index) => `
                <div class="cart-item">
                    <div class="cart-item-img">
                        <i class="fas fa-prescription-bottle-alt fa-2x"></i>
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-meta">Pharmacy: ${item.pharmacyName || 'Local Partner'}</div>
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                            <span style="font-weight:600; width:20px; text-align:center;">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                            <span style="font-size:0.85rem; color:#ef4444; margin-left:15px; cursor:pointer;" onclick="removeItem(${index})"><i class="fas fa-trash"></i> Remove</span>
                        </div>
                    </div>
                    <div class="item-price">₹${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            `).join('');

            if (checkoutBtn) checkoutBtn.disabled = false;
        }

        // Pre-fill address if user exists
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            if (document.getElementById('addr-name')) document.getElementById('addr-name').value = currentUser.name || currentUser.full_name || '';
        }
    }

    // --- Actions ---
    window.updateQty = (index, change) => {
        if (cart[index].quantity + change > 0) {
            cart[index].quantity += change;
        } else {
            if (confirm('Remove item from cart?')) cart.splice(index, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        renderPage();
    };

    window.removeItem = (index) => {
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        renderPage();
        if (typeof updateAuthUI === 'function') updateAuthUI();
    };

    // ➤ CHECKOUT TRIGGER
    window.checkout = async () => {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            alert("Please login to place an order.");
            if (window.openAuthModal) window.openAuthModal();
            return;
        }

        // VALIDATE ADDRESS
        const name = document.getElementById('addr-name').value.trim();
        const street = document.getElementById('addr-street').value.trim();
        const city = document.getElementById('addr-city').value.trim();
        const pincode = document.getElementById('addr-pincode').value.trim();

        if (!name || !street || !city || !pincode) {
            alert("Please fill in all delivery address fields.");
            return;
        }

        const fullAddress = `${street}, ${city} - ${pincode} (Receiver: ${name})`;

        const btn = document.getElementById('checkout-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        // Call global placeOrder from app.js
        if (typeof window.placeOrder === 'function') {
            await window.placeOrder(fullAddress);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Proceed to Checkout <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>';
            }
        } else {
            // Fallback for Demo/Offline
            alert("Order placed successfully! (Demo Mode)");
            localStorage.removeItem('cart');
            window.location.href = 'index.html';
        }
    };

    // --- Previously Browsed & Recommended ---
    function renderSuggestions() {
        const historyContainer = document.getElementById('history-container');
        const recommendedContainer = document.getElementById('recommended-container');

        const fallbackImg = 'https://img.freepik.com/free-vector/medical-healthcare-blue-color-cross-background_1017-26807.jpg';

        const historyItems = [
            { id: 'm1', name: "Augmentin 625 Duo Tablet", manufacturer: "GlaxoSmithKline", price: 223.42, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/wy2y9bdipmh6rgkrj0zm.jpg" },
            { id: 'm2', name: "Azithral 500 Tablet", manufacturer: "Alembic Pharma", price: 132.40, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/kqkouvaqejbyk47dvjfu.jpg" },
            { id: 'm3', name: "Ascoril LS Syrup", manufacturer: "Glenmark Pharma", price: 118.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/3205599cc49d4073ae66cbb0dbfded86.jpg" },
            { id: 'm4', name: "Aciloc 150 Tablet", manufacturer: "Cadila Pharma", price: 45.34, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/pn7apngctvrtweencwi1.jpg" }
        ];

        const recommendedItems = [
            { id: 'r1', name: "Horlicks Health Drink", manufacturer: "GSK", price: 450.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/f4e66d25-7833-488f-97a6-42f022a1562b.png" },
            { id: 'r2', name: "Dettol Antiseptic Liquid", manufacturer: "Reckitt Benckiser", price: 180.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/d4b31c93-68d7-463d-888e-6c03975001c4.jpg" },
            { id: 'r3', name: "Ensure Diabetes Care", manufacturer: "Abbott", price: 1100.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/b62153a7-33b8-479c-9c71-332d431c463f.jpg" },
            { id: 'r4', name: "Shelcal 500 Tablet", manufacturer: "Torrent Pharma", price: 110.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/ba246679-0524-4f9e-9904-486162383d47.jpg" }
        ];

        const renderCard = (item) => `
            <div class="card" style="padding:15px; border:none; box-shadow:0 2px 4px rgba(0,0,0,0.05); transition:transform 0.2s; cursor:pointer;" onclick="window.location.href='product.html?id=${item.id}'" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="height: 120px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; overflow:hidden; border-radius: 8px;">
                    <img src="${item.image_url}" onerror="this.src='${fallbackImg}'" alt="${item.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                </div>
                <div>
                    <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 4px;">${item.manufacturer}</div>
                    <h5 style="margin: 0 0 8px; color: #334155; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${item.name}
                    </h5>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: #059669; font-size: 1rem;">₹${item.price.toFixed(2)}</span>
                        <button onclick="event.stopPropagation(); addToCart('${item.id}', '${item.name}', ${item.price}, 'demo_pharmacy')" 
                                style="background: #f1f5f9; border: none; color: #0f172a; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 600; transition:background 0.2s;">
                            <i class="fas fa-plus"></i> ADD
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (historyContainer) historyContainer.innerHTML = historyItems.map(renderCard).join('');
        if (recommendedContainer) recommendedContainer.innerHTML = recommendedItems.map(renderCard).join('');
    }

    renderPage();
    renderSuggestions();
});
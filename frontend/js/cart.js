document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('cart-items-container');
    const countLabel = document.getElementById('items-count');
    const totalLabel = document.getElementById('cart-total-display');
    const checkoutBtn = document.getElementById('checkout-btn');
    const historyContainer = document.getElementById('history-container');

    // Load Cart
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    // --- Render Cart Function ---
    function renderPage() {
        const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
        const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // Update Header Stats
        if(countLabel) countLabel.textContent = totalItems;
        if(totalLabel) totalLabel.textContent = totalPrice.toFixed(2);

        // Empty State Check
        if (cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart-state">
                    <div class="empty-img-placeholder">
                        <i class="fas fa-box-open fa-4x" style="color: #cbd5e1; margin-top:10px;"></i>
                    </div>
                    <div class="empty-text">Your Medicine/Healthcare cart is empty!</div>
                </div>
            `;
            if(checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.style.backgroundColor = "#dbe0e5";
                checkoutBtn.style.color = "#8897a2";
            }
        } else {
            // Render Items
            container.innerHTML = cart.map((item, index) => `
                <div class="cart-item-row">
                    <div style="flex: 1;">
                        <h4 style="margin-bottom: 5px; color: #30363c; font-size: 16px;">${item.name}</h4>
                        <p style="font-size: 12px; color: #777;">Unit Price: ₹${item.price}</p>
                        <div class="qty-selector">
                            <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                            <span style="font-weight: 600; font-size: 14px;">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                            <span style="font-size: 12px; color: #e74c3c; margin-left: 15px; cursor: pointer; font-weight: 500;" onclick="removeItem(${index})">
                                <i class="fas fa-trash"></i> Remove
                            </span>
                        </div>
                    </div>
                    <div style="font-weight: 700; color: #30363c; font-size: 16px;">
                        ₹${(item.price * item.quantity).toFixed(2)}
                    </div>
                </div>
            `).join('');
            
            if(checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.style.backgroundColor = "var(--primary)";
                checkoutBtn.style.color = "white";
            }
        }
    }

    // --- Window Actions (Global) ---
    window.updateQty = (index, change) => {
        if (cart[index].quantity + change > 0) {
            cart[index].quantity += change;
        } else {
            if (confirm('Remove item from cart?')) {
                cart.splice(index, 1);
            }
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        renderPage();
    };

    window.removeItem = (index) => {
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        renderPage();
        // Update header count if it exists in app.js
        if(typeof updateCartUI === 'function') updateCartUI();
    };

    window.checkout = () => {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            alert("Please login to place an order.");
            // If you have an openAuthModal function globally
            if(window.openAuthModal) window.openAuthModal();
            return;
        }
        
        if (window.placeOrder) {
            window.placeOrder(); // Calls function from app.js if defined
        } else {
            // Fallback checkout logic if app.js placeOrder isn't ready
            alert(`Order placed successfully! Total: ₹${document.getElementById('cart-total-display').textContent}`);
            localStorage.removeItem('cart');
            window.location.href = 'orders.html';
        }
    };

    // --- RENDER "PREVIOUSLY BROWSED" (Real Data from CSV) ---
    function renderHistory() {
        if(!historyContainer) return;

        const historyItems = [
            { id: 'm1', name: "Augmentin 625 Duo Tablet", manufacturer: "GlaxoSmithKline", price: 223.42, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/wy2y9bdipmh6rgkrj0zm.jpg" },
            { id: 'm2', name: "Azithral 500 Tablet", manufacturer: "Alembic Pharma", price: 132.40, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/kqkouvaqejbyk47dvjfu.jpg" },
            { id: 'm3', name: "Ascoril LS Syrup", manufacturer: "Glenmark Pharma", price: 118.00, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/3205599cc49d4073ae66cbb0dbfded86.jpg" },
            { id: 'm4', name: "Aciloc 150 Tablet", manufacturer: "Cadila Pharma", price: 45.34, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/pn7apngctvrtweencwi1.jpg" },
            { id: 'm5', name: "Avil 25 Tablet", manufacturer: "Sanofi India", price: 10.97, image_url: "https://onemg.gumlet.io/l_watermark_346,w_480,h_480/a_ignore,w_480,h_480,c_fit,q_auto,f_auto/cropped/mmsye6bf97tkcocat24j.jpg" }
        ];

        historyContainer.innerHTML = historyItems.map(item => `
            <div class="history-card" style="cursor: pointer; transition: transform 0.2s;">
                <div style="height: 120px; background: #fff; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; overflow:hidden; border-radius: 6px;">
                    <img src="${item.image_url}" alt="${item.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.src='https://via.placeholder.com/150?text=Medicine'">
                </div>
                <div style="padding: 0 5px;">
                    <div style="font-size: 11px; color: #888; margin-bottom: 4px;">${item.manufacturer}</div>
                    <h5 style="margin: 0 0 8px; color: #333; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.name}">
                        ${item.name}
                    </h5>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: #059669; font-size: 15px;">₹${item.price.toFixed(2)}</span>
                        <button onclick="addToCart('${item.id}', '${item.name}', ${item.price})" 
                                style="background: white; border: 1px solid var(--primary); color: var(--primary); padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 600;">
                            ADD
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Initial Render
    renderPage();
    renderHistory();
});
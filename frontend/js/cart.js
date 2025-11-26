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
        countLabel.textContent = totalItems;
        totalLabel.textContent = totalPrice.toFixed(2);

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
            checkoutBtn.disabled = true;
            checkoutBtn.style.backgroundColor = "#dbe0e5";
            checkoutBtn.style.color = "#8897a2";
        } else {
            // Render Items
            container.innerHTML = cart.map((item, index) => `
                <div class="cart-item-row">
                    <div style="flex: 1;">
                        <h4 style="margin-bottom: 5px; color: #30363c;">${item.name}</h4>
                        <p style="font-size: 12px; color: #777;">Unit Price: $${item.price}</p>
                        <div class="qty-selector">
                            <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                            <span style="font-weight: 600; font-size: 14px;">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                            <span style="font-size: 12px; color: #e74c3c; margin-left: 15px; cursor: pointer;" onclick="removeItem(${index})">Remove</span>
                        </div>
                    </div>
                    <div style="font-weight: 700; color: #30363c;">
                        $${(item.price * item.quantity).toFixed(2)}
                    </div>
                </div>
            `).join('');
            
            checkoutBtn.disabled = false;
            checkoutBtn.style.backgroundColor = "var(--primary)";
            checkoutBtn.style.color = "white";
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
    };

    window.checkout = () => {
        if (window.placeOrder) {
            window.placeOrder(); // Calls function from app.js
        } else {
            alert("Checkout logic not connected.");
        }
    };

    // --- Fake History Generator ---
    function renderHistory() {
        const fakeItems = [
            { name: "Dolo 650mg", price: 1.50 },
            { name: "Benadryl Syrup", price: 4.20 },
            { name: "Shelcal 500", price: 5.00 },
            { name: "Vicks VapoRub", price: 3.10 }
        ];

        historyContainer.innerHTML = fakeItems.map(item => `
            <div class="history-card">
                <div style="height: 80px; background: #f9f9f9; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-pills fa-2x" style="color: #ddd;"></i>
                </div>
                <h5 style="margin-bottom: 5px; color: #333;">${item.name}</h5>
                <div style="font-size: 14px; font-weight: bold; color: #333;">$${item.price.toFixed(2)}</div>
                <button class="add-btn" style="margin-top: 10px; font-size: 12px;" onclick="addToCart('fake_${Date.now()}', '${item.name}', ${item.price}, 'demo_pharma')">Add</button>
            </div>
        `).join('');
    }

    // Initial Render
    renderPage();
    renderHistory();
});
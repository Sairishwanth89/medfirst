document.addEventListener('DOMContentLoaded', () => {
    const cartContainer = document.getElementById('cart-view');
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    function renderCart() {
        if (cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-basket fa-4x" style="margin-bottom: 20px; opacity: 0.3;"></i>
                    <h3>Your cart is empty</h3>
                    <p>Add medicines to proceed to checkout.</p>
                    <a href="index.html" class="pe-btn-primary" style="display: inline-block; margin-top: 20px; text-decoration: none;">Browse Medicines</a>
                </div>
            `;
            return;
        }

        let itemsHtml = '';
        let total = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            itemsHtml += `
                <div class="cart-item">
                    <div class="item-details">
                        <h4>${item.name}</h4>
                        <p>Unit Price: $${item.price}</p>
                    </div>
                    <div class="item-actions">
                        <div>
                            <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                            <span style="margin: 0 10px; font-weight: 600;">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                        </div>
                        <div style="width: 80px; text-align: right; font-weight: bold;">$${itemTotal.toFixed(2)}</div>
                        <i class="fas fa-trash-alt remove-btn" onclick="removeItem(${index})"></i>
                    </div>
                </div>
            `;
        });

        cartContainer.innerHTML = `
            <div class="cart-header">
                <h2>Shopping Cart (${cart.length} Items)</h2>
            </div>
            <div class="cart-items">
                ${itemsHtml}
            </div>
            <div class="cart-summary">
                <div class="total-price">Total: $${total.toFixed(2)}</div>
                <button class="pe-btn-primary" style="width: 200px;" onclick="checkout()">Proceed to Checkout</button>
            </div>
        `;
    }

    window.updateQty = (index, change) => {
        if (cart[index].quantity + change > 0) {
            cart[index].quantity += change;
        } else {
            if(confirm('Remove this item?')) cart.splice(index, 1);
        }
        saveCart();
    };

    window.removeItem = (index) => {
        cart.splice(index, 1);
        saveCart();
    };

    window.checkout = () => {
        if(window.placeOrder) {
            // Use the shared placeOrder function from app.js
            window.placeOrder(); 
        } else {
            alert("Please login on the main page to checkout.");
            window.location.href = 'index.html'; 
        }
    };

    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
    }

    renderCart();
});

document.addEventListener('DOMContentLoaded', () => {
     const API_URL = window.MediFind?.API_URL || 'http://localhost:8000/api';
    const authToken = window.MediFind?.authToken || localStorage.getItem('authToken');
    const currentUser = window.MediFind?.currentUser || JSON.parse(localStorage.getItem('currentUser'));


    // 1. Auth Check
    if (!authToken || !currentUser || currentUser.role !== 'pharmacy') {
        window.location.href = 'index.html';
        return;
    }

    // Display Pharmacy Name
    const nameEl = document.getElementById('pharmacy-name');
    if(nameEl) nameEl.textContent = currentUser.username;

    // 2. Logout Logic
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm('Are you sure you want to logout?')) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }

    // 3. Tab Logic
    window.showTab = function(tabName) {
        const ordersTab = document.getElementById('orders-tab');
        const invTab = document.getElementById('inventory-tab');
        
        if(tabName === 'orders') {
            ordersTab.style.display = 'block';
            invTab.style.display = 'none';
            loadOrders();
        } else {
            ordersTab.style.display = 'none';
            invTab.style.display = 'block';
            loadInventory();
        }
    };

    // 4. Modal Logic
    const addModal = document.getElementById('add-modal');
    window.openAddModal = () => addModal.style.display = 'flex';
    window.closeAddModal = () => addModal.style.display = 'none';

    // 5. Add Medicine Functionality
    const addForm = document.getElementById('add-med-form');
    if(addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const medData = {
                name: document.getElementById('med-name').value,
                generic_name: document.getElementById('med-generic').value,
                manufacturer: document.getElementById('med-manufacturer').value,
                description: document.getElementById('med-desc').value,
                unit_price: parseFloat(document.getElementById('med-price').value),
                stock_quantity: parseInt(document.getElementById('med-qty').value),
                requires_prescription: document.getElementById('med-rx').checked
            };

            try {
                const res = await fetch(`${API_URL}/stock`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(medData)
                });

                if(!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.detail || 'Failed to add medicine');
                }

                alert('Medicine added successfully!');
                addForm.reset();
                closeAddModal();
                loadInventory(); // Refresh list

            } catch (err) {
                console.error(err);
                alert('Error: ' + err.message);
            }
        });
    }

    // 6. Load Orders
    async function loadOrders() {
        const container = document.getElementById('orders-container');
        try {
            const res = await fetch(`${API_URL}/orders/pharmacy/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const orders = await res.json();
            
            container.innerHTML = orders.length ? '' : '<p style="grid-column:1/-1; text-align:center; color:#888;">No pending orders.</p>';
            
            orders.forEach(order => {
                const div = document.createElement('div');
                div.className = 'medicine-card';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <h4 style="margin:0">Order #${order._id.slice(-6)}</h4>
                        <span style="font-size:12px; background:#e3fdfd; color:var(--primary); padding:2px 8px; border-radius:4px;">${order.status}</span>
                    </div>
                    <p style="font-size:13px; color:#666; margin-bottom:5px;">Amount: $${order.total_amount}</p>
                    <p style="font-size:13px; color:#666;">Items: ${order.items.length}</p>
                    <button class="add-btn" style="margin-top:10px;" onclick="alert('Feature coming soon: Confirm Order')">Confirm Order</button>
                `;
                container.appendChild(div);
            });
        } catch(e) { console.error(e); }
    }

    // 7. Load Inventory
    async function loadInventory() {
        const container = document.getElementById('inventory-container');
        try {
            const res = await fetch(`${API_URL}/stock/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const items = await res.json();
            
            container.innerHTML = items.length ? '' : '<p style="grid-column:1/-1; text-align:center; color:#888;">Inventory empty.</p>';
            
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'medicine-card';
                div.innerHTML = `
                    <h4 style="color:#30363c; margin-bottom:5px;">${item.name}</h4>
                    <p style="font-size:13px; color:#666; margin-bottom:5px;">${item.manufacturer || 'Generic'}</p>
                    <p style="font-size:13px; font-weight:600;">Stock: ${item.stock_quantity}</p>
                    <div class="price" style="margin:10px 0; color:var(--primary); font-weight:bold;">$${item.unit_price}</div>
                    <button class="add-btn" style="background:#e74c3c; width:100%; border:none; padding:8px; color:white; border-radius:4px; cursor:pointer;" onclick="alert('Delete feature coming soon')">Remove</button>
                `;
                container.appendChild(div);
            });
        } catch(e) { console.error(e); }
    }

    // Initial Load
    loadOrders();
});
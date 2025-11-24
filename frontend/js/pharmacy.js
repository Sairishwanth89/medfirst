const { API_URL, authToken, currentUser, showAlert } = window.MediFind || {};

if (!authToken || currentUser.role !== 'pharmacy') {
    window.location.href = 'index.html';
}

document.getElementById('pharmacy-name').textContent = currentUser.username;
document.getElementById('logout-btn').onclick = (e) => { e.preventDefault(); localStorage.clear(); location.href='index.html'; };

// Tabs
window.showTab = function(tabName) {
    if(tabName === 'orders') {
        document.getElementById('orders-tab').style.display = 'block';
        document.getElementById('inventory-tab').style.display = 'none';
        loadOrders();
    } else {
        document.getElementById('orders-tab').style.display = 'none';
        document.getElementById('inventory-tab').style.display = 'block';
        loadInventory();
    }
};

// Modals
const addModal = document.getElementById('add-modal');
window.openAddModal = () => addModal.style.display = 'flex';
window.closeAddModal = () => addModal.style.display = 'none';

// Load Data
async function loadOrders() {
    const container = document.getElementById('orders-container');
    try {
        const res = await fetch(`${API_URL}/orders/pharmacy/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const orders = await res.json();
        
        container.innerHTML = orders.length ? '' : '<p style="grid-column:1/-1; text-align:center">No pending orders.</p>';
        
        orders.forEach(order => {
            const div = document.createElement('div');
            div.className = 'medicine-card';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <h4 style="margin:0">Order #${order.id}</h4>
                    <span style="font-size:12px; background:#e3fdfd; color:var(--primary); padding:2px 8px; border-radius:4px;">${order.status}</span>
                </div>
                <p style="font-size:13px; color:#666; margin-bottom:5px;">Amount: $${order.total_amount}</p>
                <p style="font-size:13px; color:#666;">Items: ${order.order_items.length}</p>
                <button class="add-btn" style="margin-top:10px;" onclick="updateStatus(${order.id}, 'confirmed')">Confirm Order</button>
            `;
            container.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

async function loadInventory() {
    const container = document.getElementById('inventory-container');
    try {
        const res = await fetch(`${API_URL}/stock/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const items = await res.json();
        
        container.innerHTML = items.length ? '' : '<p style="grid-column:1/-1; text-align:center">Inventory empty.</p>';
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'medicine-card';
            div.innerHTML = `
                <h4>${item.name}</h4>
                <p style="font-size:13px;">Stock: ${item.stock_quantity}</p>
                <div class="price">$${item.unit_price}</div>
                <button class="add-btn" style="background:#e74c3c;" onclick="deleteItem(${item.id})">Remove</button>
            `;
            container.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

// Actions
window.updateStatus = async (id, status) => {
    // Placeholder for status update logic
    alert(`Order #${id} marked as ${status}`);
};

window.deleteItem = async (id) => {
    if(confirm('Delete this item?')) {
        // Placeholder for delete logic
        alert(`Item #${id} deleted`);
        loadInventory();
    }
};

// Init
loadOrders();
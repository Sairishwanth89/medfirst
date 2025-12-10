document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.MediFind?.API_URL || 'http://localhost:8000/api';
    const authToken = window.MediFind?.authToken || localStorage.getItem('authToken');
    const currentUser = window.MediFind?.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');

    // 1. Auth Check
    if (!authToken || !currentUser || currentUser.role !== 'delivery') {
        alert("Access Denied. Delivery partners only.");
        window.location.href = 'index.html';
        return;
    }

    // Update Header
    document.getElementById('driver-name').textContent = currentUser.username || 'Driver';

    // 2. Real-Time Polling
    let knownOrderIds = new Set();
    let currentOrders = [];

    // Initial Load
    fetchOrders();
    // Poll every 5 seconds
    setInterval(fetchOrders, 5000);

    async function fetchOrders() {
        try {
            // 1. Fetch Real API Orders
            let apiOrders = [];
            try {
                const res = await fetch(`${API_URL}/orders/delivery/available`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (res.ok) apiOrders = await res.json();
            } catch (e) { console.log("API offline/failed, using local only"); }

            // 2. Fetch Simulated Orders
            let simOrders = JSON.parse(localStorage.getItem('simulated_orders') || '[]');

            // Merge (Simulated orders on top)
            const allOrders = [...simOrders, ...apiOrders];
            currentOrders = allOrders;

            // Notification Logic etc...
            allOrders.forEach(o => {
                if (!knownOrderIds.has(o._id) && (o.status === 'ready_for_pickup' || o.status === 'pending')) {
                    // Log new order
                }
                knownOrderIds.add(o._id);
            });

            renderDashboard(allOrders);
            updateStats(allOrders);

        } catch (e) {
            console.error("Sync failed:", e);
        }
    }

    function renderDashboard(orders) {
        const activeContainer = document.getElementById('current-container');
        const historyContainer = document.getElementById('delivery-history');

        // Filter Orders
        const activeOrders = orders.filter(o =>
            o.status === 'ready_for_pickup' ||
            (o.status === 'out_for_delivery' && o.assigned_to === currentUser._id)
        );

        const historyOrders = orders.filter(o =>
            o.status === 'delivered' && o.assigned_to === currentUser._id
        );

        // Render Active
        if (activeOrders.length === 0) {
            activeContainer.innerHTML = '<div class="placeholder">No active assignments. Waiting for orders...</div>';
        } else {
            activeContainer.innerHTML = activeOrders.map(o => createCard(o, true)).join('');
        }

        // Render History
        if (historyOrders.length === 0) {
            historyContainer.innerHTML = '<div class="placeholder">No delivery history yet.</div>';
        } else {
            historyContainer.innerHTML = historyOrders.map(o => createCard(o, false)).join('');
        }
    }

    function createCard(order, isActive) {
        const isMyDelivery = order.status === 'out_for_delivery';
        const isNew = order.status === 'ready_for_pickup';

        let actionBtn = '';
        if (isNew) {
            actionBtn = `<button class="action-btn" style="background:var(--primary); color:white;" onclick="updateStatus('${order._id}', 'out_for_delivery')">Accept & Pickup</button>`;
        } else if (isMyDelivery) {
            actionBtn = `<button class="action-btn" style="background:#10b981; color:white;" onclick="updateStatus('${order._id}', 'delivered')">Mark Delivered</button>`;
        }

        // Handle User ID (could be object or string in some legacy cases)
        const userName = (typeof order.user_id === 'object' && order.user_id) ? (order.user_id.username || 'Customer') : 'Customer';
        const userPhone = (typeof order.user_id === 'object' && order.user_id) ? (order.user_id.phone || 'N/A') : 'N/A';

        return `
            <div class="d-card" style="margin-bottom:15px;">
                <div class="d-card-header">
                    <div class="d-card-id">Order #${order._id.slice(-6).toUpperCase()}</div>
                    <div class="d-badge ${order.status}">${order.status.replace(/_/g, ' ')}</div>
                </div>
                <div class="d-card-body">
                    <div class="d-icon-box"><i class="fas fa-map-marker-alt"></i></div>
                    <div class="d-info">
                        <h4>${userName}</h4>
                        <p>${order.delivery_address || '123 Main St (Default)'}</p>
                        <p style="font-size:12px; color:#666;">Phone: ${userPhone}</p>
                    </div>
                </div>
                <div style="padding: 0 20px 15px;">
                     <button class="action-btn" style="background:#f1f5f9; color:#333; width:100%;" onclick="showOrderDetails('${order._id}')">
                        <i class="fas fa-eye"></i> View Details
                     </button>
                </div>
                ${isActive ? `<div class="d-actions">${actionBtn}</div>` : ''}
            </div>
        `;
    }

    function updateStats(orders) {
        const active = orders.filter(o => o.status === 'ready_for_pickup').length;
        const transit = orders.filter(o => o.status === 'out_for_delivery').length;
        const done = orders.filter(o => o.status === 'delivered').length;

        document.getElementById('stat-active').textContent = active;
        document.getElementById('stat-out').textContent = transit;
        document.getElementById('stat-delivered').textContent = done;
    }

    // Actions
    window.updateStatus = async (id, status) => {
        // Check if Simulated
        let simOrders = JSON.parse(localStorage.getItem('simulated_orders') || '[]');
        const simIndex = simOrders.findIndex(o => o._id === id);

        if (simIndex !== -1) {
            // Update Local Simulation
            simOrders[simIndex].status = status;
            if (status === 'out_for_delivery') simOrders[simIndex].assigned_to = currentUser._id;
            localStorage.setItem('simulated_orders', JSON.stringify(simOrders));
            alert("Status Updated (Demo Mode)");
            fetchOrders();
            return;
        }

        // Else API
        try {
            // Visual feedback for RabbitMQ Sync
            const btn = document.activeElement;
            if (btn) { btn.innerText = "Syncing..."; btn.disabled = true; }

            await fetch(`${API_URL}/orders/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status })
            });
            // alert("Status updated and synced via RabbitMQ!");
            fetchOrders(); // Refresh immediately
        } catch (e) {
            alert("Failed to update order");
        }
    };

    // Modal Logic
    window.showOrderDetails = (orderId) => {
        const order = currentOrders.find(o => o._id === orderId);
        if (!order) return;

        const modal = document.getElementById('order-details-modal');
        const title = document.getElementById('modal-order-title');
        const body = document.getElementById('modal-order-body');

        title.textContent = `Order #${orderId.slice(-6).toUpperCase()}`;

        const itemsList = order.items.map(i => `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:5px;">
                <span>${i.medicine_id?.name || 'Unknown Item'}</span>
                <span>x${i.quantity}</span>
            </div>
        `).join('');

        body.innerHTML = `
            <div style="margin-bottom:15px;">
                <strong>Customer Info:</strong><br>
                Name: ${order.user_id?.username || 'N/A'}<br>
                Phone: <a href="tel:${order.user_id?.phone}">${order.user_id?.phone || 'N/A'}</a>
            </div>
            <div style="margin-bottom:15px;">
                <strong>Delivery Address:</strong><br>
                ${order.delivery_address || 'No address provided'}
            </div>
             <div style="margin-bottom:15px;">
                <strong>Items:</strong><br>
                ${itemsList}
            </div>
             <div style="margin-top:15px; text-align:right;">
                <strong>Total Amount: ₹${order.total_amount}</strong>
            </div>
        `;

        modal.style.display = 'flex';
    };

    window.closeOrderModal = () => {
        document.getElementById('order-details-modal').style.display = 'none';
    };

    window.logout = function () {
        if (confirm("Logout?")) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
    };
});
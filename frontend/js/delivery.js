document.addEventListener('DOMContentLoaded', () => {
    // Prefer window.MediFind but fall back to localStorage
    const API_URL = window.MediFind?.API_URL || 'http://localhost:8000/api';
    const authToken = window.MediFind?.authToken || localStorage.getItem('authToken');
    const currentUser = window.MediFind?.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
    const showAlert = window.MediFind?.showAlert || ((msg) => alert(msg));

    // Ensure only delivery role can access this page
    if (!authToken || !currentUser || currentUser.role !== 'delivery') {
        window.location.href = 'index.html';
        return;
    }

    // update header UI
    const driverNameEl = document.getElementById('driver-name');
    if (driverNameEl) driverNameEl.textContent = currentUser.username || currentUser.full_name || 'Driver';
    
    // Logout Logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.MediFind?.logout) {
                window.MediFind.logout();
            } else {
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            }
        });
    }

    // Mock orders
    let mockOrders = [
        { id: 201, address: "123 Main St, Mumbai", status: "ready_for_pickup", customer: { name: "A. Sharma", phone: "98765 43210" }, assigned_to: "vikram", source: "web" },
        { id: 205, address: "45 Sea View, Mumbai", status: "out_for_delivery", customer: { name: "R. Mehta", phone: "99887 77665" }, assigned_to: currentUser.username, source: "delivery" },
        { id: 211, address: "78 Hill Rd, Mumbai", status: "delivered", customer: { name: "S. Khan", phone: "91234 56789" }, assigned_to: "vikram", source: "customer_care" },
        { id: 217, address: "99 Park Lane, Mumbai", status: "delivered", customer: { name: "T. Iyer", phone: "90000 11111" }, assigned_to: currentUser.username, source: "delivery" },
        { id: 224, address: "101 Beach Ave, Mumbai", status: "cancelled", customer: { name: "V. Rao", phone: "88776 55443" }, assigned_to: "someone_else", source: "customer_care" }
    ];

    function formatStatusLabel(st) {
        return st.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function renderOrderCard(order, extraButtons = '') {
        const isMini = !extraButtons;
        
        if (isMini) {
            return `
                <div class="mini-card" onclick="showOrderDetails(${order.id})" style="cursor:pointer">
                    <div class="mini-info">
                        <div>Order #${order.id}</div>
                        <div>${order.address.substring(0, 25)}...</div>
                    </div>
                    <div class="mini-status">
                        ${order.status === 'delivered' ? 
                            '<i class="fas fa-check-circle text-green"></i>' : 
                            '<i class="fas fa-times-circle text-red"></i>'}
                    </div>
                </div>
            `;
        }

        return `
            <div class="d-card">
                <div class="d-card-header">
                    <div class="d-card-id">Order #${order.id}</div>
                    <div class="d-badge ${order.status}">${formatStatusLabel(order.status)}</div>
                </div>
                <div class="d-card-body">
                    <div class="d-icon-box">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="d-info">
                        <h4>${order.customer.name}</h4>
                        <p>${order.address}</p>
                        <p style="margin-top:4px; font-size:0.8rem">
                            <i class="fas fa-phone-alt" style="font-size:0.7rem"></i> ${order.customer.phone}
                        </p>
                    </div>
                </div>
                <div class="d-actions">
                    <button class="action-btn btn-details" onclick="showOrderDetails(${order.id})">
                        Details
                    </button>
                    ${extraButtons.replace('class="btn btn-primary btn-sm"', 'class="action-btn btn-start"')
                                  .replace('class="btn btn-success btn-sm"', 'class="action-btn btn-complete"')}
                </div>
            </div>
        `;
    }

    function updateStats() {
        const totalActive = mockOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
        document.getElementById('stat-active').textContent = totalActive;
        document.getElementById('stat-out').textContent = mockOrders.filter(o => o.status === 'out_for_delivery').length;
        document.getElementById('stat-delivered').textContent = mockOrders.filter(o => o.status === 'delivered').length;
    }

    function loadOrders() {
        const currentContainer = document.getElementById('current-container');
        const deliveryHistoryEl = document.getElementById('delivery-history');
        const customerHistoryEl = document.getElementById('customer-history');

        // current orders
        const assigned = mockOrders.filter(o => o.assigned_to === currentUser.username && o.status !== 'delivered' && o.status !== 'cancelled');
        currentContainer.innerHTML = assigned.length ? assigned.map(o => {
            let btnHtml = '';
            if (o.status === 'ready_for_pickup') btnHtml = `<button class="btn btn-primary btn-sm" onclick="updateStatus(${o.id}, 'out_for_delivery')">Start Delivery</button>`;
            if (o.status === 'out_for_delivery') btnHtml = `<button class="btn btn-success btn-sm" onclick="updateStatus(${o.id}, 'delivered')">Mark Delivered</button>`;
            return renderOrderCard(o, btnHtml);
        }).join('') : '<div class="placeholder">No active assignments</div>';

        // delivery history
        const deliveryHistory = mockOrders.filter(o => o.assigned_to === currentUser.username && (o.status === 'delivered' || o.status === 'cancelled'));
        deliveryHistoryEl.innerHTML = deliveryHistory.length ? deliveryHistory.map(o => renderOrderCard(o)).join('') : '<div class="placeholder">No delivery history yet</div>';

        // customer care history
        const ccHistory = mockOrders.filter(o => o.source === 'customer_care');
        customerHistoryEl.innerHTML = ccHistory.length ? ccHistory.map(o => renderOrderCard(o)).join('') : '<div class="placeholder">No customer-care flagged orders</div>';

        updateStats();
    }

    // --- GLOBAL MODAL FUNCTIONS ---
    window.showOrderDetails = function(id) {
        const order = mockOrders.find(o => o.id === id);
        if (!order) return showAlert('Order not found');
        
        const modal = document.getElementById('order-details-modal');
        document.getElementById('modal-order-title').textContent = `Order #${order.id} — ${formatStatusLabel(order.status)}`;
        document.getElementById('modal-order-body').innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; font-size:0.9rem;">
                <div>
                    <label style="color:#64748b; font-size:0.8rem; font-weight:600;">Customer</label>
                    <div style="font-weight:600;">${order.customer.name}</div>
                    <div>${order.customer.phone}</div>
                </div>
                 <div>
                    <label style="color:#64748b; font-size:0.8rem; font-weight:600;">Status</label>
                    <div style="text-transform:capitalize;">${order.status.replace(/_/g,' ')}</div>
                </div>
                <div style="grid-column:1/-1;">
                     <label style="color:#64748b; font-size:0.8rem; font-weight:600;">Delivery Address</label>
                     <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-top:4px;">${order.address}</div>
                </div>
            </div>
        `;
        // Explicitly set display flex to show
        modal.style.display = 'flex';
    };

    window.closeOrderModal = function() {
        const modal = document.getElementById('order-details-modal');
        if(modal) modal.style.display = 'none';
    };

    window.updateStatus = (id, status) => {
        const i = mockOrders.findIndex(o => o.id === id);
        if (i === -1) return showAlert('Order not found');
        mockOrders[i].status = status;
        if (status === 'out_for_delivery' || status === 'delivered') mockOrders[i].assigned_to = currentUser.username;
        showAlert(`Order #${id} updated to ${formatStatusLabel(status)}`);
        loadOrders();
    };

    loadOrders();
});
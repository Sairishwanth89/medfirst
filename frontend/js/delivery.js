/*
  Enhancements:
  - Robust auth fallback (use window.MediFind or localStorage)
  - Current orders list
  - Two history panels: delivery boy and customer care
  - Order details modal
  - Update status updates in-memory mock and re-renders
*/

// Prefer window.MediFind (set by app.js) but fall back to localStorage for auth
const API_URL = window.MediFind?.API_URL || 'http://localhost:8000/api';
const authToken = window.MediFind?.authToken || localStorage.getItem('authToken');
const currentUser = window.MediFind?.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
const showAlert = window.MediFind?.showAlert || ((msg) => alert(msg));

// make sure DOM exists before touching elements (script is included at end of body,
// but using DOMContentLoaded avoids edge cases)
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
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        // remove any previous handlers and attach a reliable listener
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        const btn = document.getElementById('logout-btn') || document.querySelector('#logout-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // use central logout if provided
                if (window.MediFind?.logout) {
                    window.MediFind.logout();
                    return;
                }
                // fallback: clear auth keys and redirect
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
    }

    // Mock orders — replace with API fetch when ready
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
        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-left">
                        <div class="order-id">#${order.id}</div>
                        <div class="order-address">${order.address}</div>
                    </div>
                    <div class="order-right">
                        <div class="status-badge ${order.status}">${formatStatusLabel(order.status)}</div>
                    </div>
                </div>
                <div class="order-meta">
                    <div><strong>Customer:</strong> ${order.customer.name} • ${order.customer.phone}</div>
                    <div><strong>Assigned:</strong> ${order.assigned_to || 'Unassigned'}</div>
                    <div><strong>Source:</strong> ${order.source}</div>
                </div>
                <div class="order-actions">
                    <button class="btn btn-sm" onclick="showOrderDetails(${order.id})">Details</button>
                    ${extraButtons}
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
        const deliveryHistory = mockOrders.filter(o => o.assigned_to === currentUser.username && !(o.status === 'ready_for_pickup' || o.status === 'out_for_delivery'));
        deliveryHistoryEl.innerHTML = deliveryHistory.length ? deliveryHistory.map(o => renderOrderCard(o)).join('') : '<div class="placeholder">No delivery history yet</div>';

        // customer care history
        const ccHistory = mockOrders.filter(o => o.source === 'customer_care');
        customerHistoryEl.innerHTML = ccHistory.length ? ccHistory.map(o => renderOrderCard(o)).join('') : '<div class="placeholder">No customer-care flagged orders</div>';

        updateStats();
    }

    window.showOrderDetails = function(id) {
        const order = mockOrders.find(o => o.id === id);
        if (!order) return showAlert('Order not found');
        document.getElementById('modal-order-title').textContent = `Order #${order.id} — ${formatStatusLabel(order.status)}`;
        document.getElementById('modal-order-body').innerHTML = `
            <p><strong>Address:</strong> ${order.address}</p>
            <p><strong>Customer:</strong> ${order.customer.name} • ${order.customer.phone}</p>
            <p><strong>Assigned to:</strong> ${order.assigned_to || 'Unassigned'}</p>
            <p style="margin-top:10px;color:#666;">Notes: demo data. Replace with real backend fields.</p>
        `;
        document.getElementById('order-details-modal').style.display = 'flex';
    };

    window.closeOrderModal = function() {
        document.getElementById('order-details-modal').style.display = 'none';
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
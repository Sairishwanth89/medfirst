// Pharmacy Orders Management JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const authToken = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!authToken || !currentUser || currentUser.role !== 'pharmacy') {
        window.location.href = 'index.html';
        return;
    }

    loadOrders();
});

let allOrders = [];
let currentTab = 'pending';

async function loadOrders() {
    try {
        const response = await fetch('http://localhost:8000/api/orders/pharmacy/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            allOrders = await response.json();
            switchTab('pending');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function switchTab(tab) {
    currentTab = tab;

    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    // Filter and display orders
    let filteredOrders = [];
    if (tab === 'pending') {
        filteredOrders = allOrders.filter(o => o.status === 'pending');
    } else if (tab === 'processing') {
        filteredOrders = allOrders.filter(o => o.status === 'confirmed' || o.status === 'processing' || o.status === 'out_for_delivery');
    } else if (tab === 'completed') {
        filteredOrders = allOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled');
    }

    displayOrders(filteredOrders);
}

function displayOrders(orders) {
    const tbody = document.getElementById('orders-table-body');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const itemsText = order.items.map(item => `${item.medicine_id.name} (${item.quantity})`).join(', ');
        const orderTime = new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        return `
            <tr>
                <td><strong>#${order._id.slice(-6).toUpperCase()}</strong></td>
                <td>
                    <div>${order.user_id.username || 'patient 123'}</div>
                    <small>${order.user_id.phone || '9876543773'}</small>
                </td>
                <td>${itemsText}</td>
                <td>₹${order.total_amount}</td>
                <td>${orderTime}</td>
                <td><span class="status-badge ${order.status}">${formatStatus(order.status)}</span></td>
                <td>
                    ${getActionButtons(order)}
                </td>
            </tr>
        `;
    }).join('');

    // Add event listeners to action buttons
    addActionListeners();
}

function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'confirmed': 'Processing',
        'processing': 'Processing',
        'out_for_delivery': 'Processing',
        'delivered': 'Completed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function getActionButtons(order) {
    if (order.status === 'pending') {
        return `
            <div class="action-buttons">
                <button class="action-btn accept-btn" data-order-id="${order._id}">Accept</button>
                <button class="action-btn reject-btn" data-order-id="${order._id}">Reject</button>
            </div>
        `;
    }
    return '-';
}

function addActionListeners() {
    document.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', () => acceptOrder(btn.dataset.orderId));
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectOrder(btn.dataset.orderId));
    });
}

async function acceptOrder(orderId) {
    try {
        const response = await fetch(`http://localhost:8000/api/orders/${orderId}/confirm`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            alert('Order accepted successfully!');
            loadOrders();
        } else {
            alert('Failed to accept order');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to accept order');
    }
}

async function rejectOrder(orderId) {
    if (!confirm('Are you sure you want to reject this order?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:8000/api/orders/${orderId}/cancel`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            alert('Order rejected!');
            loadOrders();
        } else {
            alert('Failed to reject order');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to reject order');
    }
}

// Make switchTab globally accessible
window.switchTab = switchTab;

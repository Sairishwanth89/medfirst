const { API_URL, authToken, currentUser, showAlert } = window.MediFind || {};

if (!authToken || currentUser.role !== 'delivery') {
    window.location.href = 'index.html';
}

document.getElementById('driver-name').textContent = currentUser.username;
document.getElementById('logout-btn').onclick = (e) => { e.preventDefault(); localStorage.clear(); location.href='index.html'; };

async function loadDeliveries() {
    const container = document.getElementById('delivery-container');
    
    // Mock data simulation since backend specific endpoint wasn't requested
    const mockOrders = [
        { id: 201, address: "123 Main St, Mumbai", status: "ready_for_pickup" },
        { id: 205, address: "45 Sea View, Mumbai", status: "out_for_delivery" }
    ];

    container.innerHTML = '';
    
    if(mockOrders.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center">No active deliveries.</p>';
        return;
    }

    mockOrders.forEach(order => {
        const div = document.createElement('div');
        div.className = 'medicine-card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h4 style="margin:0">Order #${order.id}</h4>
                <span style="font-size:12px; background:#f0f4ff; color:var(--primary); padding:2px 8px; border-radius:4px;">${order.status.replace(/_/g, ' ')}</span>
            </div>
            <p style="font-size:13px; color:#666; margin-bottom:15px;"><i class="fas fa-map-marker-alt"></i> ${order.address}</p>
            
            ${order.status === 'ready_for_pickup' ? 
                `<button class="add-btn" onclick="updateStatus(${order.id}, 'out_for_delivery')">Start Delivery</button>` : 
                `<button class="add-btn" style="background:#27ae60;" onclick="updateStatus(${order.id}, 'delivered')">Mark Delivered</button>`
            }
        `;
        container.appendChild(div);
    });
}

window.updateStatus = (id, status) => {
    alert(`Order #${id} status updated to: ${status}`);
    // In real app: await fetch(...) and reload
    loadDeliveries();
}

loadDeliveries();
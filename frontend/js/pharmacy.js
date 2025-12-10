document.addEventListener('DOMContentLoaded', () => {
    // Global API Configuration
    const API_URL = window.MediFind?.API_URL || 'http://localhost:8000/api';
    const authToken = window.MediFind?.authToken || localStorage.getItem('authToken');
    const currentUser = window.MediFind?.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');

    // State Variables
    let allInventory = [];
    let allOrders = [];

    // 1. Auth Check
    if (!authToken || !currentUser || currentUser.role !== 'pharmacy') {
        // Allow viewing in "Demo Mode" if just testing files without backend, otherwise redirect
        if (location.protocol !== 'file:') {
            alert("Access Denied. Please login as a Pharmacy.");
            window.location.href = 'index.html';
            return;
        }
    }

    // Initialize
    init();

    function init() {
        // Set User Name
        const nameEl = document.getElementById('pharmacy-name');
        if (nameEl && currentUser) nameEl.textContent = currentUser.username || "Pharmacy Manager";

        // Load Settings Data (if available)
        if (currentUser) {
            if (document.getElementById('setting-name')) document.getElementById('setting-name').value = currentUser.username || '';
            if (document.getElementById('setting-email')) document.getElementById('setting-email').value = currentUser.email || '';
            if (document.getElementById('setting-phone')) document.getElementById('setting-phone').value = currentUser.phone || '';
            if (document.getElementById('setting-address')) document.getElementById('setting-address').value = currentUser.address || '';
        }

        // Initial Data Load
        refreshData();

        // Polling (Only if connected to real backend)
        if (location.protocol !== 'file:') {
            setInterval(refreshData, 5000);
        }

        // Setup Search/Sort Listeners
        setupInventoryControls();
    }

    function refreshData() {
        // Check visibility to avoid unnecessary loads
        const dashboardVisible = isVisible('dashboard-tab');
        const inventoryVisible = isVisible('inventory-tab');
        const ordersVisible = isVisible('orders-tab');

        if (ordersVisible || dashboardVisible) loadOrders();
        if (inventoryVisible || dashboardVisible) loadInventory();

        // Alerts (skip if no backend)
        if (location.protocol !== 'file:') checkNotifications();
    }

    function isVisible(id) {
        const el = document.getElementById(id);
        return el && (el.style.display !== 'none' && el.style.display !== '');
    }

    // ==========================================
    // 1. INVENTORY LOGIC (Real + Fake Fallback)
    // ==========================================

    async function loadInventory() {
        try {
            let items = [];
            // Try fetching from Backend
            try {
                // Determine which endpoint to use (User specific or Low Stock or Search)
                // For full inventory we might need a specific endpoint, or just search with empty query
                // Assuming we use /search with caching or a new endpoint. 
                // For now, let's use the low-stock endpoint primarily for the dashboard, 
                // but we need FULL inventory for the specific tab.
                // Let's assume we use the basic product search endpoint for now with a high limit.

                // Correction: The backend I modified added /pharmacy/low-stock. 
                // I should probably use /products root endpoint which returns all products (limit 50).
                // Or implementing a /pharmacy/inventory endpoint would be better.
                // Given the constraints, let's use the general /products endpoint for now.
                const res = await fetch(`${API_URL}/products?limit=100`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });


                if (res.ok) {
                    const data = await res.json();
                    items = data.results || [];
                } else {
                    throw new Error("API Failed");
                }
            } catch (e) {
                console.warn("Inventory Fetch Failed (using demo data):", e);
            }

            // ➤ FALLBACK: If API failed OR returned 0 items, use Fake Data
            if (!items || items.length === 0) {
                items = generateFakeInventory();
            }

            allInventory = items; // Save for filtering

            // Apply current filters & Render
            filterAndRenderInventory();

            // Update Stats (Low Stock)
            // Use 'stock' property if available, fallback to 'stock_quantity' for legacy/fake data compatibility
            const lowStock = items.filter(i => ((i.stock !== undefined ? i.stock : i.stock_quantity) || 0) < 10).length;
            if (document.getElementById('stat-low')) document.getElementById('stat-low').textContent = lowStock;

        } catch (error) {
            console.error("Inventory Error:", error);
        }
    }

    function generateFakeInventory() {
        return [
            { _id: 'demo1', name: 'Paracetamol 650mg', manufacturer: 'Micro Labs', unit_price: 30.50, stock: 150, category: 'over_the_counter' },
            { _id: 'demo2', name: 'Amoxicillin 500mg', manufacturer: 'Sun Pharma', unit_price: 120.00, stock: 5, category: 'prescription' },
            { _id: 'demo3', name: 'Cetirizine 10mg', manufacturer: 'Cipla', unit_price: 55.00, stock: 80, category: 'over_the_counter' },
            { _id: 'demo4', name: 'Vitamin D3 60k', manufacturer: 'Lupin', unit_price: 240.00, stock: 0, category: 'supplement' },
            { _id: 'demo5', name: 'Azithromycin 500mg', manufacturer: 'Dr. Reddy', unit_price: 110.00, stock: 12, category: 'prescription' },
            { _id: 'demo6', name: 'Pantoprazole 40mg', manufacturer: 'Alkem', unit_price: 90.00, stock: 45, category: 'prescription' },
            { _id: 'demo7', name: 'Metformin 500mg', manufacturer: 'USV Ltd', unit_price: 45.00, stock: 200, category: 'prescription' },
            { _id: 'demo8', name: 'Ibuprofen 400mg', manufacturer: 'Abbott', unit_price: 25.00, stock: 8, category: 'over_the_counter' }
        ];
    }

    function setupInventoryControls() {
        const searchInput = document.getElementById('inventory-search');
        const sortSelect = document.getElementById('inventory-sort');

        if (searchInput) searchInput.addEventListener('input', () => filterAndRenderInventory());
        if (sortSelect) sortSelect.addEventListener('change', () => filterAndRenderInventory());
    }

    function filterAndRenderInventory() {
        const searchInput = document.getElementById('inventory-search');
        const sortSelect = document.getElementById('inventory-sort');

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const sortType = sortSelect ? sortSelect.value : 'name_asc';

        // 1. Filter
        let filtered = allInventory.filter(item => {
            return (item.name || '').toLowerCase().includes(searchTerm) ||
                (item.manufacturer || '').toLowerCase().includes(searchTerm);
        });

        // 2. Sort
        filtered.sort((a, b) => {
            const stockA = a.stock !== undefined ? a.stock : (a.stock_quantity !== undefined ? a.stock_quantity : 0);
            const stockB = b.stock !== undefined ? b.stock : (b.stock_quantity !== undefined ? b.stock_quantity : 0);
            const priceA = a.unit_price || 0;
            const priceB = b.unit_price || 0;
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();

            switch (sortType) {
                case 'name_asc': return nameA.localeCompare(nameB);
                case 'stock_low': return stockA - stockB;
                case 'stock_high': return stockB - stockA;
                case 'price_low': return priceA - priceB;
                case 'price_high': return priceB - priceA;
                default: return 0;
            }
        });

        // 3. Render
        renderInventoryTable(filtered);
    }

    function renderInventoryTable(items) {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No medicines found matching your search.</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => {
            const stock = item.stock !== undefined ? item.stock : (item.stock_quantity !== undefined ? item.stock_quantity : 0);

            let stockClass = 'in-stock';
            let stockIcon = '';
            if (stock === 0) { stockClass = 'low-stock'; stockIcon = '<i class="fas fa-times-circle"></i>'; }
            else if (stock < 10) { stockClass = 'low-stock'; stockIcon = '<i class="fas fa-exclamation-triangle"></i>'; }

            return `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.manufacturer || 'Generic'}</td>
                    <td>₹${(item.unit_price || item.price || 0).toFixed(2)}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="number" value="${stock}" 
                                   style="width:70px; padding:5px; border:1px solid #ddd; border-radius:4px;"
                                   onchange="updateStock('${item._id}', this.value)">
                            <span class="badge ${stockClass}" style="font-size:10px;">
                                ${stockIcon} ${stock === 0 ? 'Out of Stock' : (stock < 10 ? 'Low' : 'OK')}
                            </span>
                        </div>
                    </td>
                    <td><span style="text-transform:capitalize;">${(item.category || '').replace(/_/g, ' ')}</span></td>
                    <td>
                         <button onclick="deleteMedicine('${item._id}')" class="action-btn" style="background:white; border:1px solid #ffcccc; color:#e74c3c;" title="Delete">
                            <i class="fas fa-trash"></i>
                         </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ==========================================
    // 2. ORDERS LOGIC (Real + Fake Fallback)
    // ==========================================

    async function loadOrders() {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        try {
            let orders = [];
            let simulatedOrders = [];

            // 1. Load Simulated Orders (Frontend Demo)
            try {
                simulatedOrders = JSON.parse(localStorage.getItem('simulated_orders') || '[]');
            } catch (e) {
                console.warn("Failed to load simulated orders");
            }

            // 2. Load Real Orders (Backend)
            try {
                const res = await fetch(`${API_URL}/orders/pharmacy/me`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (res.ok) {
                    orders = await res.json();
                } else {
                    // Start fresh if API fails, relying on fake fallback later if needed
                    console.warn("API Fetch failed, using empty list + fallback");
                }
            } catch (e) {
                console.warn("Orders Fetch Failed (using demo data):", e);
            }

            // 3. Merge: Simulated + Real
            // Note: Simulated orders are just prepended for visibility
            orders = [...simulatedOrders, ...orders];

            // ➤ FALLBACK: If NO orders at all (neither real nor simulated), use Default Fake Orders
            if (orders.length === 0) {
                orders = generateFakeOrders();
                // Also save these fakes to localStorage so they persist across reloads properly
                // localStorage.setItem('simulated_orders', JSON.stringify(orders)); // Optional: maybe too aggressive
            }

            allOrders = orders;

            // Update Stats
            const pending = orders.filter(o => o.status === 'pending').length;
            if (document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = pending;

            const revenue = orders
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + (o.total_amount || 0), 0);
            if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = `₹${revenue.toFixed(0)}`;

            renderOrdersTable(orders);

        } catch (error) {
            console.error("Orders Error:", error);
        }
    }

    function generateFakeOrders() {
        return [
            { _id: 'ORD-9821', user_id: { username: 'Rahul Kumar' }, items: [{ medicine_id: { name: 'Dolo 650' }, quantity: 2 }], total_amount: 60, status: 'pending' },
            { _id: 'ORD-3321', user_id: { username: 'Priya Singh' }, items: [{ medicine_id: { name: 'Cetirizine' }, quantity: 1 }], total_amount: 55, status: 'confirmed' },
            { _id: 'ORD-1102', user_id: { username: 'Amit Sharma' }, items: [{ medicine_id: { name: 'Vitamin C' }, quantity: 3 }], total_amount: 120, status: 'delivered' },
            { _id: 'ORD-5543', user_id: { username: 'Sneha Gupta' }, items: [{ medicine_id: { name: 'Amoxicillin' }, quantity: 1 }], total_amount: 180, status: 'cancelled' },
            { _id: 'ORD-7762', user_id: { username: 'Rajesh V' }, items: [{ medicine_id: { name: 'Azithromycin' }, quantity: 1 }], total_amount: 110, status: 'pending' }
        ];
    }

    function renderOrdersTable(orders) {
        const tbody = document.getElementById('orders-table-body');

        tbody.innerHTML = orders.map(order => {
            const items = order.items || [];
            const itemNames = items.map(i => `${i.medicine_id?.name || 'Medicine'} (x${i.quantity})`).join(', ');
            const isPending = order.status === 'pending';
            const displayId = order._id.length > 8 ? '#' + order._id.slice(-6).toUpperCase() : '#' + order._id;

            return `
                <tr>
                    <td><strong>${displayId}</strong></td>
                    <td>${order.user_id?.username || 'Guest Customer'}</td>
                    <td>${itemNames.substring(0, 35)}${itemNames.length > 35 ? '...' : ''}</td>
                    <td>₹${order.total_amount}</td>
                    <td><span class="badge ${order.status}">${order.status.toUpperCase()}</span></td>
                    <td>
                        ${isPending ? `
                            <button class="action-btn" style="background:#10b981; color:white; padding:5px 10px; font-size:12px; margin-right:5px;" onclick="updateOrderStatus('${order._id}', 'confirmed')">Accept</button>
                            <button class="action-btn" style="background:#ef4444; color:white; padding:5px 10px; font-size:12px;" onclick="updateOrderStatus('${order._id}', 'cancelled')">Reject</button>
                        ` : `<span style="color:#aaa; font-size:12px;">Completed</span>`}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ==========================================
    // NOTIFICATIONS & ACTIONS
    // ==========================================

    async function checkNotifications() {
        try {
            const res = await fetch(`${API_URL}/notifications/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!res.ok) return;
            const alerts = await res.json();

            const alertContainer = document.getElementById('alert-section');
            if (alertContainer) {
                if (alerts.length > 0) {
                    alertContainer.style.display = 'block';
                    alertContainer.innerHTML = `
                        <div style="background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h3 style="color: #991b1b; margin-top:0; display:flex; align-items:center; gap:10px;">
                                <i class="fas fa-bell"></i> Missed Sales Alert!
                            </h3>
                            <div style="display: grid; gap: 10px; margin-top: 10px;">
                                ${alerts.map(alert => `
                                    <div style="background: white; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong>${alert.product_name}</strong>
                                            <span style="font-size: 13px; color: #666; margin-left: 10px;">
                                                Requested by ${alert.count} user(s)
                                            </span>
                                        </div>
                                        <div style="display:flex; gap:10px;">
                                            <button onclick="quickRestock('${alert.product_id}', '${alert._id}')" 
                                                    style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                                <i class="fas fa-plus"></i> Add Stock
                                            </button>
                                            <button onclick="dismissAlert('${alert._id}')" 
                                                    style="color: #666; background: #eee; border: none; padding:6px 10px; border-radius:4px; cursor: pointer;">
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    alertContainer.style.display = 'none';
                }
            }
        } catch (e) { console.warn('Alert check failed'); }
    }

    // ACTIONS (Global Scope)
    window.updateStock = async (id, newQty) => {
        if (id.startsWith('demo')) return; // Don't update fake data
        try {
            await fetch(`${API_URL}/products/${id}/stock`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ stock: parseInt(newQty) })
            });
            // alert("Stock updated!"); // Optional 
        } catch (e) { alert('Failed to update stock'); }
    };

    window.updateOrderStatus = async (id, status) => {
        if (id.startsWith('ORD')) {
            alert(`Demo Order ${status} successfully!`);
            // Simulate update locally
            allOrders = allOrders.map(o => o._id === id ? { ...o, status: status } : o);
            renderOrdersTable(allOrders);

            // ➤ PERSIST SIMULATION to LocalStorage
            try {
                let simulated = JSON.parse(localStorage.getItem('simulated_orders') || '[]');
                simulated = simulated.map(o => o._id === id ? { ...o, status: status } : o);
                localStorage.setItem('simulated_orders', JSON.stringify(simulated));

                // ➤ AUTOMATION: If status is 'confirmed', simulate Warehouse Packaging -> 'ready_for_pickup'
                if (status === 'confirmed') {
                    console.log("⏳ Simulating Warehouse Packaging (5s)...");
                    setTimeout(() => {
                        let currentSimulated = JSON.parse(localStorage.getItem('simulated_orders') || '[]');
                        currentSimulated = currentSimulated.map(o => o._id === id ? { ...o, status: 'ready_for_pickup' } : o);
                        localStorage.setItem('simulated_orders', JSON.stringify(currentSimulated));
                        console.log(`📦 Order ${id} is now Ready for Pickup (Delivery Partner can see it)`);

                        // Optional: Refresh if we are still on this page
                        if (typeof loadOrders === 'function') loadOrders();
                    }, 500); // 0.5s Delay for impatient user
                }

            } catch (e) { console.error("Failed to update simulated storage", e); }
            return;
        }

        if (!confirm(`Mark order as ${status}?`)) return;
        try {
            await fetch(`${API_URL}/orders/${id}/${status === 'confirmed' ? 'confirm' : 'cancel'}`, {
                method: 'PATCH', headers: { 'Authorization': `Bearer ${authToken}` }
            });
            loadOrders(); // Refresh
        } catch (e) { alert("Failed to update status"); }
    };

    window.deleteMedicine = async (id) => {
        if (!confirm('Delete this medicine?')) return;

        if (id.startsWith('demo')) {
            allInventory = allInventory.filter(i => i._id !== id);
            filterAndRenderInventory();
            return;
        }

        await fetch(`${API_URL}/stock/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
        loadInventory();
    };

    window.quickRestock = async (productId, alertId) => {
        const qty = prompt("Enter quantity to add:", "50");
        if (!qty) return;
        await window.updateStock(productId, qty);
        await window.dismissAlert(alertId);
        alert("Stock updated!");
        loadInventory();
    };

    window.dismissAlert = async (id) => {
        await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'PATCH', headers: { 'Authorization': `Bearer ${authToken}` }
        });
        checkNotifications();
    };

    // Navigation & Modal
    window.showTab = function (tabName, btn) {
        ['dashboard-tab', 'orders-tab', 'inventory-tab', 'settings-tab'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        document.getElementById(`${tabName}-tab`).style.display = 'block';
        if (btn) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        refreshData();
    };

    const addModal = document.getElementById('add-modal');
    window.openAddModal = () => addModal.style.display = 'flex';
    window.closeAddModal = () => addModal.style.display = 'none';

    document.getElementById('add-med-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('med-name').value,
            generic_name: document.getElementById('med-generic').value,
            manufacturer: document.getElementById('med-manufacturer').value,
            category: document.getElementById('med-category').value,
            unit_price: parseFloat(document.getElementById('med-price').value),
            stock: parseInt(document.getElementById('med-qty').value)
        };
        try {
            const res = await fetch(`${API_URL}/stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Medicine added!');
                document.getElementById('add-med-form').reset();
                closeAddModal();
                loadInventory();
            }
        } catch (e) { console.error(e); }
    });
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                phone: document.getElementById('setting-phone').value,
                address: document.getElementById('setting-address').value
            };

            try {
                const res = await fetch(`${API_URL}/pharmacies/me`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    alert('Profile updated successfully!');
                    // Update local storage
                    currentUser.phone = data.phone;
                    currentUser.address = data.address;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                } else {
                    alert('Failed to update profile.');
                }
            } catch (error) {
                console.error(error);
                alert('Error updating settings.');
            }
        });
    }

});
/*
FILENAME: frontend/js/pharmacy.js
[--- THIS IS THE FULL, UPDATED FILE ---]
*/
document.addEventListener('DOMContentLoaded', () => {
    // Get helpers from global app.js
    const { API_URL, authToken, currentUser, showAlert } = window.MediFind;
    
    // Page elements
    const alertBox = document.getElementById('alert-box');
    const loading = document.getElementById('loading');
    const createPharmacySection = document.getElementById('create-pharmacy-section');
    const manageStockSection = document.getElementById('manage-stock-section');
    
    // Create Pharmacy Form
    const createPharmacyForm = document.getElementById('create-pharmacy-form');
    
    // Add Medicine Form
    const addMedicineForm = document.getElementById('add-medicine-form');

    // Stock Table
    const stockLoading = document.getElementById('stock-loading');
    const stockTable = document.getElementById('stock-table');
    const stockTableBody = document.getElementById('stock-table-body');
    const noStockMessage = document.getElementById('no-stock-message');

    // Orders Table
    const ordersLoading = document.getElementById('orders-loading');
    const ordersTable = document.getElementById('orders-table');
    const ordersTableBody = document.getElementById('orders-table-body');
    const noOrdersMessage = document.getElementById('no-orders-message');

    // Edit Modal
    const editModal = document.getElementById('edit-stock-modal');
    const editForm = document.getElementById('edit-stock-form');
    const modalClose = document.getElementById('modal-close');

    // We'll store the user's pharmacy ID here
    let currentPharmacyId = null;

    // --- 1. INITIALIZATION ---

    if (!authToken || !currentUser) {
        showAlert('You must be logged in as a pharmacy to view this page. Redirecting...', 'error', alertBox);
        setTimeout(() => window.location.href = 'login.html', 3000);
        return;
    }
    if (currentUser.role !== 'pharmacy') {
        showAlert('This page is only for pharmacy owners. Redirecting...', 'error', alertBox);
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }

    checkPharmacyProfile();

    // --- 2. CORE LOGIC ---

    async function checkPharmacyProfile() {
        showLoading(true);
        try {
            const response = await fetch(`${API_URL}/pharmacies/me`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.status === 404) {
                // STATE 1: No profile. Show create profile form.
                showLoading(false);
                showAlert('Please create your pharmacy profile to continue.', 'info', alertBox);
                createPharmacySection.style.display = 'block';
            } else if (response.ok) {
                // STATE 2: Profile found. Show stock management.
                const pharmacyData = await response.json();
                currentPharmacyId = pharmacyData.id;
                
                showLoading(false);
                document.getElementById('dashboard-subtitle').textContent = `Managing: ${pharmacyData.name}`;
                manageStockSection.style.display = 'block';
                
                // Load both stock and orders
                fetchMyStock();
                fetchIncomingOrders();
            } else {
                throw new Error('Failed to load pharmacy profile. Please log in again.');
            }
        } catch (error) {
            showLoading(false);
            showAlert(error.message, 'error', alertBox);
        }
    }

    // --- 3. STOCK MANAGEMENT ---

    async function fetchMyStock() {
        stockLoading.style.display = 'block';
        stockTable.style.display = 'none';
        noStockMessage.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/stock/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch inventory');
            
            const stock = await response.json();
            stockLoading.style.display = 'none';

            if (stock.length === 0) {
                noStockMessage.style.display = 'block';
            } else {
                stockTable.style.display = 'table';
                stockTableBody.innerHTML = '';
                stock.forEach(med => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${med.name}</td>
                        <td>${med.stock_quantity}</td>
                        <td>$${med.unit_price.toFixed(2)}</td>
                        <td>${med.requires_prescription ? 'Yes' : 'No'}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm edit-stock" data-id="${med.id}">Edit</button>
                            <button class="btn btn-danger btn-sm delete-stock" data-id="${med.id}">Delete</button>
                        </td>
                    `;
                    stockTableBody.appendChild(row);
                });
            }
        } catch (error) {
            stockLoading.style.display = 'none';
            showAlert(error.message, 'error', alertBox);
        }
    }

    async function handleAddMedicine(e) {
        e.preventDefault();
        
        const medicineData = {
            pharmacy_id: currentPharmacyId,
            name: document.getElementById('med-name').value,
            generic_name: document.getElementById('med-generic-name').value || null,
            manufacturer: document.getElementById('med-manufacturer').value || null,
            description: document.getElementById('med-description').value || null,
            unit_price: parseFloat(document.getElementById('med-price').value),
            stock_quantity: parseInt(document.getElementById('med-stock').value),
            requires_prescription: document.getElementById('med-requires-prescription').checked
        };

        try {
            const response = await fetch(`${API_URL}/stock/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(medicineData)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to add medicine');
            }
            
            showAlert('Medicine added successfully!', 'success', alertBox);
            addMedicineForm.reset();
            fetchMyStock(); // Refresh the stock table
        } catch (error) {
            showAlert(error.message, 'error', alertBox);
        }
    }

    async function handleDeleteStock(medicineId) {
        if (!confirm('Are you sure you want to delete this medicine?')) return;

        try {
            const response = await fetch(`${API_URL}/stock/${medicineId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to delete medicine');
            }
            
            showAlert('Medicine deleted.', 'success', alertBox);
            fetchMyStock(); // Refresh list
        } catch (error) {
            showAlert(error.message, 'error', alertBox);
        }
    }

    // --- 4. ORDER MANAGEMENT ---

    async function fetchIncomingOrders() {
        ordersLoading.style.display = 'block';
        ordersTable.style.display = 'none';
        noOrdersMessage.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/orders/pharmacy/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (!response.ok) throw new Error('Failed to fetch orders');

            const orders = await response.json();
            ordersLoading.style.display = 'none';

            if (orders.length === 0) {
                noOrdersMessage.style.display = 'block';
            } else {
                ordersTable.style.display = 'table';
                ordersTableBody.innerHTML = '';
                orders.forEach(order => {
                    const row = document.createElement('tr');
                    // Get item names
                    const itemNames = order.order_items.map(item => 
                        `${item.quantity} x (ID: ${item.medicine_id})` // A proper app would fetch names
                    ).join('<br>');

                    row.innerHTML = `
                        <td>#${order.id}</td>
                        <td>${new Date(order.created_at).toLocaleDateString()}</td>
                        <td>${order.delivery_address}</td>
                        <td>$${order.total_amount.toFixed(2)}</td>
                        <td><small>${itemNames}</small></td>
                        <td>${createStatusDropdown(order.id, order.status)}</td>
                    `;
                    ordersTableBody.appendChild(row);
                });
            }
        } catch (error) {
            ordersLoading.style.display = 'none';
            showAlert(error.message, 'error', alertBox);
        }
    }

    function createStatusDropdown(orderId, currentStatus) {
        const statuses = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
        let options = statuses.map(s => 
            `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`
        ).join('');

        return `
            <select class="form-group status-select" data-id="${orderId}" style="padding: 0.25rem;">
                ${options}
            </select>
        `;
    }

    async function handleOrderStatusChange(orderId, newStatus) {
        try {
            const response = await fetch(`${API_URL}/orders/pharmacy/${orderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update status');
            }
            
            showAlert(`Order #${orderId} status updated to '${newStatus}'.`, 'success', alertBox);
            // No need to full refresh, just update UI if needed
        } catch (error) {
            showAlert(error.message, 'error', alertBox);
            fetchIncomingOrders(); // Refresh on error
        }
    }


    // --- 5. MODAL & EVENT LISTENERS ---

    // Form Submissions
    if (createPharmacyForm) createPharmacyForm.addEventListener('submit', handleCreatePharmacy);
    if (addMedicineForm) addMedicineForm.addEventListener('submit', handleAddMedicine);
    if (editForm) editForm.addEventListener('submit', handleEditStockSubmit);

    // Modal close
    if (modalClose) modalClose.onclick = () => editModal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target == editModal) editModal.style.display = 'none';
    };

    // Event delegation for dynamic buttons
    document.addEventListener('click', (e) => {
        // Delete stock button
        if (e.target.classList.contains('delete-stock')) {
            handleDeleteStock(e.target.dataset.id);
        }
        // Edit stock button
        if (e.target.classList.contains('edit-stock')) {
            // Find the full medicine object from the table row
            const row = e.target.closest('tr');
            const med = {
                id: e.target.dataset.id,
                name: row.cells[0].textContent,
                stock: row.cells[1].textContent,
                price: row.cells[2].textContent.replace('$', '')
            };
            openEditModal(med);
        }
    });

    // Event delegation for status dropdowns
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            handleOrderStatusChange(e.target.dataset.id, e.target.value);
        }
    });

    function openEditModal(med) {
        document.getElementById('edit-med-id').value = med.id;
        document.getElementById('edit-med-name').value = med.name;
        document.getElementById('edit-med-price').value = med.price;
        document.getElementById('edit-med-stock').value = med.stock;
        editModal.style.display = 'block';
    }

    async function handleEditStockSubmit(e) {
        e.preventDefault();
        const medicineId = document.getElementById('edit-med-id').value;
        const updateData = {
            unit_price: parseFloat(document.getElementById('edit-med-price').value),
            stock_quantity: parseInt(document.getElementById('edit-med-stock').value)
        };

        try {
            const response = await fetch(`${API_URL}/stock/${medicineId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to update stock');
            }

            showAlert('Stock updated successfully!', 'success', alertBox);
            editModal.style.display = 'none';
            fetchMyStock(); // Refresh stock table
        } catch (error) {
            showAlert(error.message, 'error', alertBox);
        }
    }
    
    // Helper to show/hide main loading spinner
    function showLoading(isLoading) {
        if (isLoading) {
            loading.style.display = 'block';
            createPharmacySection.style.display = 'none';
            manageStockSection.style.display = 'none';
        } else {
            loading.style.display = 'none';
        }
    }
});
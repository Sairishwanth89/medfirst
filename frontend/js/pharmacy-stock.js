// Pharmacy Stock Management JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const authToken = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!authToken || !currentUser || currentUser.role !== 'pharmacy') {
        window.location.href = 'index.html';
        return;
    }

    loadMedicines();

    // Search functionality
    document.getElementById('medicine-search').addEventListener('input', filterMedicines);
    document.getElementById('category-filter').addEventListener('change', filterMedicines);
    document.getElementById('stock-filter').addEventListener('change', filterMedicines);
});

let allMedicines = [];

async function loadMedicines() {
    try {
        const response = await fetch('http://localhost:8000/api/stock/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (response.ok) {
            allMedicines = await response.json();
            displayMedicines(allMedicines);
            updateStats(allMedicines);
        }
    } catch (error) {
        console.error('Error loading medicines:', error);
    }
}

function displayMedicines(medicines) {
    const tbody = document.getElementById('medicine-table-body');

    if (medicines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">No medicines found</td></tr>';
        return;
    }

    tbody.innerHTML = medicines.map(med => `
        <tr>
            <td>
                <div class="medicine-name">
                    <strong>${med.name}</strong>
                    <small>${med.description || 'No description available'}</small>
                </div>
            </td>
            <td><span class="category-badge ${getCategoryClass(med.category || 'over_the_counter')}">${med.category || 'over_the_counter'}</span></td>
            <td>₹${med.unit_price.toFixed(2)}</td>
            <td>${med.stock_quantity} units</td>
            <td><span class="stock-badge ${getStockClass(med.stock_quantity)}">${getStockStatus(med.stock_quantity)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="icon-btn edit-btn" title="Edit" onclick="editMedicine('${med._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete-btn" title="Delete" onclick="deleteMedicine('${med._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getCategoryClass(category) {
    const map = {
        'over_the_counter': 'otc',
        'prescription': 'prescription',
        'supplement': 'supplement'
    };
    return map[category] || 'otc';
}

function getStockClass(quantity) {
    if (quantity === 0) return 'out-of-stock';
    if (quantity < 20) return 'low-stock';
    return 'in-stock';
}

function getStockStatus(quantity) {
    if (quantity === 0) return 'Out of Stock';
    if (quantity < 20) return 'Low Stock';
    return 'In Stock';
}

function updateStats(medicines) {
    document.getElementById('total-medicines-count').textContent = medicines.length;
    document.getElementById('low-stock-count').textContent = medicines.filter(m => m.stock_quantity < 20 && m.stock_quantity > 0).length;
    document.getElementById('out-of-stock-count').textContent = medicines.filter(m => m.stock_quantity === 0).length;
    document.getElementById('expiring-soon-count').textContent = 0;
}

function filterMedicines() {
    const searchTerm = document.getElementById('medicine-search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const stockFilter = document.getElementById('stock-filter').value;

    let filtered = allMedicines.filter(med => {
        const matchesSearch = med.name.toLowerCase().includes(searchTerm) ||
                             (med.generic_name && med.generic_name.toLowerCase().includes(searchTerm));

        const matchesCategory = !categoryFilter || med.category === categoryFilter;

        let matchesStock = true;
        if (stockFilter === 'in_stock') matchesStock = med.stock_quantity >= 20;
        else if (stockFilter === 'low_stock') matchesStock = med.stock_quantity < 20 && med.stock_quantity > 0;
        else if (stockFilter === 'out_of_stock') matchesStock = med.stock_quantity === 0;

        return matchesSearch && matchesCategory && matchesStock;
    });

    displayMedicines(filtered);
}

function openAddMedicineModal() {
    document.getElementById('modal-title').textContent = 'Add New Medicine';
    document.getElementById('add-medicine-form').reset();
    document.getElementById('add-medicine-modal').style.display = 'flex';
}

function closeAddMedicineModal() {
    document.getElementById('add-medicine-modal').style.display = 'none';
}

window.addEventListener('click', (e) => {
    const modal = document.getElementById('add-medicine-modal');
    if (e.target === modal) {
        closeAddMedicineModal();
    }
});

document.getElementById('add-medicine-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const medicineData = {
        name: document.getElementById('med-name').value,
        generic_name: document.getElementById('med-generic').value,
        description: document.getElementById('med-description').value,
        category: document.getElementById('med-category').value,
        manufacturer: document.getElementById('med-manufacturer').value,
        unit_price: parseFloat(document.getElementById('med-price').value),
        stock_quantity: parseInt(document.getElementById('med-stock').value)
    };

    try {
        const response = await fetch('http://localhost:8000/api/stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(medicineData)
        });

        if (response.ok) {
            alert('Medicine added successfully!');
            closeAddMedicineModal();
            loadMedicines();
        } else {
            const error = await response.json();
            alert('Error: ' + (error.detail || 'Failed to add medicine'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add medicine. Please try again.');
    }
});

function editMedicine(id) {
    alert('Edit functionality will be implemented soon!');
}

function deleteMedicine(id) {
    if (confirm('Are you sure you want to delete this medicine?')) {
        alert('Delete functionality will be implemented soon!');
    }
}

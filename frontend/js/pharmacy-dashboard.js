// Pharmacy Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const authToken = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!authToken || !currentUser || currentUser.role !== 'pharmacy') {
        window.location.href = 'index.html';
        return;
    }

    loadDashboardData();
});

function openAddMedicineModal() {
    document.getElementById('add-medicine-modal').style.display = 'flex';
}

function closeAddMedicineModal() {
    document.getElementById('add-medicine-modal').style.display = 'none';
    document.getElementById('add-medicine-form').reset();
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('add-medicine-modal');
    if (e.target === modal) {
        closeAddMedicineModal();
    }
});

// Handle form submission
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
            loadDashboardData();
        } else {
            const error = await response.json();
            alert('Error: ' + (error.detail || 'Failed to add medicine'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add medicine. Please try again.');
    }
});

async function loadDashboardData() {
    try {
        // Load stats
        const statsResponse = await fetch('http://localhost:8000/api/stock/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (statsResponse.ok) {
            const medicines = await statsResponse.json();
            document.getElementById('total-medicines').textContent = medicines.length;

            const lowStock = medicines.filter(m => m.stock_quantity < 20);
            document.querySelector('#low-stock-count').textContent = lowStock.length;
        }

        // Load orders
        const ordersResponse = await fetch('http://localhost:8000/api/orders/pharmacy/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            const pendingOrders = orders.filter(o => o.status === 'pending');
            document.getElementById('pending-orders').textContent = pendingOrders.length;

            // Calculate orders today
            const today = new Date().toDateString();
            const ordersToday = orders.filter(o => {
                const orderDate = new Date(o.created_at).toDateString();
                return orderDate === today;
            });
            document.getElementById('orders-today').textContent = ordersToday.length;

            // Calculate revenue today
            const revenueToday = ordersToday.reduce((sum, order) => sum + order.total_amount, 0);
            document.getElementById('revenue-today').textContent = `₹${revenueToday.toFixed(0)}`;
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

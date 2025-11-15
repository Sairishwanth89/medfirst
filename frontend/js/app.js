// API Base URL
const API_URL = 'http://localhost:8000/api';

// Auth state
let currentUser = null;
let authToken = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved auth token
    authToken = localStorage.getItem('authToken');
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    updateAuthUI();
    
    // Event listeners
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
    
    const authLink = document.getElementById('auth-link');
    if (authLink) {
        authLink.addEventListener('click', handleAuthClick);
    }
    
    // Modal close button
    const modalClose = document.querySelector('.close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            document.getElementById('order-modal').style.display = 'none';
        });
    }
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('order-modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Update auth UI
function updateAuthUI() {
    const authLink = document.getElementById('auth-link');
    if (authToken && currentUser) {
        authLink.textContent = `Logout (${currentUser.username})`;
    } else {
        authLink.textContent = 'Login';
    }
}

// Handle auth link click
function handleAuthClick(e) {
    e.preventDefault();
    
    if (authToken) {
        // Logout
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        authToken = null;
        currentUser = null;
        updateAuthUI();
        showAlert('Logged out successfully', 'success');
    } else {
        // Redirect to login (or show login modal)
        window.location.href = 'login.html';
    }
}

// Handle medicine search
async function handleSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('medicine-query').value;
    const city = document.getElementById('city-filter').value;
    const maxPrice = document.getElementById('max-price').value;
    const is24Hours = document.getElementById('is-24-hours').checked;
    const noPrescription = document.getElementById('no-prescription').checked;
    
    const searchData = {
        query: query,
        city: city || null,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        is_24_hours: is24Hours || null,
        requires_prescription: noPrescription ? false : null,
        limit: 20
    };
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/medicines/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchData)
        });
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const results = await response.json();
        displayResults(results);
        
    } catch (error) {
        console.error('Search error:', error);
        showAlert('Failed to search medicines. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Display search results
function displayResults(results) {
    const resultsSection = document.getElementById('results-section');
    const resultsContainer = document.getElementById('results-container');
    
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p>No medicines found matching your search.</p>';
        resultsSection.style.display = 'block';
        return;
    }
    
    results.forEach(medicine => {
        const card = createMedicineCard(medicine);
        resultsContainer.appendChild(card);
    });
    
    resultsSection.style.display = 'block';
}

// Create medicine card element
function createMedicineCard(medicine) {
    const card = document.createElement('div');
    card.className = 'medicine-card';
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'medicine-info';
    
    const name = document.createElement('h4');
    name.textContent = medicine.name || medicine.medicine_name;
    infoDiv.appendChild(name);
    
    const genericName = document.createElement('p');
    genericName.textContent = `Generic: ${medicine.generic_name || 'N/A'}`;
    infoDiv.appendChild(genericName);
    
    const pharmacy = document.createElement('p');
    pharmacy.innerHTML = `<strong>Pharmacy:</strong> ${medicine.pharmacy_name}`;
    infoDiv.appendChild(pharmacy);
    
    const location = document.createElement('p');
    location.innerHTML = `<strong>Location:</strong> ${medicine.pharmacy_address || medicine.pharmacy_city}`;
    infoDiv.appendChild(location);
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'medicine-meta';
    
    const stockBadge = document.createElement('span');
    stockBadge.className = 'badge badge-success';
    stockBadge.textContent = `Stock: ${medicine.stock_quantity}`;
    metaDiv.appendChild(stockBadge);
    
    if (medicine.is_24_hours) {
        const hoursBadge = document.createElement('span');
        hoursBadge.className = 'badge badge-info';
        hoursBadge.textContent = '24 Hours';
        metaDiv.appendChild(hoursBadge);
    }
    
    infoDiv.appendChild(metaDiv);
    card.appendChild(infoDiv);
    
    const actionDiv = document.createElement('div');
    
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = `$${medicine.unit_price?.toFixed(2) || '0.00'}`;
    actionDiv.appendChild(price);
    
    const orderBtn = document.createElement('button');
    orderBtn.className = 'btn btn-success';
    orderBtn.textContent = 'Order Now';
    orderBtn.style.marginTop = '0.5rem';
    orderBtn.onclick = () => openOrderModal(medicine);
    actionDiv.appendChild(orderBtn);
    
    card.appendChild(actionDiv);
    
    return card;
}

// Open order modal
function openOrderModal(medicine) {
    if (!authToken) {
        showAlert('Please login to place an order', 'error');
        return;
    }
    
    const modal = document.getElementById('order-modal');
    const detailsDiv = document.getElementById('order-medicine-details');
    
    detailsDiv.innerHTML = `
        <p><strong>${medicine.name}</strong></p>
        <p>Price: $${medicine.unit_price?.toFixed(2) || '0.00'} per unit</p>
        <p>Pharmacy: ${medicine.pharmacy_name}</p>
    `;
    
    modal.style.display = 'block';
    
    // Set up order form submission
    const orderForm = document.getElementById('order-form');
    orderForm.onsubmit = (e) => handleOrderSubmit(e, medicine);
}

// Handle order submission
async function handleOrderSubmit(e, medicine) {
    e.preventDefault();
    
    const quantity = parseInt(document.getElementById('order-quantity').value);
    const address = document.getElementById('delivery-address').value;
    const notes = document.getElementById('order-notes').value;
    
    const orderData = {
        pharmacy_id: medicine.pharmacy_id,
        delivery_address: address,
        notes: notes,
        items: [
            {
                medicine_id: medicine.id,
                quantity: quantity
            }
        ]
    };
    
    try {
        const response = await fetch(`${API_URL}/orders/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Order failed');
        }
        
        const order = await response.json();
        document.getElementById('order-modal').style.display = 'none';
        showAlert('Order placed successfully!', 'success');
        
        // Reset form
        document.getElementById('order-form').reset();
        
    } catch (error) {
        console.error('Order error:', error);
        showAlert(`Failed to place order: ${error.message}`, 'error');
    }
}

// Show loading indicator
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

// Show alert message
function showAlert(message, type) {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Insert at top of main content
    const main = document.querySelector('main.container');
    if (main) {
        main.insertBefore(alert, main.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Export functions for use in other pages
window.MediFind = {
    API_URL,
    showAlert,
    showLoading,
    get authToken() { return authToken; },
    set authToken(value) { 
        authToken = value;
        if (value) {
            localStorage.setItem('authToken', value);
        } else {
            localStorage.removeItem('authToken');
        }
        updateAuthUI();
    },
    get currentUser() { return currentUser; },
    set currentUser(value) {
        currentUser = value;
        if (value) {
            localStorage.setItem('currentUser', JSON.stringify(value));
        } else {
            localStorage.removeItem('currentUser');
        }
        updateAuthUI();
    }
};

const API_URL = 'http://localhost:8000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// expose globals so other pages can read auth state and call logout
function syncGlobals() {
    if (!window.MediFind) window.MediFind = {};
    window.MediFind.API_URL = API_URL;
    window.MediFind.authToken = authToken;
    window.MediFind.currentUser = currentUser;
    window.MediFind.showAlert = window.MediFind.showAlert || ((msg) => alert(msg));

    // central setter used by login/logout across pages
    window.MediFind.setAuth = (token, user) => {
        authToken = token;
        currentUser = user;
        if (token) {
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
        window.MediFind.authToken = authToken;
        window.MediFind.currentUser = currentUser;
        try { if (typeof updateAuthUI === 'function') updateAuthUI(); } catch (e) { }
    };

    // reliable centralized logout
    window.MediFind.logout = () => {
        console.log("Logging out...");
        window.MediFind.setAuth(null, null);
        // keep other localStorage keys (cart) intact
        window.location.replace('index.html');
    };
}
syncGlobals();

// Global fallback for HTML onclick attributes
window.logout = window.MediFind.logout;

// Initialize Cart from LocalStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Auth UI Updates
// Auth UI Updates
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const cartCountEl = document.getElementById('cart-count');
    const myOrdersLink = document.getElementById('nav-my-orders');

    if (loginBtn) {
        if (authToken && currentUser) {
            loginBtn.innerHTML = `
                <i class="fas fa-user"></i> ${currentUser.name || currentUser.username || 'User'} 
                <span class="logout-link" style="margin-left: 10px; color: #ffcccc; text-decoration: underline; cursor: pointer; font-size: 0.9em;">(Logout)</span>
            `;
            loginBtn.onclick = null;
            if (myOrdersLink) myOrdersLink.style.display = 'inline-block'; // Show My Orders

            // Attach logout listener specifically to the span
            setTimeout(() => {
                const logoutLink = loginBtn.querySelector('.logout-link');
                if (logoutLink) {
                    logoutLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.MediFind.logout();
                    });
                }
            }, 0);
        } else {
            // Reset to "Hello, Log in" when logged out
            loginBtn.innerHTML = '<i class="fas fa-user"></i> Hello, Log in';
            loginBtn.onclick = (e) => {
                if (e) e.preventDefault();
                openAuthModal();
            };
            if (myOrdersLink) myOrdersLink.style.display = 'none'; // Hide My Orders
        }
    }
    updateCartUI();
}

// --- Cart Functionality ---

function updateCartUI() {
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
        cartCountEl.innerText = totalItems;
        cartCountEl.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

window.addToCart = function (medicineId, name, price, pharmacyId) {
    // Check if item exists
    const existingItem = cart.find(item => item.medicineId === medicineId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            medicineId,
            name,
            price,
            pharmacyId,
            quantity: 1
        });
    }

    // Save to LocalStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    alert(`${name} added to cart!`);
}

const modal = document.getElementById('auth-modal');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');

function openAuthModal() { if (modal) { modal.style.display = 'flex'; showLogin(); } }
function closeAuthModal() { if (modal) modal.style.display = 'none'; }
function showLogin() { if (loginView) { loginView.style.display = 'block'; signupView.style.display = 'none'; } }
function showSignup() { if (loginView) { loginView.style.display = 'none'; signupView.style.display = 'block'; } }

window.onclick = function (event) {
    if (event.target == modal) closeAuthModal();
    const locModal = document.getElementById('location-modal');
    if (event.target == locModal && typeof closeLocationModal === 'function') closeLocationModal();
}

// Login Handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            authToken = data.access_token; currentUser = data.user;

            syncGlobals(); // <-- keep window.MediFind updated
            updateAuthUI();
            closeAuthModal();
            alert(`Welcome back, ${data.user.username}!`);

            // --- FIXED REDIRECTION LOGIC ---
            console.log("User Role:", data.user.role); // Debugging line

            if (data.user.role === 'pharmacy') {
                window.location.href = 'pharmacy.html';
            } else if (data.user.role === 'delivery') {
                window.location.href = 'delivery.html';
            } else {
                // For patients or if role is undefined, stay on index but reload to update UI
                window.location.href = 'index.html';
            }

        } catch (err) { alert(err.message); }
    });
}

// Signup Handler
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = signupForm.querySelector('button');
        const originalText = btn.innerText;
        btn.innerText = "Creating Account...";
        btn.disabled = true;

        const data = {
            full_name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            username: document.getElementById('reg-username').value,
            password: document.getElementById('reg-password').value,
            role: document.getElementById('reg-role').value
        };

        try {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const responseData = await res.json();
            if (!res.ok) throw new Error(responseData.detail || 'Signup failed');

            // Auto-login
            if (responseData.access_token) {
                localStorage.setItem('authToken', responseData.access_token);
                localStorage.setItem('currentUser', JSON.stringify(responseData.user));

                syncGlobals();
                closeAuthModal();
                alert('Account created successfully!');

                if (responseData.user.role === 'pharmacy') window.location.href = 'pharmacy.html';
                else if (responseData.user.role === 'delivery') window.location.href = 'delivery.html';
                else window.location.reload();
            }
        } catch (err) {
            alert("Error: " + err.message);
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}


function logout() {
    // Clear all stored user data from localStorage (keep cart intact)
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    sessionStorage.clear();

    // Reset global variables immediately (do not clear cart)
    authToken = null;
    currentUser = null;

    // Update UI before redirect
    updateAuthUI();

    // Redirect to home page
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 100);
}

// --- Geolocation Logic ---
// --- Geolocation Logic ---
window.locatePharmacy = function () {
    const modal = document.getElementById('location-modal');
    const resultsDiv = document.getElementById('location-results');

    // Open Modal
    if (modal) {
        modal.style.display = 'flex';
        // Reset content
        if (resultsDiv) resultsDiv.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#06b6d4;"></i><p style="margin-top:10px; color:#6b7280;">Scanning for nearby pharmacies...</p></div>';
    }

    if (!navigator.geolocation) {
        if (resultsDiv) resultsDiv.innerHTML = '<p style="color:red; text-align:center;">Geolocation is not supported by your browser.</p>';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Fake "Finding" delay
            setTimeout(() => {
                const lat = position.coords.latitude.toFixed(4);
                const lon = position.coords.longitude.toFixed(4);

                // Show nice list in modal
                if (resultsDiv) {
                    resultsDiv.innerHTML = `
                        <p style="color:#10b981; text-align:center; font-size:0.9em; margin-bottom:15px;"><i class="fas fa-check-circle"></i> Location Found (${lat}, ${lon})</p>
                        
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <div style="border:1px solid #e5e7eb; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <h4 style="margin:0; font-size:1rem;">Apollo Pharmacy</h4>
                                    <small style="color:#6b7280;">0.2 km away • Open now</small>
                                </div>
                                <button style="background:#06b6d4; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:0.8rem;">Visit</button>
                            </div>

                            <div style="border:1px solid #e5e7eb; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <h4 style="margin:0; font-size:1rem;">Wellness Forever</h4>
                                    <small style="color:#6b7280;">0.5 km away • Open now</small>
                                </div>
                                <button style="background:#06b6d4; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:0.8rem;">Visit</button>
                            </div>

                            <div style="border:1px solid #e5e7eb; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <h4 style="margin:0; font-size:1rem;">MedPlus</h4>
                                    <small style="color:#6b7280;">1.1 km away • Closing soon</small>
                                </div>
                                <button style="background:#06b6d4; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:0.8rem;">Visit</button>
                            </div>
                        </div>
                        <div style="margin-top:20px; text-align:center;">
                            <button onclick="closeLocationModal()" style="color:#6b7280; background:none; border:none; text-decoration:underline; cursor:pointer;">Close</button>
                        </div>
                    `;
                }
            }, 1200);
        },
        (error) => {
            if (resultsDiv) resultsDiv.innerHTML = '<p style="color:red; text-align:center;">Unable to retrieve your location. Please check permissions.</p>';
        }
    );
};

window.closeLocationModal = function () {
    const modal = document.getElementById('location-modal');
    if (modal) modal.style.display = 'none';
}

// --- Search Logic ---

async function handleSearch() {
    const query = document.getElementById('medicine-query').value;
    const loading = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    if (loading) loading.style.display = 'block';
    if (resultsSection) resultsSection.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/medicines/search`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });
        const results = await res.json();
        renderResults(results);
    } catch (err) { console.error(err); }
    finally {
        if (loading) loading.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';
    }
}

function renderResults(data) {
    const container = document.getElementById('results-container');
    if (!container) return;

    container.innerHTML = '';
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) resultsSection.style.display = 'block';

    if (data.length === 0) {
        container.innerHTML = '<p>No results found.</p>';
        return;
    }

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'medicine-card';
        div.innerHTML = `
            <h4>${item.name}</h4>
            <p style="font-size:13px; color:#777;">${item.manufacturer || 'Generic'}</p>
            <div style="background:#ecfdf5; color:#059669; font-size:0.75rem; padding:4px 8px; border-radius:4px; display:inline-block; margin:5px 0; font-weight:600;">
                <i class="fas fa-map-marker-alt"></i> Available at 3+ nearby stores
            </div>
            <p style="font-size:13px;">Stock: ${item.stock_quantity}</p>
            <p style="font-size:12px; color:#999;">Pharmacy: ${item.pharmacy_name}</p>
            <div class="price">$${item.unit_price}</div>
            <button class="add-btn" onclick="addToCart('${item.id}', '${item.name}', ${item.unit_price}, '${item.pharmacy_id || 'unknown'}')">Add to Cart</button>
        `;
        container.appendChild(div);
    });
}

async function loadHomeSections() {
    const newContainer = document.getElementById('new-launches-container');
    const trendContainer = document.getElementById('trending-container');

    // Only run if these containers exist (i.e., we are on index.html)
    if (!newContainer || !trendContainer) return;

    try {
        // Fetch 8 products for the sample
        const API = window.MediFind?.API_URL || 'http://localhost:8000/api';
        const res = await fetch(`${API}/products?limit=8`);
        const data = await res.json();
        const products = data.results || [];

        if (products.length === 0) {
            newContainer.innerHTML = '<p>No products found.</p>';
            trendContainer.innerHTML = '<p>No trending items.</p>';
            return;
        }

        // Helper to create card HTML
        const createCard = (p) => {
            const title = p.name || p.display_name || 'Unknown';
            // Safe Title: Escape single AND double quotes to prevent breaking the HTML
            const safeTitle = title.replace(/'/g, "").replace(/"/g, "&quot;");

            const price = p.price || (Math.random() * 50 + 10).toFixed(2);

            let img = p.image_url || '';
            if (img.includes('(')) img = img.match(/\((.*?)\)/)[1];
            if (!img || img.includes('example')) img = 'https://img.freepik.com/free-vector/medical-healthcare-blue-color-cross-background_1017-26807.jpg';

            const id = p._id || p.id;

            return `
            <div class="medicine-card">
                <a href="product.html?id=${id}" style="text-decoration:none; color:inherit; display:block; height:100%;">
                    <div style="height:120px; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                        <img src="${img}" style="max-height:100%; max-width:100%; border-radius:8px; object-fit:contain;">
                    </div>
                    <h4 style="font-size:15px; margin-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#30363c;">${title}</h4>
                    <p style="font-size:12px; color:#777; margin-bottom:8px;">${p.manufacturer || 'Generic'}</p>
                    <div class="price" style="color:#10847e; font-weight:700;">₹${price}</div>
                </a>
                <button class="add-btn" style="margin-top:10px; width:100%; background:#10847e; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" 
                    onclick="addToCart('${id}', '${safeTitle}', ${price}, 'demo_pharmacy')">
                    Add to Cart
                </button>
            </div>
            `;
        };

        // Split data: First 4 for New Launches, Next 4 for Trending
        const newItems = products.slice(0, 4);
        const trendItems = products.slice(4, 8);

        // Render
        newContainer.innerHTML = newItems.map(createCard).join('');

        // If we have enough items, render trending, otherwise duplicate for demo
        trendContainer.innerHTML = trendItems.length > 0
            ? trendItems.map(createCard).join('')
            : newItems.map(createCard).join('');

    } catch (err) {
        console.error('Failed to load home sections:', err);
        newContainer.innerHTML = '<p>Failed to load data.</p>';
    }
}

// Attach global functions for inline HTML onclicks
window.handleSearch = handleSearch;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.showLogin = showLogin;
window.showSignup = showSignup;
document.addEventListener('DOMContentLoaded', loadHomeSections);

// Init
updateAuthUI();

// Global Place Order Function (Simulates Backend for Demo)
window.placeOrder = async function (address) {
    const currentUser = window.MediFind.currentUser;
    if (!currentUser) return;

    // Use globally available cart
    // (cart variable is defined at top level of app.js)

    if (cart.length === 0) return;

    const pharmacyId = cart[0].pharmacyId || 'demo_pharmacy';
    const items = cart.map(item => ({
        medicine_id: item.medicineId,
        quantity: item.quantity,
        name: item.name,
        price: item.price
    }));

    // --- DEMO SIMULATION ---
    if (pharmacyId === 'demo_pharmacy' || pharmacyId === 'unknown') {
        console.warn("Simulating order via LocalStorage for End-to-End Demo.");

        // Create a realistic order object
        const newOrder = {
            _id: "ORD-" + Math.floor(Math.random() * 1000000),
            status: 'pending',
            created_at: new Date().toISOString(),
            total_amount: items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0) + 10, // +10 platform fee
            delivery_address: address || "User Custom Address",
            items: items.map(i => ({
                medicine_id: { name: i.name || "Medicine" }, // Mock populated object
                name: i.name,
                quantity: i.quantity,
                price: i.price
            })),
            user_id: {
                _id: currentUser._id || 'demo_user_id',
                username: currentUser.username || currentUser.name || 'Demo User',
                phone: currentUser.phone || '9876543210'
            },
            assigned_to: null,
            pharmacy_id: 'demo_pharmacy'
        };

        // Save to "Simulated_Orders"
        const simulatedOrders = JSON.parse(localStorage.getItem('simulated_orders') || '[]');
        simulatedOrders.unshift(newOrder);
        localStorage.setItem('simulated_orders', JSON.stringify(simulatedOrders));

        await new Promise(resolve => setTimeout(resolve, 1500)); // Fake network delay
        alert("Order placed successfully! (Demo Mode)\n\nTrack it in 'My Orders'. The Delivery Partner will see it instantly.");

        // Clear Cart
        cart = [];
        localStorage.setItem('cart', '[]');
        updateCartUI();

        window.location.href = 'orders.html';
        return;
    }

    // Real API Call (if not demo)
    try {
        const orderPayload = {
            pharmacy_id: pharmacyId,
            delivery_address: address,
            notes: "Online Order",
            items: items.map(i => ({ medicine_id: i.medicine_id, quantity: i.quantity }))
        };

        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(orderPayload)
        });

        if (!res.ok) throw new Error("Order failed");
        alert("Order placed successfully!");
        cart = [];
        localStorage.setItem('cart', '[]');
        updateCartUI();
        window.location.href = 'orders.html';

    } catch (err) {
        console.error(err);
        alert("Failed to place order: " + err.message);
    }
};
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
        try { if (typeof updateAuthUI === 'function') updateAuthUI(); } catch (e) {}
    };

    // reliable centralized logout
    window.MediFind.logout = () => {
        window.MediFind.setAuth(null, null);
        // keep other localStorage keys (cart) intact
        window.location.href = 'index.html';
    };
}
syncGlobals();

// Initialize Cart from LocalStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Auth UI Updates
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const cartCountEl = document.getElementById('cart-count');
    
    if (loginBtn) {
        if (authToken && currentUser) {
            loginBtn.innerHTML = `<i class="fas fa-user"></i> Hello, ${currentUser.name || 'User'}`;
            loginBtn.onclick = null;
        } else {
            // Reset to "Hello, Log in" when logged out
            loginBtn.innerHTML = '<i class="fas fa-user"></i> Hello, Log in';
            loginBtn.onclick = openAuthModal;
        }
    }
    updateCartUI();
}

// --- Cart Functionality ---

function updateCartUI() {
    const cartCountEl = document.getElementById('cart-count');
    if(cartCountEl) {
        const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
        cartCountEl.innerText = totalItems;
        cartCountEl.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

window.addToCart = function(medicineId, name, price, pharmacyId) {
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

// Function to open Cart (Mockup for now)
window.openCart = function() {
    window.location.href = 'cart.html';
}

async function placeOrder() {
    if (cart.length === 0) return;

    const pharmacyId = cart[0].pharmacyId; 
    
    const items = cart.map(item => ({
        medicine_id: item.medicineId,
        quantity: item.quantity
    }));

    const orderPayload = {
        pharmacy_id: pharmacyId,
        delivery_address: "User Default Address", 
        notes: "Online Order",
        items: items
    };

    try {
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
        localStorage.removeItem('cart');
        updateCartUI();
        
    } catch (err) {
        console.error(err);
        alert("Failed to place order: " + err.message);
    }
}


// --- Auth & Modal Logic ---

const modal = document.getElementById('auth-modal');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');

function openAuthModal() { if(modal) { modal.style.display = 'flex'; showLogin(); } }
function closeAuthModal() { if(modal) modal.style.display = 'none'; }
function showLogin() { if(loginView) { loginView.style.display = 'block'; signupView.style.display = 'none'; } }
function showSignup() { if(loginView) { loginView.style.display = 'none'; signupView.style.display = 'block'; } }

window.onclick = function(event) { if (event.target == modal) closeAuthModal(); }

// Login Handler
const loginForm = document.getElementById('login-form');
if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: u, password: p})
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.detail);
            
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            authToken = data.access_token; currentUser = data.user;
            
            syncGlobals(); // <-- keep window.MediFind updated
            updateAuthUI();
            closeAuthModal();
            alert(`Welcome back, ${data.user.username}!`);
            
            // --- FIXED REDIRECTION LOGIC ---
            console.log("User Role:", data.user.role); // Debugging line
            
            if(data.user.role === 'pharmacy') {
                window.location.href = 'pharmacy.html';
            } else if(data.user.role === 'delivery') {
                window.location.href = 'delivery.html';
            } else {
                // For patients or if role is undefined, stay on index but reload to update UI
                window.location.href = 'index.html'; 
            }
            
        } catch(err) { alert(err.message); }
    });
}

// Signup Handler
const signupForm = document.getElementById('signup-form');
if(signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            full_name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            username: document.getElementById('reg-username').value,
            password: document.getElementById('reg-password').value,
            role: document.getElementById('reg-role').value // Ensure this ID matches HTML
        };
        
        try {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if(!res.ok) throw new Error('Signup failed');
            
            // Auto-login after signup
             const responseData = await res.json();
             if(responseData.access_token) {
                 localStorage.setItem('authToken', responseData.access_token);
                 localStorage.setItem('currentUser', JSON.stringify(responseData.user));
                 authToken = responseData.access_token; currentUser = responseData.user;

                 syncGlobals(); // <-- keep window.MediFind updated
                 updateAuthUI();
                 closeAuthModal();
                 alert('Account created! Redirecting...');
                 
                 // Redirect based on role
                 if(responseData.user.role === 'pharmacy') window.location.href = 'pharmacy.html';
                 else if(responseData.user.role === 'delivery') window.location.href = 'delivery.html';
                 else window.location.href = 'index.html';
             }

        } catch(err) { alert(err.message); }
    });
}

function logout() {
    // Clear all stored user data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('cart');
    sessionStorage.clear();
    
    // Reset global variables immediately
    authToken = null;
    currentUser = null;
    cart = [];
    
    // Update UI before redirect
    updateAuthUI();
    
    // Redirect to home page
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 100);
}

// --- Search Logic ---

async function handleSearch() {
    const query = document.getElementById('medicine-query').value;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results-section').style.display = 'none';
    
    try {
        const res = await fetch(`${API_URL}/medicines/search`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query: query})
        });
        const results = await res.json();
        renderResults(results);
    } catch(err) { console.error(err); }
    finally { document.getElementById('loading').style.display = 'none'; }
}

function renderResults(data) {
    const container = document.getElementById('results-container');
    container.innerHTML = '';
    document.getElementById('results-section').style.display = 'block';
    
    if(data.length === 0) { container.innerHTML = '<p>No results found.</p>'; return; }
    
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'medicine-card';
        div.innerHTML = `
            <h4>${item.name}</h4>
            <p style="font-size:13px; color:#777;">${item.manufacturer || 'Generic'}</p>
            <p style="font-size:13px;">Stock: ${item.stock_quantity}</p>
            <p style="font-size:12px; color:#999;">Pharmacy: ${item.pharmacy_name}</p>
            <div class="price">$${item.unit_price}</div>
            <button class="add-btn" onclick="addToCart('${item.id}', '${item.name}', ${item.unit_price}, '${item.pharmacy_id || 'unknown'}')">Add to Cart</button>
        `;
        container.appendChild(div);
    });
}

// Attach global functions for inline HTML onclicks
window.handleSearch = handleSearch;
window.logout = logout;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.showLogin = showLogin;
window.showSignup = showSignup;
window.openCart = function() {
    window.location.href = 'cart.html';
}

// Init
updateAuthUI();


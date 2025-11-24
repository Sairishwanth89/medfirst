const API_URL = 'http://localhost:8000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// Initialize Cart from LocalStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Auth UI Updates
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    if (authToken && currentUser) {
        loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${currentUser.username}`;
        loginBtn.onclick = (e) => { e.preventDefault(); logout(); };
    } else {
        loginBtn.innerHTML = `<i class="far fa-user"></i> Hello, Log in`;
        loginBtn.onclick = (e) => { e.preventDefault(); openAuthModal(); };
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

// Function to open Cart (Mockup for now, could be a modal or page)
window.openCart = function() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }
    
    let cartDetails = "Your Cart:\n";
    let total = 0;
    cart.forEach(item => {
        cartDetails += `${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}\n`;
        total += item.price * item.quantity;
    });
    cartDetails += `\nTotal: $${total.toFixed(2)}`;
    
    if(confirm(cartDetails + "\n\nProceed to Checkout?")) {
        // Trigger Order Placement (Requires Auth)
        if (!authToken) {
            alert("Please login to checkout.");
            openAuthModal();
        } else {
            placeOrder();
        }
    }
}

async function placeOrder() {
    // Group items by Pharmacy (Orders are typically per pharmacy)
    // For simplicity, we'll just take the first pharmacy found or handle multiple orders
    // Let's assume single pharmacy order for this demo or just error out if mixed
    
    if (cart.length === 0) return;

    const pharmacyId = cart[0].pharmacyId; // Simplification
    
    // Filter items for this pharmacy
    const items = cart.map(item => ({
        medicine_id: item.medicineId,
        quantity: item.quantity
    }));

    const orderPayload = {
        pharmacy_id: pharmacyId,
        delivery_address: "User Default Address", // In real app, prompt user
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


// --- Auth & Modal Logic (Existing) ---

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
            
            updateAuthUI();
            closeAuthModal();
            alert(`Welcome back, ${data.user.username}!`);
            
            // --- ROLE REDIRECTION LOGIC ---
            if(data.user.role === 'pharmacy') window.location.href = 'pharmacy.html';
            else if(data.user.role === 'delivery') window.location.href = 'delivery.html';
            else window.location.href = 'index.html'; // Patient stays here
            
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
            role: document.getElementById('reg-role').value
        };
        
        try {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if(!res.ok) throw new Error('Signup failed');
            alert('Account created! Please login.');
            showLogin();
        } catch(err) { alert(err.message); }
    });
}

function logout() {
    localStorage.clear();
    location.href = 'index.html';
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
        // Use onclick to call addToCart with item details
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
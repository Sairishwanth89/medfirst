const API_URL = 'http://localhost:8000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let cartCount = 0; // Simple Cart State

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
}

// Cart Functionality
window.addToCart = function() {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    // Optional: Show a toast notification
    alert("Item added to cart!");
}

// Modal Logic
const modal = document.getElementById('auth-modal');
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');

function openAuthModal() { modal.style.display = 'flex'; showLogin(); }
function closeAuthModal() { modal.style.display = 'none'; }
function showLogin() { loginView.style.display = 'block'; signupView.style.display = 'none'; }
function showSignup() { loginView.style.display = 'none'; signupView.style.display = 'block'; }

// Close modal if clicked outside
window.onclick = function(event) {
    if (event.target == modal) closeAuthModal();
}

// Login Handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
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
        alert('Logged in successfully!');
        
        // Role Redirect
        if(data.user.role === 'pharmacy') window.location.href = 'pharmacy.html';
        if(data.user.role === 'delivery') window.location.href = 'delivery.html';
        
    } catch(err) { alert(err.message); }
});

// Signup Handler
document.getElementById('signup-form').addEventListener('submit', async (e) => {
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

function logout() {
    localStorage.clear();
    location.reload();
}

// Search Logic
async function handleSearch() {
    const query = document.getElementById('medicine-query').value;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results-section').style.display = 'none';
    
    try {
        const res = await fetch(`${API_URL}/medicines/search`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query: query, limit: 10})
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
            <div class="price">$${item.unit_price}</div>
            <button class="add-btn" onclick="addToCart()">Add to Cart</button>
        `;
        container.appendChild(div);
    });
}

// Init
updateAuthUI();
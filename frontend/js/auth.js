document.addEventListener('DOMContentLoaded', () => {
    // Use global variable or fallback
    const API_URL = window.MediFind?.API_URL || 'http://localhost:8000/api';
    const showAlert = window.MediFind?.showAlert || ((msg) => alert(msg));

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    async function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const alertBox = document.getElementById('alert-box'); // Optional UI element
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Login failed');

            // Success: Save to LocalStorage
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            // Update Global State if app.js is loaded
            if (window.MediFind && window.MediFind.setAuth) {
                window.MediFind.setAuth(data.access_token, data.user);
            }

            if (alertBox) {
                alertBox.style.display = 'block';
                alertBox.textContent = 'Login successful! Redirecting...';
                alertBox.style.color = 'green';
            } else {
                alert('Login successful!');
            }

            // Redirect based on Role
            setTimeout(() => {
                if (data.user.role === 'pharmacy') {
                    window.location.href = 'pharmacy.html';
                } else if (data.user.role === 'delivery') {
                    window.location.href = 'delivery.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1000);

        } catch (error) {
            console.error(error);
            if (alertBox) {
                alertBox.style.display = 'block';
                alertBox.textContent = error.message;
                alertBox.style.color = 'red';
            } else {
                alert(error.message);
            }
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        
        const userData = {
            email: document.getElementById('email').value,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            full_name: document.getElementById('full_name').value || '',
            phone: document.getElementById('phone') ? document.getElementById('phone').value : '',
            role: document.getElementById('reg-role').value
        };

        try {
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Signup failed');

            // Auto Login
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            if (window.MediFind && window.MediFind.setAuth) {
                window.MediFind.setAuth(data.access_token, data.user);
            }

            alert('Account created successfully!');
            
            // Redirect
            if (data.user.role === 'pharmacy') window.location.href = 'pharmacy.html';
            else if (data.user.role === 'delivery') window.location.href = 'delivery.html';
            else window.location.href = 'index.html';

        } catch (error) {
            alert(error.message);
        }
    }
});
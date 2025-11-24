/*
FILENAME: frontend/js/auth.js
*/
document.addEventListener('DOMContentLoaded', () => {
    const showAlert = window.MediFind.showAlert;
    const API_URL = window.MediFind.API_URL;

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    async function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const alertBox = document.getElementById('alert-box');
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Login failed');

            // Success
            window.MediFind.authToken = data.access_token;
            window.MediFind.currentUser = data.user;

            showAlert('Login successful!', 'success', alertBox);
            redirectUser(data.user.role);

        } catch (error) {
            showAlert(error.message, 'error', alertBox);
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        const alertBox = document.getElementById('alert-box');
        
        const userData = {
            email: document.getElementById('email').value,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            full_name: document.getElementById('full_name').value || null,
            phone: document.getElementById('phone').value || null,
            role: document.getElementById('role').value
        };

        try {
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Signup failed');

            // Success
            window.MediFind.authToken = data.access_token;
            window.MediFind.currentUser = data.user;

            showAlert('Account created!', 'success', alertBox);
            redirectUser(data.user.role);

        } catch (error) {
            showAlert(error.message, 'error', alertBox);
        }
    }

    function redirectUser(role) {
        setTimeout(() => {
            if (role === 'pharmacy') {
                window.location.href = 'pharmacy.html';
            } else if (role === 'delivery') {
                window.location.href = 'delivery.html'; // New Page
            } else {
                window.location.href = 'index.html';
            }
        }, 1500);
    }
});
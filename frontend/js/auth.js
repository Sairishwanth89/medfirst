/*
FILENAME: frontend/js/auth.js
*/
document.addEventListener('DOMContentLoaded', () => {
    // We are borrowing helper functions from app.js
    const showAlert = window.MediFind.showAlert;
    const API_URL = window.MediFind.API_URL;

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    async function handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const alertBox = document.getElementById('alert-box');
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            // --- Success ---
            // Save token and user info using the global setters from app.js
            window.MediFind.authToken = data.access_token;
            window.MediFind.currentUser = data.user;

            showAlert('Login successful! Redirecting...', 'success', alertBox);
            
            // Redirect to the appropriate dashboard
            setTimeout(() => {
                if (data.user.role === 'pharmacy') {
                    window.location.href = 'pharmacy.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 2000);

        } catch (error) {
            console.error('Login error:', error);
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Signup failed');
            }

            // --- Success ---
            // Save token and user info
            window.MediFind.authToken = data.access_token;
            window.MediFind.currentUser = data.user;

            showAlert('Signup successful! Redirecting...', 'success', alertBox);
            
            // Redirect to dashboard
            setTimeout(() => {
                if (data.user.role === 'pharmacy') {
                    window.location.href = 'pharmacy.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 2000);

        } catch (error) {
            console.error('Signup error:', error);
            showAlert(error.message, 'error', alertBox);
        }
    }
});
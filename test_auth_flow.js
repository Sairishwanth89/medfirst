const http = require('http');

const signupData = JSON.stringify({
    username: "TestUser_" + Date.now(),
    password: "password123",
    email: "test_" + Date.now() + "@example.com",
    role: "pharmacy"
});

function doLogin(username, password) {
    const loginData = JSON.stringify({ username, password });
    const req = http.request({
        hostname: 'localhost', port: 8000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, (res) => {
        console.log(`LOGIN STATUS: ${res.statusCode}`);
        res.on('data', d => process.stdout.write(d));
    });
    req.write(loginData);
    req.end();
}

const req = http.request({
    hostname: 'localhost', port: 8000, path: '/api/auth/signup', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': signupData.length }
}, (res) => {
    console.log(`SIGNUP STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log("Signup Response:", body);
        if (res.statusCode === 201) {
            const user = JSON.parse(body).user;
            console.log("Attempting Login...");
            doLogin(JSON.parse(signupData).username, "password123");
        }
    });
});
req.write(signupData);
req.end();

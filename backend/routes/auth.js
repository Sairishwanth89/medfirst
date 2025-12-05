const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, full_name, phone, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ detail: 'Email or username already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);
    
    const user = await User.create({
      username, 
      email, 
      password: hashedPassword, 
      full_name, 
      phone, 
      role: role || 'patient'
    });

    // Generate Token
    const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.SECRET_KEY || 'your_jwt_secret_key_2024'
    );
    
    const userResp = user.toObject();
    delete userResp.password;

    res.status(201).json({ user: userResp, access_token: token });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(400).json({ detail: error.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 1. Find user
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error('Invalid login credentials');
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid login credentials');
    }

    // 3. Generate Token
    const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.SECRET_KEY || 'your_jwt_secret_key_2024'
    );
    
    const userResp = user.toObject();
    delete userResp.password;

    res.send({ user: userResp, access_token: token });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(400).json({ detail: 'Incorrect username or password' });
  }
});

module.exports = router;
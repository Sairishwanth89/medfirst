const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, full_name, phone, role } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ detail: 'Email or username already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    
    const user = await User.create({
      username, email, password: hashedPassword, full_name, phone, role
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET_KEY);
    
    const userResp = user.toObject();
    delete userResp.password;

    res.status(201).json({ user: userResp, access_token: token });
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new Error('Unable to login');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET_KEY);
    
    const userResp = user.toObject();
    delete userResp.password;

    res.send({ user: userResp, access_token: token });
  } catch (error) {
    res.status(400).json({ detail: 'Incorrect username or password' });
  }
});

module.exports = router;
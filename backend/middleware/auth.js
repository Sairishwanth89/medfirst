const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) throw new Error('No token provided');

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    const user = await User.findOne({ _id: decoded.id, is_active: true });

    if (!user) {
      throw new Error('User not found');
    }

    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

module.exports = auth;
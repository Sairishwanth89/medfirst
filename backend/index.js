const express = require('express');
const app = express();

const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

module.exports = app;
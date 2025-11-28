const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Search products
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        message: 'Please provide a search term (e.g., ?q=paracetamol)'
      });
    }

    const searchQuery = q.trim();
    console.log(`🔍 Searching for: "${searchQuery}"`);

    const results = await Product.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { category: { $regex: searchQuery, $options: 'i' } }
      ]
    }).limit(50);

    if (results.length === 0) {
      return res.json({
        success: true,
        message: 'No products found matching your search',
        query: searchQuery,
        results: []
      });
    }

    res.json({
      success: true,
      message: `Found ${results.length} product(s)`,
      query: searchQuery,
      count: results.length,
      results: results
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().limit(50);
    res.json({
      success: true,
      count: products.length,
      results: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    res.json({
      success: true,
      results: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
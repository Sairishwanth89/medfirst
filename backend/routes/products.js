const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
// Import the client safely
const esConfig = require('../config/elasticsearch');
const esClient = esConfig.esClient;
const PRODUCT_INDEX = process.env.ELASTICSEARCH_PRODUCTS_INDEX || 'products';

// Search products
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    console.log(`[Search] Request for: "${q}"`); // Debug log

    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    const searchQuery = q.trim();
    let results = [];
    let fromElastic = false;

    // 1. Try Elasticsearch
    try {
        if (!esClient) throw new Error('Elasticsearch client is undefined');

        const response = await esClient.search({
            index: PRODUCT_INDEX,
            body: {
                query: {
                    multi_match: {
                        query: searchQuery,
                        fields: ['display_name^3', 'manufacturer_name^2', 'composition_short', 'keywords'],
                        fuzziness: 'AUTO'
                    }
                }
            }
        });

        // Debug log to see structure in docker logs
        // console.log('[Search] ES Response keys:', Object.keys(response));

        // Safe access to hits (handles v7 and v8 client differences)
        const hitsObj = response.hits || response.body?.hits;
        const hits = hitsObj?.hits || [];

        if (hits.length > 0) {
            console.log(`[Search] ES found ${hits.length} hits`);
            fromElastic = true;
            const ids = hits.map(h => h._id);
            
            // Fetch from Mongo
            const docs = await Product.find({ _id: { $in: ids } });
            
            // Map back to preserve ES order
            const docsMap = new Map(docs.map(d => [d._id.toString(), d]));
            results = ids.map(id => docsMap.get(id)).filter(Boolean);
        }
    } catch (esErr) {
        console.error('[Search] ES failed, using fallback:', esErr.message);
        // Do not crash, just fall through to Mongo
    }

    // 2. Fallback to MongoDB
    if (results.length === 0) {
        console.log('[Search] Using MongoDB fallback');
        results = await Product.find({
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
                { manufacturer: { $regex: searchQuery, $options: 'i' } }
            ]
        }).limit(50);
    }

    res.json({
      success: true,
      source: fromElastic ? 'elasticsearch' : 'database',
      count: results.length,
      results: results
    });

  } catch (error) {
    console.error('[Search] Critical Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all products (Standard route)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().limit(50);
    res.json({ success: true, count: products.length, results: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, results: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
// Import ES Client safely
const esConfig = require('../config/elasticsearch');
const esClient = esConfig.esClient;
const PRODUCT_INDEX = process.env.ELASTICSEARCH_PRODUCTS_INDEX || 'products';

// Search products (Merged Route)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    // console.log(`[Search] Request for: "${q}"`); 

    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    const searchQuery = q.trim();
    let results = [];
    let fromElastic = false;

    // --- 1. Try Elasticsearch ---
    try {
      if (!esClient) throw new Error('Elasticsearch client is undefined');

      const response = await esClient.search({
        index: PRODUCT_INDEX,
        body: {
          query: {
            multi_match: {
              query: searchQuery,
              fields: ['name^4', 'composition^3', 'uses^2', 'manufacturer', 'side_effects'],
              fuzziness: 'AUTO'
            }
          }
        }
      });

      const hitsObj = response.hits || response.body?.hits;
      const hits = hitsObj?.hits || [];

      if (hits.length > 0) {
        // console.log(`[Search] ES found ${hits.length} hits`);
        fromElastic = true;
        const ids = hits.map(h => h._id);
        const docs = await Product.find({ _id: { $in: ids } });

        // Maintain ES sort order
        const docsMap = new Map(docs.map(d => [d._id.toString(), d]));
        results = ids.map(id => docsMap.get(id)).filter(Boolean);
      }
    } catch (esErr) {
      console.error('[Search] ES failed, using fallback:', esErr.message);
    }

    // --- 2. Fallback to MongoDB ---
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

    // --- 3. Demand Sensing Logic (Notifications) ---
    // Run asynchronously so we don't slow down the user's search result
    results.forEach(async (product) => {
      if (product.stock_quantity === 0) {
        try {
          // Check if alert already exists (unread)
          const existingAlert = await Notification.findOne({
            pharmacy_id: product.pharmacy_id,
            product_id: product._id,
            status: 'unread'
          });

          if (existingAlert) {
            existingAlert.count += 1;
            await existingAlert.save();
          } else {
            await Notification.create({
              pharmacy_id: product.pharmacy_id,
              product_id: product._id,
              product_name: product.name,
              type: 'out_of_stock'
            });
            console.log(`⚠️ Stock Alert: ${product.name}`);
          }
        } catch (err) {
          console.error("Notification Error:", err.message);
        }
      }
    });

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

// Get all products
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const products = await Product.find().limit(limit);
    res.json({ success: true, count: products.length, results: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ➤ Pharmacist: Get Low Stock Items
router.get('/pharmacy/low-stock', auth, async (req, res) => {
  try {
    // if (req.user.role !== 'pharmacist') return res.status(403).json({ detail: 'Access denied' });
    const lowStockThreshold = 10;
    const products = await Product.find({ stock: { $lt: lowStockThreshold } });
    res.json({ success: true, results: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

// ➤ Pharmacist: Update Stock
router.put('/:id/stock', auth, async (req, res) => {
  try {
    const { stock } = req.body;
    // if (req.user.role !== 'pharmacist') return res.status(403).json({ detail: 'Access denied' });

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock: stock },
      { new: true }
    );
    res.json({ success: true, results: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
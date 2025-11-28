const express = require('express');
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const { esClient, ELASTICSEARCH_INDEX } = require('../config/elasticsearch');
const db = mongoose.connection;

const router = express.Router();

/**
 * GET /api/medicines/search?q=term
 * Attempt Elasticsearch first, fall back to MongoDB regex search.
 */
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });

  try {
    // use ES if available
    const { body } = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 50,
      body: {
        query: {
          multi_match: {
            query: q,
            fields: ['name^3', 'generic_name^2', 'description', 'manufacturer'],
            fuzziness: 'AUTO'
          }
        }
      }
    });

    const ids = (body.hits?.hits || []).map(h => h._id);
    let results = [];

    if (ids.length) {
      const docs = await Medicine.find({ _id: { $in: ids } }).populate('pharmacy_id').lean();
      const docsById = new Map(docs.map(d => [String(d._id), d]));
      results = ids.map(id => {
        const m = docsById.get(String(id));
        if (!m) return null;
        return {
          id: m._id,
          name: m.name,
          generic_name: m.generic_name,
          unit_price: m.unit_price,
          stock_quantity: m.stock_quantity,
          manufacturer: m.manufacturer,
          pharmacy: m.pharmacy_id ? {
            id: m.pharmacy_id._id,
            name: m.pharmacy_id.name,
            city: m.pharmacy_id.city,
            address: m.pharmacy_id.address,
            is_24_hours: !!m.pharmacy_id.is_24_hours
          } : null
        };
      }).filter(Boolean);
    }

    // If ES returned nothing, fall back to mongo regex search
    if (!results.length) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const medicines = await Medicine.find({
        $or: [{ name: regex }, { generic_name: regex }, { manufacturer: regex }]
      }).limit(50).populate('pharmacy_id').lean();

      results = medicines.map(m => ({
        id: m._id,
        name: m.name,
        generic_name: m.generic_name,
        unit_price: m.unit_price,
        stock_quantity: m.stock_quantity,
        manufacturer: m.manufacturer,
        pharmacy: m.pharmacy_id ? {
          id: m.pharmacy_id._id,
          name: m.pharmacy_id.name,
          city: m.pharmacy_id.city,
          address: m.pharmacy_id.address,
          is_24_hours: !!m.pharmacy_id.is_24_hours
        } : null
      }));
    }

    return res.json({ results });
  } catch (err) {
    console.warn('Search failed, attempting Mongo fallback:', err?.message || err);
    try {
      // final fallback: regex search if ES or the above steps fail
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const medicines = await Medicine.find({
        $or: [{ name: regex }, { generic_name: regex }, { manufacturer: regex }]
      }).limit(50).populate('pharmacy_id').lean();

      return res.json({
        results: medicines.map(m => ({
          id: m._id,
          name: m.name,
          generic_name: m.generic_name,
          unit_price: m.unit_price,
          stock_quantity: m.stock_quantity,
          manufacturer: m.manufacturer,
          pharmacy: m.pharmacy_id ? {
            id: m.pharmacy_id._id,
            name: m.pharmacy_id.name,
            city: m.pharmacy_id.city,
            address: m.pharmacy_id.address,
            is_24_hours: !!m.pharmacy_id.is_24_hours
          } : null
        }))
      });
    } catch (finalErr) {
      console.error('Final search fallback failed:', finalErr?.message || finalErr);
      return res.status(500).json({ error: 'Search failed' });
    }
  }
});

/**
 * GET /api/medicines/:id
 * Only match valid 24-hex ObjectIds to avoid catching 'search' or other words.
 */
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const m = await Medicine.findById(id).populate('pharmacy_id').lean();
    if (!m) return res.status(404).json({ error: 'Medicine not found' });

    return res.json({
      id: m._id,
      name: m.name,
      generic_name: m.generic_name,
      description: m.description,
      unit_price: m.unit_price,
      stock_quantity: m.stock_quantity,
      manufacturer: m.manufacturer,
      pharmacy: m.pharmacy_id ? {
        id: m.pharmacy_id._id,
        name: m.pharmacy_id.name,
        city: m.pharmacy_id.city,
        address: m.pharmacy_id.address,
        is_24_hours: !!m.pharmacy_id.is_24_hours
      } : null
    });
  } catch (err) {
    console.error('Get medicine by id error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch medicine' });
  }
});

/**
 * Search products collection directly (for admin or advanced search)
 * @param {string} q Search term
 * @returns {Promise<Array>} Array of product objects
 */
async function searchProductsCollection(q) {
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'i');
  // try text search first if index exists
  try {
    const col = db.collection('products');
    // text search if supported, otherwise regex fallback
    const textMatches = await col.find({ $text: { $search: q } }).limit(50).toArray().catch(() => []);
    if (textMatches && textMatches.length) return textMatches.map(d => ({
      id: d._id,
      name: d.display_name || d.name || '',
      manufacturer: d.manufacturer_name || '',
      description: d.pack_desc || d.description || '',
      extra: d.keywords || []
    }));
    // regex fallback
    const regexMatches = await col.find({
      $or: [
        { display_name: regex },
        { manufacturer_name: regex },
        { composition_short: regex },
        { keywords: regex }
      ]
    }).limit(50).toArray();
    return regexMatches.map(d => ({
      id: d._id,
      name: d.display_name || d.name || '',
      manufacturer: d.manufacturer_name || '',
      description: d.pack_desc || d.description || '',
      extra: d.keywords || []
    }));
  } catch (e) {
    return [];
  }
}

// Get all medicines
router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find().limit(50);
    res.json({
      success: true,
      count: medicines.length,
      results: medicines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
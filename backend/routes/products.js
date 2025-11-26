const express = require('express');
const mongoose = require('mongoose');
const { esClient } = require('../config/elasticsearch');
const { ObjectId } = require('mongodb');

const router = express.Router();
const PRODUCTS_INDEX = process.env.ELASTICSEARCH_PRODUCTS_INDEX || 'products';

// Ensure ES index exists with sensible mapping
async function ensureProductsIndex() {
  try {
    const { body: exists } = await esClient.indices.exists({ index: PRODUCTS_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: PRODUCTS_INDEX,
        body: {
          mappings: {
            properties: {
              display_name: { type: 'text' },
              manufacturer_name: { type: 'text' },
              composition_short: { type: 'text' },
              pack_desc: { type: 'text' },
              keywords: { type: 'text' },
              image_url: { type: 'keyword' },
              is_prescription_required: { type: 'boolean' },
              pharmacyId: { type: 'keyword' }
            }
          }
        }
      });
      console.log(`Created ES index: ${PRODUCTS_INDEX}`);
    }
  } catch (e) {
    console.warn('ensureProductsIndex:', e?.message || e);
  }
}

/**
 * GET /api/products/search?q=...
 * Tries Elasticsearch first (products index), falls back to Mongo's products collection.
 */

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 24);
    const skip = (page - 1) * limit;

    const db = mongoose.connection;
    const col = db.collection('products');
    const total = await col.countDocuments({});
    const docs = await col.find({}).sort({ _id: -1 }).skip(skip).limit(limit).toArray();

    const results = docs.map(d => ({
      id: d._id,
      name: d.display_name || d.name || '',
      manufacturer: d.manufacturer_name || '',
      composition_short: d.composition_short || '',
      pack_desc: d.pack_desc || '',
      image_url: d.image_url || '',
      keywords: d.keywords || [],
      is_prescription_required: !!d.is_prescription_required
    }));

    res.json({ total, page, limit, results });
  } catch (err) {
    console.error('Products list error:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });

  // ensure index exists (best-effort, non-blocking on errors)
  await ensureProductsIndex().catch(() => { /* ignore create failures */ });

  // try elasticsearch
  try {
    const { body } = await esClient.search({
      index: PRODUCTS_INDEX,
      size: 50,
      body: {
        query: {
          multi_match: {
            query: q,
            fields: [
              'display_name^3',
              'manufacturer_name^2',
              'composition_short',
              'pack_desc',
              'keywords'
            ],
            fuzziness: 'AUTO'
          }
        }
      }
    });

    const hits = (body.hits?.hits || []).map(h => {
      const src = h._source || {};
      return {
        id: h._id,
        name: src.display_name || src.name || '',
        manufacturer: src.manufacturer_name || '',
        composition_short: src.composition_short || '',
        pack_desc: src.pack_desc || '',
        image_url: src.image_url || '',
        keywords: src.keywords || [],
        is_prescription_required: !!src.is_prescription_required
      };
    });

    if (hits.length) return res.json({ results: hits });
  } catch (esErr) {
    console.warn('ES products search failed:', esErr?.message || esErr);
  }

  // fallback to MongoDB products collection
  try {
    const db = mongoose.connection;
    const col = db.collection('products');
    // try text-search first
    let docs = [];
    try {
      docs = await col.find({ $text: { $search: q } }).limit(50).toArray();
    } catch (_) {
      // text not supported / no index -> regex fallback
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      docs = await col.find({
        $or: [
          { display_name: regex },
          { manufacturer_name: regex },
          { composition_short: regex },
          { keywords: regex }
        ]
      }).limit(50).toArray();
    }

    const results = docs.map(d => ({
      id: d._id,
      name: d.display_name || d.name || '',
      manufacturer: d.manufacturer_name || '',
      composition_short: d.composition_short || '',
      pack_desc: d.pack_desc || '',
      image_url: d.image_url || '',
      keywords: d.keywords || [],
      is_prescription_required: !!d.is_prescription_required
    }));

    return res.json({ results });
  } catch (mongoErr) {
    console.error('Products fallback search failed:', mongoErr?.message || mongoErr);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/products/:id  (supports ObjectId or string IDs)
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const col = mongoose.connection.collection('products');
    let query;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }
    const doc = await col.findOne(query);
    if (!doc) return res.status(404).json({ error: 'Product not found' });
    return res.json({
      id: doc._id,
      name: doc.display_name || doc.name || '',
      manufacturer: doc.manufacturer_name || '',
      composition_short: doc.composition_short || '',
      pack_desc: doc.pack_desc || '',
      image_url: doc.image_url || '',
      keywords: doc.keywords || [],
      is_prescription_required: !!doc.is_prescription_required
    });
  } catch (err) {
    console.error('GET /api/products/:id error:', err);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
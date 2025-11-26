const express = require('express');
const Medicine = require('../models/Medicine');
const Pharmacy = require('../models/Pharmacy');
const auth = require('../middleware/auth');
const { esClient, ELASTICSEARCH_INDEX } = require('../config/elasticsearch');
const router = express.Router();

// Add Medicine
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'pharmacy') return res.status(403).json({ detail: 'Forbidden' });
  
  try {
    const pharmacy = await Pharmacy.findOne({ owner_id: req.user._id });
    if (!pharmacy) return res.status(404).json({ detail: 'Pharmacy not found' });

    const medicine = await Medicine.create({ ...req.body, pharmacy_id: pharmacy._id });

    // Index to Elasticsearch
    try {
      await esClient.index({
        index: ELASTICSEARCH_INDEX,
        id: medicine._id.toString(),
        body: {
          name: medicine.name,
          generic_name: medicine.generic_name,
          description: medicine.description,
          manufacturer: medicine.manufacturer,
          unit_price: medicine.unit_price,
          stock_quantity: medicine.stock_quantity,
          pharmacy_id: pharmacy._id.toString()
        }
      });
    } catch (esError) {
      console.error('Elasticsearch Indexing Error:', esError);
      // We don't fail the request if ES indexing fails, just log it so the DB write persists
    }

    res.status(201).json(medicine);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

// Get My Stock
router.get('/me', auth, async (req, res) => {
  if (req.user.role !== 'pharmacy') return res.status(403).json({ detail: 'Forbidden' });
  
  try {
    const pharmacy = await Pharmacy.findOne({ owner_id: req.user._id });
    if (!pharmacy) return res.status(404).json({ detail: 'Pharmacy not found' });

    const stock = await Medicine.find({ pharmacy_id: pharmacy._id });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;
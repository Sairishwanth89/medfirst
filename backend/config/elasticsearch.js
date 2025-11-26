const express = require('express');
const Medicine = require('../models/Medicine');
const { esClient, ELASTICSEARCH_INDEX } = require('../config/elasticsearch');
const router = express.Router();

router.post('/search', async (req, res) => {
  const { query } = req.body;
  try {
    // Search in Elasticsearch
    const { hits } = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      body: {
        query: {
          multi_match: {
            query: query,
            fields: ['name', 'generic_name', 'description', 'manufacturer'],
            fuzziness: 'AUTO' 
          }
        }
      }
    });

    // Extract IDs from ES results
    const medicineIds = hits.hits.map(hit => hit._id);

    // Fetch full details from MongoDB (to get latest stock/price and populate pharmacy)
    // We preserve the order from ES results by fetching and then mapping
    const medicines = await Medicine.find({ _id: { $in: medicineIds } })
                                    .populate('pharmacy_id');

    // Map results to frontend format
    const results = medicines.map(m => ({
      id: m._id,
      name: m.name,
      generic_name: m.generic_name,
      unit_price: m.unit_price,
      stock_quantity: m.stock_quantity,
      pharmacy_name: m.pharmacy_id ? m.pharmacy_id.name : 'Unknown',
      pharmacy_city: m.pharmacy_id ? m.pharmacy_id.city : 'Unknown',
      pharmacy_address: m.pharmacy_id ? m.pharmacy_id.address : 'Unknown',
      is_24_hours: m.pharmacy_id ? m.pharmacy_id.is_24_hours : false,
      manufacturer: m.manufacturer 
    }));

    res.json(results);
  } catch (error) {
    console.error('Search Error:', error);
    // Fallback to MongoDB regex search if ES fails
    try {
        const searchRegex = new RegExp(query, 'i');
        const medicines = await Medicine.find({
            $or: [{ name: searchRegex }, { generic_name: searchRegex }],
            stock_quantity: { $gt: 0 }
        }).populate('pharmacy_id').limit(20);
        
        const results = medicines.map(m => ({
            id: m._id,
            name: m.name,
            generic_name: m.generic_name,
            unit_price: m.unit_price,
            stock_quantity: m.stock_quantity,
            pharmacy_name: m.pharmacy_id ? m.pharmacy_id.name : 'Unknown',
            pharmacy_city: m.pharmacy_id ? m.pharmacy_id.city : 'Unknown',
            pharmacy_address: m.pharmacy_id ? m.pharmacy_id.address : 'Unknown',
            is_24_hours: m.pharmacy_id ? m.pharmacy_id.is_24_hours : false,
            manufacturer: m.manufacturer
        }));
        res.json(results);
    } catch (mongoError) {
        res.status(500).json({ detail: mongoError.message });
    }
  }
});

module.exports = router;
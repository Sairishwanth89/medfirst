const express = require('express');
const Medicine = require('../models/Medicine');
const Pharmacy = require('../models/Pharmacy');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'pharmacy') return res.status(403).json({ detail: 'Forbidden' });
  
  try {
    const pharmacy = await Pharmacy.findOne({ owner_id: req.user._id });
    if (!pharmacy) return res.status(404).json({ detail: 'Pharmacy not found' });

    const medicine = await Medicine.create({ ...req.body, pharmacy_id: pharmacy._id });
    res.status(201).json(medicine);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

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
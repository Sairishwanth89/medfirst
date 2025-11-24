const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  phone: { type: String },
  is_24_hours: { type: Boolean, default: false },
  owner_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  latitude: { type: Number },
  longitude: { type: Number },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pharmacy', pharmacySchema);
const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  generic_name: { type: String },
  manufacturer: { type: String },
  description: { type: String },
  category: { type: String },
  requires_prescription: { type: Boolean, default: false },
  unit_price: { type: Number, required: true },
  stock_quantity: { type: Number, default: 0 },
  pharmacy_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Pharmacy', 
    required: true 
  },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Medicine', medicineSchema);
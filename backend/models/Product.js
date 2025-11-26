const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: { type: String, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  pharmacyId: { type: String, index: true },
  category: { type: String, default: '' },
  tags: [String],
  created_at: { type: Date, default: Date.now }
});

// Text index to support search on name + description + sku
productSchema.index({ name: 'text', description: 'text', sku: 'text' });

module.exports = mongoose.model('Product', productSchema);
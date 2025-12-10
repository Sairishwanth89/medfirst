const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // --- New Fields from CSV ---
  name: { type: String, required: true },
  composition: { type: String, default: '' },
  uses: { type: String, default: '' },
  side_effects: { type: String, default: '' },
  image_url: { type: String, default: '' },
  manufacturer: { type: String, default: '' },

  // Reviews Object
  reviews: {
    excellent: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    poor: { type: Number, default: 0 }
  },

  // --- Existing Fields ---
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  unit_price: { type: Number, default: 0 }, // Added for consistency
  stock: { type: Number, default: 0 },
  pharmacyId: { type: String, index: true },
  pharmacy_id: { type: String, index: true }, // Added for consistency
  category: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

// Index for search
productSchema.index({ name: 'text', composition: 'text', uses: 'text', manufacturer: 'text' });

module.exports = mongoose.model('Product', productSchema);
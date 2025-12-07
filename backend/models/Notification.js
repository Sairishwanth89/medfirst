const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  pharmacy_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String, required: true },
  type: { type: String, enum: ['out_of_stock', 'low_stock', 'missed_search'], default: 'out_of_stock' },
  count: { type: Number, default: 1 },
  status: { type: String, enum: ['unread', 'read'], default: 'unread' },
  created_at: { type: Date, default: Date.now }
});

// Prevent OverwriteModelError
module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    generic_name: { type: String, default: '', index: true },
    description: { type: String, default: '' },
    manufacturer: { type: String, default: '' },
    unit_price: { type: Number, default: 0 },
    stock_quantity: { type: Number, default: 0 },
    pharmacy_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// helpful text index for fallback searches
medicineSchema.index({ name: 'text', generic_name: 'text', description: 'text' });

// export the Mongoose model (this is the required shape used by your routes)
module.exports = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);
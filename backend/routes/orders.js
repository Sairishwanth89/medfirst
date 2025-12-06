const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product'); // Required for stock updates
const auth = require('../middleware/auth');

// Create a new order (User places order -> Stock decreases)
router.post('/', auth, async (req, res) => {
  try {
    const { items, total_amount, delivery_address } = req.body;

    // 1. Verify Stock for ALL items first
    for (const item of items) {
      const product = await Product.findById(item.medicine_id);
      if (!product) {
        return res.status(404).json({ detail: `Medicine not found: ${item.medicine_id}` });
      }
      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({ detail: `Insufficient stock for ${product.name}. Only ${product.stock_quantity} left.` });
      }
    }

    // 2. Create Order
    const newOrder = new Order({
      user_id: req.user.id,
      items,
      total_amount,
      delivery_address,
      status: 'pending'
    });
    await newOrder.save();

    // 3. Decrement Stock (Real-time update)
    // We use $inc: { stock_quantity: -qty } to safely subtract
    for (const item of items) {
      await Product.findByIdAndUpdate(item.medicine_id, {
        $inc: { stock_quantity: -item.quantity }
      });
    }

    res.status(201).json(newOrder);

  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Server Error' });
  }
});

// Get Pharmacy Orders
router.get('/pharmacy/me', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacy') return res.status(403).json({detail: 'Access denied'});
        
        // Find orders containing items sold by this pharmacy
        // Note: In a real app, you'd filter specific items. 
        // For this pilot, we return orders that *have* medicines from this pharmacy.
        const myProducts = await Product.find({ pharmacy_id: req.user.id }).select('_id');
        const productIds = myProducts.map(p => p._id);

        const orders = await Order.find({
            'items.medicine_id': { $in: productIds }
        })
        .populate('user_id', 'username phone')
        .populate('items.medicine_id', 'name unit_price')
        .sort({ created_at: -1 });

        res.json(orders);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Update Order Status (Accept/Reject)
router.patch('/:id/:action', auth, async (req, res) => {
    try {
        const { id, action } = req.params;
        const statusMap = { 'confirm': 'confirmed', 'cancel': 'cancelled' };
        
        if (!statusMap[action]) return res.status(400).json({ detail: 'Invalid action' });

        const order = await Order.findByIdAndUpdate(
            id, 
            { status: statusMap[action] },
            { new: true }
        );
        res.json(order);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

module.exports = router;
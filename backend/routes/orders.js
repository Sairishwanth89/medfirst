const express = require('express');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');
const { publish } = require('../core/rabbitmq'); 
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { pharmacy_id, delivery_address, notes, items } = req.body;
    let total_amount = 0;
    const orderItemsData = [];

    for (let item of items) {
      const medicine = await Medicine.findById(item.medicine_id);
      if (!medicine) throw new Error(`Medicine ${item.medicine_id} not found`);
      if (medicine.stock_quantity < item.quantity) throw new Error(`Insufficient stock for ${medicine.name}`);

      const subtotal = medicine.unit_price * item.quantity;
      total_amount += subtotal;
      
      orderItemsData.push({
        medicine_id: medicine._id,
        quantity: item.quantity,
        unit_price: medicine.unit_price,
        subtotal
      });
    }

    const order = await Order.create({
      user_id: req.user._id,
      pharmacy_id,
      total_amount,
      delivery_address,
      notes,
      status: 'pending',
      items: orderItemsData
    });

    // Publish to RabbitMQ
    try {
      publish('orders_queue', { order_id: order._id });
    } catch (err) {
      console.error("RabbitMQ Publish Error:", err);
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user._id }).populate('items.medicine_id');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

router.get('/pharmacy/me', auth, async (req, res) => {
  try {
    const Pharmacy = require('../models/Pharmacy');
    const pharmacy = await Pharmacy.findOne({ owner_id: req.user._id });
    
    if (!pharmacy) return res.status(404).json({ detail: 'Pharmacy not found' });

    const orders = await Order.find({ pharmacy_id: pharmacy._id })
      .populate('items.medicine_id')
      .sort({ created_at: -1 });
      
    res.json(orders);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;
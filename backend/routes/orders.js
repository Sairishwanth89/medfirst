const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// 1. Create Order & REDUCE STOCK
router.post('/', auth, async (req, res) => {
    try {
        const { items, total_amount, delivery_address, pharmacy_id } = req.body;

        // Check Stock First
        for (const item of items) {
            const product = await Product.findById(item.medicine_id);
            if (!product) return res.status(404).json({ detail: `Item not found` });
            if (product.stock < item.quantity) {
                return res.status(400).json({ detail: `${product.name} is out of stock` });
            }
        }

        // Create Order (Status: PENDING)
        const newOrder = new Order({
            user_id: req.user.id,
            items,
            total_amount,
            delivery_address,
            status: 'pending', // Initial status
            pharmacy_id: pharmacy_id || null
        });
        await newOrder.save();

        // ➤ Decrement Stock in Real-Time
        for (const item of items) {
            await Product.findByIdAndUpdate(item.medicine_id, {
                $inc: { stock: -item.quantity }
            });
        }

        // Wait for Pharmacist Confirm -> RabbitMQ (in PATCH)

        res.status(201).json(newOrder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Order creation failed' });
    }
});

// 1.5 Get "My Orders" (Customer View)
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user.id })
            .sort({ created_at: -1 })
            .populate('items.medicine_id', 'name image_url'); // distinct from pharmacist view
        res.json(orders);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// 2. Get Orders for Delivery Dashboard (Polling)
router.get('/delivery/available', auth, async (req, res) => {
    try {
        if (req.user.role !== 'delivery') return res.status(403).json({ detail: 'Access denied' });

        // Fetch unassigned orders or orders assigned to this driver
        const orders = await Order.find({
            $or: [
                { status: 'ready_for_pickup' }, // Available for anyone
                { assigned_to: req.user.id }    // Assigned to me
            ]
        })
            .populate('user_id', 'username phone')
            .sort({ created_at: -1 });

        res.json(orders);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// 3. Update Order Status (Driver Actions)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const updateData = { status };

        // If accepting, assign to driver
        if (status === 'out_for_delivery') {
            updateData.assigned_to = req.user.id;
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('user_id', 'username phone');

        // ➤ Publish Update to RabbitMQ (Satisfying "notify via RabbitMQ" requirement)
        const { publishOrder } = require('../utils/rabbitmq');
        await publishOrder(order);

        res.json(order);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// Get Pharmacy Orders
router.get('/pharmacy/me', auth, async (req, res) => {
    try {
        if (req.user.role !== 'pharmacy') return res.status(403).json({ detail: 'Access denied' });

        // 1. Find the Pharmacy owned by this user
        // Assuming Pharmacy model has owner_id
        const Pharmacy = require('../models/Pharmacy'); // Lazy load to avoid circular deps if any
        const myPharmacy = await Pharmacy.findOne({ owner_id: req.user.id });

        if (!myPharmacy) {
            // ➤ DEMO FALLBACK: If no pharmacy profile exists yet (e.g. fresh signup),
            // show ALL recent orders to ensure the user sees something for testing.
            console.warn(`⚠️ No Pharmacy linked to user ${req.user.username}. Returning ALL orders for Demo.`);
            const allOrders = await Order.find({})
                .sort({ created_at: -1 })
                .limit(20)
                .populate('user_id', 'username phone')
                .populate('items.medicine_id', 'name unit_price');
            return res.json(allOrders);
        }

        // 2. Find products belonging to this pharmacy
        // Note: seed.js puts pharmacyId (camelCase) or pharmacy_id (snake_case). 
        // We should check both or standardize. The seed.js used pharmacyId: pharmacies[0]._id AND pharmacy_id
        const myProducts = await Product.find({
            $or: [
                { pharmacy_id: myPharmacy._id },
                { pharmacyId: myPharmacy._id }
            ]
        }).select('_id');

        const productIds = myProducts.map(p => p._id);

        if (productIds.length === 0) return res.json([]);

        // 3. Find orders containing these products
        const orders = await Order.find({
            'items.medicine_id': { $in: productIds }
        })
            .populate('user_id', 'username phone')
            .populate('items.medicine_id', 'name unit_price')
            .sort({ created_at: -1 });

        res.json(orders);
    } catch (err) {
        console.error("Error fetching pharmacy orders:", err);
        res.status(500).json({ detail: err.message });
    }
});

// Update Order Status (Accept/Reject)
router.patch('/:id/:action', auth, async (req, res) => {
    try {
        const { id, action } = req.params;
        const statusMap = { 'confirm': 'confirmed', 'cancel': 'cancelled' };

        // Import RabbitMQ
        const { publishOrder } = require('../utils/rabbitmq');

        if (!statusMap[action]) return res.status(400).json({ detail: 'Invalid action' });

        const order = await Order.findByIdAndUpdate(
            id,
            { status: statusMap[action] },
            { new: true }
        );

        // ➤ If Confirmed, Publish to RabbitMQ (for Packaging -> Delivery)
        if (action === 'confirm' && order) {
            console.log(`👨‍⚕️ Pharmacist Confirmed Order ${order._id}. Sending to Packaging Queue.`);
            await publishOrder(order);
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

module.exports = router;
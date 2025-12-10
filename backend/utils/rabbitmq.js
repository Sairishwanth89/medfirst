const amqp = require('amqplib');

let channel = null;
let connection = null;

// Connect to RabbitMQ
const connectRabbitMQ = async () => {
    try {
        // Retry logic implied or let it fail if no RabbitMQ
        connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');
        channel = await connection.createChannel();
        await channel.assertQueue('orders_queue', { durable: true });
        console.log("✅ Connected to RabbitMQ");
        return channel;
    } catch (err) {
        console.error("❌ RabbitMQ Connection Failed:", err.message);
        return null;
    }
};

const getChannel = () => channel;

const publishOrder = async (order) => {
    if (!channel) {
        console.error("RabbitMQ channel not available. Skipping publish.");
        return;
    }
    try {
        channel.sendToQueue('orders_queue', Buffer.from(JSON.stringify(order)));
        console.log(`📤 Order ${order._id} sent to RabbitMQ`);
    } catch (err) {
        console.error("Failed to publish order:", err);
    }
};

const startConsumer = async () => {
    if (!channel) {
        console.log("Waiting for RabbitMQ channel...");
        setTimeout(startConsumer, 3000);
        return;
    }

    try {
        await channel.assertQueue('orders_queue', { durable: true });
        console.log("🎧 RabbitMQ Consumer Started. Waiting for messages...");

        channel.consume('orders_queue', async (msg) => {
            if (msg !== null) {
                const orderData = JSON.parse(msg.content.toString());
                console.log(`📥 [RabbitMQ] Processing Order: ${orderData._id}`);

                // Simulate Warehouse Processing Delay
                setTimeout(async () => {
                    try {
                        const Order = require('../models/Order'); // Lazy load

                        // Update Status: pending -> ready_for_pickup
                        // Also Assign to 'Unassigned' if needed, but ready_for_pickup implies it
                        await Order.findByIdAndUpdate(orderData._id, {
                            status: 'ready_for_pickup',
                            updated_at: new Date()
                        });

                        console.log(`✅ [RabbitMQ] Order ${orderData._id} is Ready for Pickup`);
                        channel.ack(msg);
                    } catch (e) {
                        console.error("❌ Processing failed:", e.message);
                        // channel.nack(msg);
                    }
                }, 500); // 0.5 Seconds processing time (Rapid Mode)
            }
        });
    } catch (err) {
        console.error("Consumer error:", err);
    }
};

module.exports = { connectRabbitMQ, getChannel, publishOrder, startConsumer };

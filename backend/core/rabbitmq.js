const amqp = require('amqplib');

let channel = null;

const connectRabbitMQ = async () => {
  try {
    const amqpServer = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASS}@${process.env.RABBITMQ_HOST}`;
    const connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue('orders_queue', { durable: true });
    console.log('RabbitMQ connected');
  } catch (error) {
    console.error('RabbitMQ connection failed:', error);
  }
};

connectRabbitMQ();

const publish = (queue, msg) => {
  if (!channel) {
    console.error('RabbitMQ channel not established');
    return;
  }
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), { persistent: true });
  console.log(`Message sent to ${queue}`);
};

module.exports = { publish };
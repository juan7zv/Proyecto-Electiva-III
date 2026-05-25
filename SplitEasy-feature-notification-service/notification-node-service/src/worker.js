const amqp = require('amqplib');
const db = require('./db');

const EXCHANGE_NAME = 'spliteasy.expense.events';
const QUEUE_NAME = 'notification.expense.created';

async function startConsumer(log) {
  if (process.env.USE_BROKER !== 'true') return;

  const connect = async () => {
    const url = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    connection.on('close', () => {
      log.warn('notification worker disconnected; retrying');
      setTimeout(connect, 5000);
    });

    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

    await channel.consume(QUEUE_NAME, async (message) => {
      if (!message) return;
      try {
        const event = JSON.parse(message.content.toString());
        const recipients = new Set([event.paid_by, ...(event.splits || []).map((split) => split.user_id)]);
        await Promise.all([...recipients].map((userId) => db.query(
          `INSERT INTO notifications (user_id, type, message, group_id, amount)
           VALUES ($1, 'expense_created', $2, $3, $4)`,
          [userId, `Se registro un gasto de ${event.amount}`, event.group_id, event.amount]
        )));
        channel.ack(message);
      } catch (error) {
        log.warn({ error: error.message }, 'failed processing notification event');
        channel.nack(message, false, true);
      }
    });

    log.info(`Notification worker listening on ${QUEUE_NAME}`);
  };

  connect().catch((error) => {
    log.warn({ error: error.message }, 'notification worker waiting for RabbitMQ');
    setTimeout(startConsumer, 5000, log);
  });
}

module.exports = { startConsumer };

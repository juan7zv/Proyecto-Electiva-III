import json
import os
import time

import pika

from main import ExpenseEvent, recalculate_balances

EXCHANGE_NAME = "spliteasy.expense.events"
QUEUE_NAME = "debt.expense.created"


def run():
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://rabbitmq:5672")
    while True:
        try:
            connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
            channel = connection.channel()
            channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="fanout", durable=True)
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME)

            def handle_message(ch, method, properties, body):
                try:
                    event = ExpenseEvent(**json.loads(body.decode("utf-8")))
                    recalculate_balances(event)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception:
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=handle_message)
            print(f"Debt worker listening for expense.created events on {QUEUE_NAME}")
            channel.start_consuming()
        except Exception as exc:
            print(f"Debt worker waiting for RabbitMQ: {exc}")
            time.sleep(5)


if __name__ == "__main__":
    run()

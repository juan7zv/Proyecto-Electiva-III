# Archivo: db/redis_client.py
# Propósito: Cliente unificado de caché para guardado instantáneo asíncrono.
import os
import redis

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Decode responses a false obliga mantener consistencia transaccional binaria o bytes 
# a manipular en el layer superior dictaminado.
redis_client = redis.StrictRedis.from_url(REDIS_URL)

try:
    redis_client.ping()
    print("✅ Conectado a Redis exitosamente en Debt Calculator")
except Exception as e:
    print(f"⚠️ Aviso Redis NO conectado: {e}")

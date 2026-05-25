# Archivo: main.py
# Propósito: API FastAPI para el cálculo de deudas y punto de recepción (webhook) del broker asíncrono.
import os
import json
import logging
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from db.redis_client import redis_client
from calculator.algorithm import optimize_debts

from fastapi.middleware.cors import CORSMiddleware

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("debt-calculator-service")

app = FastAPI(title="Debt Calculator Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:5170")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def require_gateway(x_gateway_secret: str = Header(default="")):
    expected = os.environ.get("GATEWAY_SHARED_SECRET", "")
    if expected and x_gateway_secret != expected:
        logger.warning("gateway auth rejected")
        raise HTTPException(status_code=403, detail="Acceso permitido solo desde API Gateway")

@app.get("/health")
def health():
    return {"status": "ok", "service": "debt-calculator-service"}

class SplitItem(BaseModel):
    user_id: str
    amount_owed: float

class ExpenseEvent(BaseModel):
    expense_id: str
    group_id: str
    paid_by: str
    amount: float
    splits: List[SplitItem]

@app.get("/balances/{group_id}")
def get_balances(group_id: str, _: None = Depends(require_gateway)):
    """Retorna los balances netos y en crudo almacenados en caché Redis."""
    logger.info("balances requested group_id=%s", group_id)
    raw_balances = redis_client.hgetall(f"balances:{group_id}")
    if not raw_balances:
        logger.info("balances cache miss group_id=%s", group_id)
        return {}
    
    # Decodificar valores desde bytes (Redis) a string->float
    balances = {k.decode('utf-8'): float(v.decode('utf-8')) for k, v in raw_balances.items()}
    logger.info("balances returned group_id=%s count=%s", group_id, len(balances))
    return balances


@app.get("/debts/{group_id}")
def get_optimal_debts(group_id: str, _: None = Depends(require_gateway)):
    """Devuelve la lista precalculada de transferencias óptimas para liquidar sumas."""
    logger.info("debts requested group_id=%s", group_id)
    cached_debts = redis_client.get(f"debts:{group_id}")
    if not cached_debts:
        logger.info("debts cache miss group_id=%s", group_id)
        return []
    debts = json.loads(cached_debts)
    logger.info("debts returned group_id=%s count=%s", group_id, len(debts))
    return debts


@app.post("/balances/recalculate")
def recalculate_balances(event: ExpenseEvent, _: None = Depends(require_gateway)):
    """
    Simula o funge como handler del subscriptor del Broker RabbitMQ.
    Recibe el Payload idéntico de 'expense.created'.
    Actualiza deudas incrementales y corre el algoritmo de optimización asíncrono.
    """
    try:
        group_id = event.group_id
        paid_by = event.paid_by
        logger.info(
            "recalculate started group_id=%s expense_id=%s paid_by=%s splits=%s amount=%s",
            group_id,
            event.expense_id,
            paid_by,
            len(event.splits),
            event.amount,
        )
        
        # 1. Modificación incremental de Net Balances:
        # A quien pagó se le aumenta el crédito. A quienes deben, se les resta crédito.
        # Operamos directamente en Redis transaccional mediante HINCRBYFLOAT o leyendolo entero.
        
        for split in event.splits:
             # El deudor disminuye su balance neto
             redis_client.hincrbyfloat(f"balances:{group_id}", split.user_id, -split.amount_owed)
             
             # El que adelantó el pago asume ese saldo positivo a su cuenta
             redis_client.hincrbyfloat(f"balances:{group_id}", paid_by, split.amount_owed)
             
             # Nota: si paid_by == user_id, suma un negativo y un positivo de igual monto y su saldo queda neto. Ideal.
             
        # 2. Rescatar toda la base contable del grupo en Redis para pasarlo al algoritmo.
        raw_bals = redis_client.hgetall(f"balances:{group_id}")
        net_balances = {k.decode('utf-8'): float(v.decode('utf-8')) for k, v in raw_bals.items()}
        
        # 3. Correr asimilación Óptima Matemática.
        optimal_plan = optimize_debts(net_balances)
        
        # 4. Guardar plan re-calculado en Redis
        redis_client.set(f"debts:{group_id}", json.dumps(optimal_plan))
        logger.info(
            "recalculate finished group_id=%s balances=%s debts=%s",
            group_id,
            len(net_balances),
            len(optimal_plan),
        )
        
        return {"message": "Recálculo exitoso aplicado localmente", "new_plan": optimal_plan}
        
    except Exception as e:
        logger.exception("recalculate failed group_id=%s expense_id=%s", event.group_id, event.expense_id)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient

DEBT_API_URL = os.getenv("DEBT_API_URL", "http://localhost:8000")
EXPENSE_API_URL = os.getenv("EXPENSE_API_URL", "http://localhost:8081")
MONGO_URL = os.getenv("MONGO_URL", "")

app = FastAPI(title="SplitEasy AI Agent Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5170")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def require_gateway(x_gateway_secret: str = Header(default="")):
    expected = os.getenv("GATEWAY_SHARED_SECRET", "")
    if expected and x_gateway_secret != expected:
        raise HTTPException(status_code=403, detail="Acceso permitido solo desde API Gateway")


class ChatRequest(BaseModel):
    group_id: str
    question: str


def get_logs_collection():
    if not MONGO_URL:
        return None
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=800)
        client.admin.command("ping")
        return client["ai_agent_db"]["chat_logs"]
    except Exception:
        return None


def fetch_json(url: str, fallback: Any):
    try:
        headers = {}
        secret = os.getenv("GATEWAY_SHARED_SECRET", "")
        if secret:
            headers["X-Gateway-Secret"] = secret
        response = requests.get(url, timeout=2, headers=headers)
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    return fallback


def build_answer(question: str, group_id: str, balances: Dict[str, float], debts: List[Dict[str, Any]], expenses: List[Dict[str, Any]]) -> str:
    normalized = question.lower()
    total_spent = sum(float(expense.get("amount", 0)) for expense in expenses)

    if "debo" in normalized or "deuda" in normalized or "liquid" in normalized or "pagar" in normalized:
        if debts:
            lines = [
                f"{item.get('from')} debe pagar {round(float(item.get('amount', 0)), 2)} a {item.get('to')}"
                for item in debts
            ]
            return "El plan optimo para liquidar el grupo es: " + "; ".join(lines) + "."
        return "Por ahora no hay transferencias pendientes calculadas para este grupo."

    if "balance" in normalized or "saldo" in normalized:
        if balances:
            ordered = sorted(balances.items(), key=lambda item: item[1], reverse=True)
            lines = [f"{user}: {round(amount, 2)}" for user, amount in ordered]
            return "Estos son los balances actuales: " + "; ".join(lines) + "."
        return "No encontre balances calculados para este grupo todavia."

    if "resumen" in normalized or "grupo" in normalized or "gastos" in normalized:
        return (
            f"Resumen del grupo {group_id}: hay {len(expenses)} gastos registrados, "
            f"un total acumulado de {round(total_spent, 2)} y {len(debts)} transferencias sugeridas."
        )

    return (
        "Puedo ayudarte con balances, deudas y resumenes del grupo. "
        f"En este momento veo {len(expenses)} gastos y {len(debts)} movimientos de liquidacion sugeridos."
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-agent-service"}


@app.post("/chat")
def chat(
    payload: ChatRequest,
    x_user_id: Optional[str] = Header(default=None),
    _: None = Depends(require_gateway),
):
    balances = fetch_json(f"{DEBT_API_URL}/balances/{payload.group_id}", {})
    debts = fetch_json(f"{DEBT_API_URL}/debts/{payload.group_id}", [])
    expenses = fetch_json(f"{EXPENSE_API_URL}/expenses?group_id={payload.group_id}", [])
    answer = build_answer(payload.question, payload.group_id, balances, debts, expenses)

    collection = get_logs_collection()
    if collection is not None:
        collection.insert_one({
            "user_id": x_user_id or "anonymous",
            "group_id": payload.group_id,
            "question": payload.question,
            "answer": answer,
            "created_at": datetime.now(timezone.utc),
        })

    return {
        "answer": answer,
        "context": {
            "balances_loaded": bool(balances),
            "debts_loaded": bool(debts),
            "expenses_loaded": bool(expenses),
        },
    }

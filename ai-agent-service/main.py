import os
import logging
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Dict, List, Optional

import requests
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient

DEBT_API_URL = os.getenv("DEBT_API_URL", "http://localhost:8000")
EXPENSE_API_URL = os.getenv("EXPENSE_API_URL", "http://localhost:8081")
MONGO_URL = os.getenv("MONGO_URL", "")
USER_GROUP_SERVICE_URL = os.getenv("USER_GROUP_SERVICE_URL", "http://localhost:8082")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:3001")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("ai-agent-service")

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
        logger.warning("gateway auth rejected")
        raise HTTPException(status_code=403, detail="Acceso permitido solo desde API Gateway")


class ChatRequest(BaseModel):
    group_id: str
    question: str


# Initialize MongoClient once
mongo_client = None
if MONGO_URL:
    try:
        mongo_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=2000)
        mongo_client.admin.command("ping")
        logger.info("MongoDB client connected successfully")
    except Exception:
        logger.exception("Failed to connect to MongoDB on startup. Logging to MongoDB will be disabled.")
        mongo_client = None


def get_logs_collection():
    if not mongo_client:
        return None
    try:
        return mongo_client["ai_agent_db"]["chat_logs"]
    except Exception:
        logger.exception("Failed to retrieve chat_logs collection")
        return None


def fetch_json(url: str, fallback: Any, source: str, headers: Optional[Dict[str, str]] = None):
    started = perf_counter()
    try:
        if headers is None:
            headers = {}
        secret = os.getenv("GATEWAY_SHARED_SECRET", "")
        if secret and "X-Gateway-Secret" not in headers:
            headers["X-Gateway-Secret"] = secret
        response = requests.get(url, timeout=2, headers=headers)
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        content_type = response.headers.get("content-type", "")
        logger.info(
            "upstream response source=%s status=%s elapsed_ms=%s content_type=%s url=%s",
            source,
            response.status_code,
            elapsed_ms,
            content_type,
            url,
        )
        if response.status_code == 200:
            try:
                return response.json()
            except ValueError:
                logger.error(
                    "upstream returned non-json source=%s status=%s body_preview=%r",
                    source,
                    response.status_code,
                    response.text[:200],
                )
                return fallback
        logger.warning(
            "upstream returned error source=%s status=%s body_preview=%r",
            source,
            response.status_code,
            response.text[:200],
        )
    except requests.RequestException:
        logger.exception("upstream request failed source=%s url=%s", source, url)
    return fallback


def fetch_user_name(user_id: str, fallback_name: str) -> str:
    user_data = fetch_json(f"{AUTH_SERVICE_URL}/auth/users/{user_id}", None, f"auth-user-{user_id}")
    if user_data and isinstance(user_data, dict) and "name" in user_data:
        return user_data["name"]
    return fallback_name or user_id


def build_groq_prompt(
    question: str,
    group_name: str,
    group_desc: str,
    members: List[Dict[str, str]],
    expenses: List[Dict[str, Any]],
    balances: Dict[str, float],
    debts: List[Dict[str, Any]],
    user_names: Dict[str, str]
) -> str:
    members_list = []
    for m in members:
        uid = m.get("user_id", "")
        role = m.get("role", "member")
        name = user_names.get(uid, m.get("name", uid))
        members_list.append(f"- {name} ({role})")
    members_str = "\n".join(members_list) if members_list else "Sin integrantes"

    expenses_list = []
    for exp in expenses:
        paid_by_id = exp.get("paid_by", "")
        paid_by_name = user_names.get(paid_by_id, paid_by_id)
        amount = exp.get("amount", 0.0)
        desc = exp.get("description", "Sin descripción")
        expenses_list.append(f"- {desc}: ${amount:.2f} pagado por {paid_by_name}")
    expenses_str = "\n".join(expenses_list) if expenses_list else "Sin gastos registrados"

    balances_list = []
    for uid, balance in balances.items():
        name = user_names.get(uid, uid)
        balances_list.append(f"- {name}: ${balance:.2f}")
    balances_str = "\n".join(balances_list) if balances_list else "Sin balances registrados"

    debts_list = []
    for debt in debts:
        from_id = debt.get("from", "")
        to_id = debt.get("to", "")
        from_name = user_names.get(from_id, from_id)
        to_name = user_names.get(to_id, to_id)
        amount = debt.get("amount", 0.0)
        debts_list.append(f"- {from_name} debe pagar ${amount:.2f} a {to_name}")
    debts_str = "\n".join(debts_list) if debts_list else "Sin transferencias sugeridas"

    prompt = (
        f"Datos del Grupo:\n"
        f"Nombre del Grupo: {group_name}\n"
        f"Descripción: {group_desc}\n\n"
        f"Integrantes del Grupo:\n{members_str}\n\n"
        f"Gastos Registrados:\n{expenses_str}\n\n"
        f"Balances Actuales (balance positivo significa saldo a favor, balance negativo significa deuda):\n{balances_str}\n\n"
        f"Plan Óptimo de Liquidación (Transferencias sugeridas):\n{debts_str}\n\n"
        f"Pregunta del Usuario: \"{question}\"\n\n"
        f"Instrucciones:\n"
        f"Responde la pregunta de forma natural, amigable y concisa en español utilizando los nombres reales provistos. "
        f"No inventes información que no esté en los datos. No muestres los IDs de los usuarios."
    )
    return prompt


def ask_groq(prompt: str) -> Optional[str]:
    if not GROQ_API_KEY:
        logger.info("GROQ_API_KEY is not defined, skipping Groq API call")
        return None
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Eres un asistente virtual inteligente para la aplicación SplitEasy, "
                    "una herramienta para dividir gastos y deudas entre amigos en grupos. "
                    "Responde de manera amable, clara y concisa en español basándote estrictamente "
                    "en los datos del grupo provistos. No inventes información adicional. "
                    "Si te preguntan por los integrantes o el total, usa los datos reales provistos. "
                    "Usa siempre los nombres reales de las personas y del grupo."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2
    }
    
    logger.info("Sending prompt to Groq API with model %s...", GROQ_MODEL)
    started = perf_counter()
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=6)
        elapsed_ms = round((perf_counter() - started) * 1000, 2)
        logger.info("Groq API response code=%s elapsed_ms=%s", response.status_code, elapsed_ms)
        if response.status_code == 200:
            res_json = response.json()
            answer = res_json["choices"][0]["message"]["content"]
            logger.info("Groq returned answer: %s", answer[:100] + "...")
            return answer
        else:
            logger.warning("Groq API error status=%s response=%r", response.status_code, response.text[:200])
    except Exception:
        logger.exception("Exception occurred during Groq API request")
    return None


def build_answer(
    question: str,
    group_id: str,
    balances: Dict[str, float],
    debts: List[Dict[str, Any]],
    expenses: List[Dict[str, Any]],
    group_name: Optional[str] = None,
    members: Optional[List[Dict[str, str]]] = None,
    user_names: Optional[Dict[str, str]] = None,
) -> str:
    normalized = question.lower()
    total_spent = sum(float(expense.get("amount", 0)) for expense in expenses)
    
    g_name = group_name or group_id
    u_names = user_names or {}
    m_list = members or []

    member_keywords = ("integrante", "integrantes", "miembro", "miembros", "personas", "participantes", "quien", "quién")
    debt_keywords = ("debo", "deuda", "deudas", "liquid", "pagar", "pago", "transferencia", "transferencias")
    balance_keywords = ("balance", "balances", "saldo", "saldos")
    expense_keywords = ("gasto", "gastos", "gastado", "total", "cuanto", "cuánto")
    summary_keywords = ("resumen", "grupo", "estado")

    # 1. Members check (prioritized first to avoid false matching "cuanto" or "grupo")
    if any(keyword in normalized for keyword in member_keywords):
        if m_list:
            names = [u_names.get(m.get("user_id"), m.get("name", m.get("user_id"))) for m in m_list]
            return f"El grupo {g_name} tiene {len(m_list)} integrantes: {', '.join(names)}."
        return f"No encontré integrantes registrados para el grupo {g_name}."

    # 2. Debts/Settlement
    if any(keyword in normalized for keyword in debt_keywords):
        if debts:
            lines = []
            for item in debts:
                from_id = item.get("from")
                to_id = item.get("to")
                from_name = u_names.get(from_id, from_id)
                to_name = u_names.get(to_id, to_id)
                lines.append(f"{from_name} debe pagar {round(float(item.get('amount', 0)), 2)} a {to_name}")
            return f"El plan óptimo para liquidar el grupo {g_name} es: " + "; ".join(lines) + "."
        return f"Por ahora no hay transferencias pendientes calculadas para el grupo {g_name}."

    # 3. Balances
    if any(keyword in normalized for keyword in balance_keywords):
        if balances:
            ordered = sorted(balances.items(), key=lambda item: item[1], reverse=True)
            lines = [f"{u_names.get(user, user)}: {round(amount, 2)}" for user, amount in ordered]
            return f"Estos son los balances actuales del grupo {g_name}: " + "; ".join(lines) + "."
        return f"No encontré balances calculados para el grupo {g_name} todavía."

    # 4. Expenses
    if any(keyword in normalized for keyword in expense_keywords):
        if expenses:
            return (
                f"El grupo {g_name} tiene {len(expenses)} gastos registrados "
                f"por un total de {round(total_spent, 2)}."
            )
        return f"No encontré gastos registrados para el grupo {g_name} todavía."

    # 5. Summary
    if any(keyword in normalized for keyword in summary_keywords):
        return (
            f"Resumen del grupo {g_name}: hay {len(expenses)} gastos registrados, "
            f"un total acumulado de {round(total_spent, 2)} y {len(debts)} transferencias sugeridas."
        )

    # Default fallback
    return (
        f"Puedo ayudarte con balances, deudas y resúmenes del grupo {g_name}. "
        f"En este momento veo {len(expenses)} gastos y {len(debts)} movimientos de liquidación sugeridos."
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-agent-service"}


@app.post("/chat")
def chat(
    payload: ChatRequest,
    request: Request,
    x_user_id: Optional[str] = Header(default=None),
    _: None = Depends(require_gateway),
):
    logger.info(
        "chat request received user_id=%s group_id=%s question=%r",
        x_user_id or "anonymous",
        payload.group_id,
        payload.question,
    )
    
    cookie_header = request.headers.get("cookie")
    headers = {}
    if cookie_header:
        headers["cookie"] = cookie_header

    group_data = fetch_json(f"{USER_GROUP_SERVICE_URL}/groups/{payload.group_id}", None, "group-details", headers=headers)
    
    if group_data and isinstance(group_data, dict):
        group_name = group_data.get("name", payload.group_id)
        group_desc = group_data.get("description", "")
        members = group_data.get("members", [])
    else:
        group_name = payload.group_id
        group_desc = ""
        members = []

    user_names = {}
    for m in members:
        uid = m.get("user_id")
        if uid:
            fallback = m.get("name") or uid
            user_names[uid] = fetch_user_name(uid, fallback)

    balances = fetch_json(f"{DEBT_API_URL}/balances/{payload.group_id}", {}, "debt-balances", headers=headers)
    debts = fetch_json(f"{DEBT_API_URL}/debts/{payload.group_id}", [], "debt-plan", headers=headers)
    expenses = fetch_json(f"{EXPENSE_API_URL}/expenses?group_id={payload.group_id}", [], "expenses", headers=headers)
    
    answer = None
    if GROQ_API_KEY:
        prompt = build_groq_prompt(
            payload.question,
            group_name,
            group_desc,
            members,
            expenses,
            balances,
            debts,
            user_names
        )
        answer = ask_groq(prompt)
    
    if not answer:
        if GROQ_API_KEY:
            logger.warning("Groq call failed, falling back to local heuristic engine")
        else:
            logger.info("Using local heuristic engine (no GROQ_API_KEY)")
        answer = build_answer(
            payload.question,
            payload.group_id,
            balances,
            debts,
            expenses,
            group_name=group_name,
            members=members,
            user_names=user_names
        )

    logger.info(
        "chat answer built group_id=%s balances_loaded=%s debts_loaded=%s expenses_loaded=%s",
        payload.group_id,
        bool(balances),
        bool(debts),
        bool(expenses),
    )

    collection = get_logs_collection()
    if collection is not None:
        try:
            collection.insert_one({
                "user_id": x_user_id or "anonymous",
                "group_id": payload.group_id,
                "question": payload.question,
                "answer": answer,
                "created_at": datetime.now(timezone.utc),
                "context": {
                    "balances_loaded": bool(balances),
                    "debts_loaded": bool(debts),
                    "expenses_loaded": bool(expenses),
                },
            })
            logger.info("chat log persisted group_id=%s", payload.group_id)
        except Exception:
            logger.exception("chat log insert failed group_id=%s", payload.group_id)

    return {
        "answer": answer,
        "context": {
            "balances_loaded": bool(balances),
            "debts_loaded": bool(debts),
            "expenses_loaded": bool(expenses),
        },
    }

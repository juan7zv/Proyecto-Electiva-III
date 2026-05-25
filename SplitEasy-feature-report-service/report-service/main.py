try:
    import functions_framework
    from flask_cors import cross_origin
    HAS_FF = True
except ImportError:
    HAS_FF = False

from flask import jsonify
import requests
import os

EXPENSE_API_URL = os.environ.get("EXPENSE_API_URL", "http://localhost:8081")
DEBT_API_URL = os.environ.get("DEBT_API_URL", "http://localhost:8000")

def internal_headers():
    secret = os.environ.get("GATEWAY_SHARED_SECRET", "")
    return {"X-Gateway-Secret": secret} if secret else {}

def maybe_ff_http(func):
    if HAS_FF:
        return functions_framework.http(cross_origin()(func))
    return func

def generate_report_handler(request):

    """
    HTTP Cloud Function para generar reportería.
    Agregador Stateless de Expense Service y Debt Calculator.
    Incluye Mocks de seguridad para facilitar validación del flujo.
    """
    path = getattr(request, "path", "")
    if not isinstance(path, str):
        path = ""

    if path == "/health":
        return jsonify({"status": "ok", "service": "report-service", "mode": "serverless"}), 200

    expected_secret = os.environ.get("GATEWAY_SHARED_SECRET", "")
    if expected_secret and request.headers.get("X-Gateway-Secret") != expected_secret:
        return jsonify({"error": "Acceso permitido solo desde API Gateway"}), 403

    group_id = request.args.get('group_id')
    if not group_id and path:
        group_id = path.strip("/").split("/")[0]
    if not group_id:
        return jsonify({"error": "Falta el parámetro group_id"}), 400

    try:
        # 1. Obtener Gastos
        try:
            exp_resp = requests.get(f"{EXPENSE_API_URL}/expenses?group_id={group_id}", timeout=3, headers=internal_headers())
            expenses = exp_resp.json() if exp_resp.status_code == 200 else []
        except:
            expenses = [] # Fallback a lista vacía

        # 2. Obtenener Balances y Deudas reales
        balances = {}
        optimal_debts = []
        
        try:
            bal_resp = requests.get(f"{DEBT_API_URL}/balances/{group_id}", timeout=2, headers=internal_headers())
            if bal_resp.status_code == 200:
                balances = bal_resp.json()
            else:
                raise Exception("Debt API error status")
            
            debt_resp = requests.get(f"{DEBT_API_URL}/debts/{group_id}", timeout=2, headers=internal_headers())
            optimal_debts = debt_resp.json() if debt_resp.status_code == 200 else []
            
        except:
            balances = {}
            optimal_debts = []

        # 3. Consolidación
        total_spent = sum([float(e.get("amount", 0)) for e in expenses])
        
        report = {
            "summary": {
                "group_id": group_id,
                "total_expenses_registered": len(expenses),
                "gross_total_spent": total_spent,
                "status": "ready"
            },
            "balances": balances,
            "optimal_settlement_plan": optimal_debts,
            "expense_historicals": expenses
        }

        return jsonify(report), 200

    except Exception as e:
        return jsonify({"error": f"Error inesperado genérico: {str(e)}"}), 500


generate_report = maybe_ff_http(generate_report_handler)

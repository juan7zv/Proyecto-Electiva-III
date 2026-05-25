# Archivo: calculator/algorithm.py
# Propósito: Reductor óptimo de deudas. Minimizando número total de transferencias.
from typing import Dict, List, Any

def optimize_debts(balances: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Paso 1: Saldo neto ya calculado por el main.py desde Redis.
    Paso 2: Separar Acreedores (+) y Deudores (-)
    Paso 3: Greedy Match hasta zerar colas.
    """
    debtors = []
    creditors = []
    
    # Tolerancia para redondeos flotantes
    EPSILON = 0.01

    for user, balance in balances.items():
        if balance < -EPSILON:
            debtors.append({"user": user, "amount": abs(balance)})
        elif balance > EPSILON:
            creditors.append({"user": user, "amount": balance})
            
    # Ordenar por el que debe mas y el que le deben mas, mejora eficiencia (opcional)
    debtors.sort(key=lambda x: x["amount"], reverse=True)
    creditors.sort(key=lambda x: x["amount"], reverse=True)

    transactions = []
    
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]
        
        transfer_amount = min(debtor["amount"], creditor["amount"])
        
        transactions.append({
            "from": debtor["user"],
            "to": creditor["user"],
            "amount": round(transfer_amount, 2)
        })
        
        debtors[i]["amount"] -= transfer_amount
        creditors[j]["amount"] -= transfer_amount
        
        if debtors[i]["amount"] <= EPSILON:
            i += 1
        if creditors[j]["amount"] <= EPSILON:
            j += 1
            
    return transactions

# Archivo: tests/test_calculator.py
# Propósitos: Probar validez del Greedy match sin levantar la app real ni Redis.
from calculator.algorithm import optimize_debts

def test_optimal_debts_3_people():
    # Escenario Clásico: A paga $90 por todos (él inclusive).
    # A pagó +90.
    # A consumió 30 (Neto: +60)
    # B consumió 30 (Neto: -30)
    # C consumió 30 (Neto: -30)
    
    balances = {
        "A": 60.0,
        "B": -30.0,
        "C": -30.0
    }
    
    result = optimize_debts(balances)
    
    # Debe requerir EXACTAMENTE 2 transferencias y no 3.
    assert len(result) == 2
    
    # Verificamos que los que deben (B y C), le paguen 30 a "A" (El acreedor maximo / unico).
    for tx in result:
        assert tx["to"] == "A"
        assert tx["from"] in ["B", "C"]
        assert tx["amount"] == 30.0

def test_zero_balances():
    # Grupo ya liquidado.
    balances = {
        "P1": 0.0,
        "P2": 0.0
    }
    
    result = optimize_debts(balances)
    assert len(result) == 0

def test_chain_debt_reduction():
    # A le debe a B 50. B le debe a C 50. 
    # Saldos: A: -50, B: 0, C: 50.
    # El resultado debe saltarse a B, haciendo que A pague a C.
    balances = {
        "A": -50.0,
        "B": 0.0,
        "C": 50.0
    }
    
    result = optimize_debts(balances)
    assert len(result) == 1
    assert result[0]["from"] == "A"
    assert result[0]["to"] == "C"
    assert result[0]["amount"] == 50.0

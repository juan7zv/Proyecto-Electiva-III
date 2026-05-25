# Archivo: tests/test_report.py
from unittest.mock import patch, Mock
from flask import Flask
import main

@patch('main.requests.get')
def test_report_generation(mock_get):
    # Simulamos respuestas del Microservicio de Gastos
    mock_exp = Mock()
    mock_exp.status_code = 200
    mock_exp.json.return_value = [{"id": "xyz", "amount": 90}]
    
    # Simulartes respuestas de balances
    mock_bal = Mock()
    mock_bal.status_code = 200
    mock_bal.json.return_value = {"us1": 60, "us2": -30, "us3": -30}
    
    # Simular opt debts
    mock_deb = Mock()
    mock_deb.status_code = 200
    mock_deb.json.return_value = [{"from": "us2", "to": "us1", "amount": 30}]
    
    # El parche side_effect nos envuelve la respuesta según el orden de llamadas de requests.get en runtime
    mock_get.side_effect = [mock_exp, mock_bal, mock_deb]

    mock_request = Mock()
    mock_request.args.get.return_value = "grupo-1"
    
    app = Flask(__name__)
    with app.app_context():
        res, status = main.generate_report_handler(mock_request)
    
    assert status == 200
    json_body = res.json
    assert json_body["summary"]["group_id"] == "grupo-1"
    assert json_body["summary"]["gross_total_spent"] == 90.0

def test_missing_group_id():
    mock_request = Mock()
    mock_request.args.get.return_value = None
    
    app = Flask(__name__)
    with app.app_context():
        res, status = main.generate_report_handler(mock_request)
    assert status == 400
    assert "Falta el parámetro group_id" in res.json["error"]

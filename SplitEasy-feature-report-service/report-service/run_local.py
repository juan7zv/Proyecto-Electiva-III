from flask import Flask, request, jsonify
from flask_cors import CORS
from main import generate_report
import os

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    # Simulamos el comportamiento de functions_framework pasando el request de flask
    return generate_report(request)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    print(f"Iniciando Servidor de Reportes (Stand-alone Flask) en puerto {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)

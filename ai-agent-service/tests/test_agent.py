import requests

from main import build_answer, fetch_json


def test_agent_builds_settlement_answer():
    answer = build_answer(
        "Como liquidamos todo?",
        "group-1",
        {"ana": 10, "juan": -10},
        [{"from": "juan", "to": "ana", "amount": 10}],
        [],
    )
    assert "juan debe pagar 10.0 a ana" in answer


def test_agent_builds_expense_answer():
    answer = build_answer(
        "Cuanto hemos gastado?",
        "group-1",
        {},
        [],
        [{"amount": 120.5}, {"amount": 80}],
    )
    assert "2 gastos" in answer
    assert "200.5" in answer


def test_agent_builds_members_answer():
    answer = build_answer(
        "Cuántos integrantes hay?",
        "group-1",
        {},
        [],
        [],
        group_name="Viaje de Amigos",
        members=[{"user_id": "u-1", "role": "admin", "name": "Carlos"}, {"user_id": "u-2", "role": "member", "name": "Sofía"}],
        user_names={"u-1": "Carlos", "u-2": "Sofía"}
    )
    assert "Viaje de Amigos" in answer
    assert "2 integrantes" in answer
    assert "Carlos" in answer
    assert "Sofía" in answer


def test_agent_builds_settlement_answer_with_names():
    answer = build_answer(
        "Cómo pagamos las deudas?",
        "group-1",
        {},
        [{"from": "u-1", "to": "u-2", "amount": 150.0}],
        [],
        group_name="Viaje de Amigos",
        user_names={"u-1": "Carlos", "u-2": "Sofía"}
    )
    assert "Carlos debe pagar 150.0 a Sofía" in answer



def test_fetch_json_returns_fallback_for_non_json_response(monkeypatch):
    class Response:
        status_code = 200
        text = "Internal Server Error"
        headers = {"content-type": "text/plain"}

        def json(self):
            raise ValueError("not json")

    monkeypatch.setattr(requests, "get", lambda *args, **kwargs: Response())

    assert fetch_json("http://service.local/error", {"safe": True}, "test") == {"safe": True}


def test_fetch_json_returns_fallback_for_request_error(monkeypatch):
    def raise_timeout(*args, **kwargs):
        raise requests.Timeout("timed out")

    monkeypatch.setattr(requests, "get", raise_timeout)

    assert fetch_json("http://service.local/timeout", [], "test") == []

from main import build_answer


def test_agent_builds_settlement_answer():
    answer = build_answer(
        "Como liquidamos todo?",
        "group-1",
        {"ana": 10, "juan": -10},
        [{"from": "juan", "to": "ana", "amount": 10}],
        [],
    )
    assert "juan debe pagar 10.0 a ana" in answer

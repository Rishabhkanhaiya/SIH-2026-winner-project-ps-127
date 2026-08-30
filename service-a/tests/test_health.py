"""
test_health.py — Tests for GET /health.
"""


def test_health_returns_200(client):
    resp = client.get("/health")
    assert resp.status_code == 200


def test_health_shape(client):
    data = client.get("/health").json()
    assert data["status"] == "ok"
    assert "model_version" in data
    assert isinstance(data["model_version"], str)
    assert len(data["model_version"]) > 0

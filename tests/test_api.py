"""API Integration Tests using FastAPI TestClient."""

import pytest
from fastapi.testclient import TestClient
from sentinel.api.main import app
from sentinel import Sentinel, SentinelStore

client = TestClient(app)


@pytest.fixture(autouse=True, scope="module")
def setup_test_db(tmp_path_factory):
    tmp_dir = tmp_path_factory.mktemp("api_test_db")
    test_db = str(tmp_dir / "test_sentinel_audit.db")
    store = SentinelStore(test_db)
    firewall = Sentinel.from_file("policies/default-firewall.yaml", db_path=test_db)
    import sentinel.api.routes as routes
    routes._store = store
    routes._firewall = firewall


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_evaluate_action_deny():
    payload = {
        "tool": "filesystem",
        "operation": "read",
        "resource": ".env",
    }
    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "DENY"
    assert data["allowed"] is False
    assert data["receipt_hash"] != ""


def test_evaluate_action_allow():
    payload = {
        "tool": "filesystem",
        "operation": "read",
        "resource": "workspace/README.md",
    }
    response = client.post("/api/v1/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "ALLOW"
    assert data["allowed"] is True


def test_list_policies():
    response = client.get("/api/v1/policies")
    assert response.status_code == 200
    data = response.json()
    assert "available_policies" in data
    assert len(data["available_policies"]) >= 1


def test_policy_validate_valid():
    valid_yaml = """
policy_id: "test-valid"
name: "Test Valid"
version: "1.0.0"
mode: "strict"
rules:
  - id: "r1"
    name: "R1"
    description: "test rule"
    decision: "ALLOW"
    priority: 100
    severity: "LOW"
    conditions:
      tool_match: "filesystem"
"""
    response = client.post("/api/v1/policies/validate", json={"yaml_content": valid_yaml})
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True


def test_attack_lab_scenarios_and_run():
    # List scenarios
    res_scenarios = client.get("/api/v1/attack-lab/scenarios")
    assert res_scenarios.status_code == 200
    scenarios = res_scenarios.json()
    assert len(scenarios) >= 10

    # Run benchmark
    res_run = client.post("/api/v1/attack-lab/run")
    assert res_run.status_code == 200
    report = res_run.json()
    assert report["total_scenarios"] >= 10
    assert report["pass_rate_percentage"] == 100.0


def test_stats_and_integrity():
    response = client.get("/api/v1/stats")
    assert response.status_code == 200
    data = response.json()
    assert "stats" in data
    assert "chain_integrity" in data
    assert data["chain_integrity"]["valid"] is True


def test_policy_assist_offline_fallback():
    response = client.post("/api/v1/policies/assist", json={"prompt": "Block outbound network access except to pypi"})
    assert response.status_code == 200
    data = response.json()
    assert "yaml_content" in data
    assert data["is_valid"] is True
    assert data["is_fallback"] is True  # Offline local fallback mode

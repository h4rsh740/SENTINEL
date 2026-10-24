"""Tests for Typer CLI commands."""

from typer.testing import CliRunner
from sentinel.cli import app

runner = CliRunner()


def test_cli_version():
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert "SENTINEL" in result.stdout
    assert "0.1.0" in result.stdout


def test_cli_policy_validate():
    result = runner.invoke(app, ["policy", "validate", "policies/default-firewall.yaml"])
    assert result.exit_code == 0
    assert "Policy Validated" in result.stdout
    assert "default-firewall-v1" in result.stdout


def test_cli_policy_test():
    result = runner.invoke(app, ["policy", "test", "policies/default-firewall.yaml"])
    assert result.exit_code == 0
    assert "All embedded policy unit tests passed" in result.stdout


def test_cli_simulate():
    result = runner.invoke(app, ["simulate", "--policy", "policies/default-firewall.yaml"])
    assert result.exit_code == 0
    assert "Attack Lab Results" in result.stdout
    assert "100.0%" in result.stdout

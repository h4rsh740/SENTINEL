# Contributing to SENTINEL

Thank you for your interest in contributing to SENTINEL! We welcome developers, security researchers, and AI builders to help expand agent firewall protections.

## Code of Conduct
Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before participating in discussions or PRs.

## How Can You Contribute?
1. **Contribute New Policies (`policies/`)**:
   - Write reusable policy packs (e.g., for specific toolkits like GitHub API, Bash, Docker, Browser).
   - Every policy must include embedded test cases validating allow and deny behavior.
2. **Add Attack Scenarios (`core/sentinel/lab/`)**:
   - Create safe, reproducible simulation scenarios demonstrating agent exploits and policy defenses.
   - All scenarios must use virtual/mock tools — never execute destructive commands or real exfiltrations.
3. **Core Engine & SDK Improvements**:
   - Enhance path normalization, regex safety, performance, or CLI ergonomics.
   - All PRs must include unit tests and keep test coverage high.
4. **Console UI & Developer Experience**:
   - Improve the Policy Studio, Decision Explorer, or Attack Lab visualization.

## Development Setup

```bash
# 1. Clone and enter repo
git clone https://github.com/bharatcode/sentinel.git
cd sentinel

# 2. Setup Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]

# 3. Run test suite
pytest

# 4. Setup Web Console
cd console
npm install
npm run dev
```

## Pull Request Guidelines
- Ensure `pytest` passes with 100% green tests.
- Format code using standard formatters (`ruff`, `prettier`).
- Document all new policy directives in `ARCHITECTURE.md` and user docs.
- No dynamic code execution (`eval`/`exec`) is permitted.

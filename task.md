# SENTINEL Task Plan & Specification

## Objective
Build **SENTINEL — Open-Source AI Agent Firewall**: a developer-friendly deterministic policy enforcement SDK, CLI, web console, and attack simulation lab that inspects and gates AI agent actions before they reach external tools.

## Phases & Deliverables

### Phase 1: Reconnaissance & Governance Docs <!-- id: phase-1 -->
- [x] Initial repository inspection (empty repo initialized with git, Python 3.14, Node v26). <!-- id: 1.1 -->
- [x] Create `BharatCode.txt` at root. <!-- id: 1.2 -->
- [x] Create `task.md` and `progress.md`. <!-- id: 1.3 -->
- [x] Create `ARCHITECTURE.md` and `THREAT_MODEL.md`. <!-- id: 1.4 -->
- [x] Create standard OSS files: `LICENSE` (Apache 2.0), `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `ROADMAP.md`, `.env.example`, `.gitignore`. <!-- id: 1.5 -->

### Phase 2: SENTINEL Core Policy Engine & Data Models <!-- id: phase-2 -->
- [x] Define typed Pydantic models: `Action`, `Rule`, `Policy`, `Decision`, `Receipt`, `ApprovalRequest`. <!-- id: 2.1 -->
- [x] Implement deterministic Policy Engine: <!-- id: 2.2 -->
  - Schema validation.
  - Fail-safe default-deny mechanism.
  - Priority-based deterministic rule matching.
  - Path normalization, directory containment, and path-traversal prevention.
  - Command allowlists & forbidden operation checks.
  - Network destination whitelist & CIDR/domain validation.
  - Require-approval state handling (agents cannot self-approve).
- [x] Implement Canonical Serialization & SHA-256 Tamper-Evident Hash Chaining for Decision Receipts. <!-- id: 2.3 -->
- [x] Implement Safe Tool Execution Adapter: wrapper ensuring denied actions strictly never touch tool execution. <!-- id: 2.4 -->
- [x] Implement SQLite-backed persistent store for decisions, audit receipts, and approval requests. <!-- id: 2.5 -->

### Phase 3: Core Test Suite & Non-Execution Proofs <!-- id: phase-3 -->
- [x] Write unit tests for schema validation, rule matching, priorities, and default-deny. <!-- id: 3.1 -->
- [x] Write test specifically proving that a denied or approval-pending action never calls the underlying tool callback. <!-- id: 3.2 -->
- [x] Write path traversal, symlink handling, and command injection tests. <!-- id: 3.3 -->
- [x] Write hash chain tamper-evident verification tests. <!-- id: 3.4 -->
- [x] Write API integration tests with FastAPI TestClient. <!-- id: 3.5 -->

### Phase 4: SENTINEL SDK & CLI <!-- id: phase-4 -->
- [x] Package `sentinel-firewall` via `pyproject.toml`. <!-- id: 4.1 -->
- [x] Provide Python SDK with clean entrypoints: `Sentinel.from_file()`, `Sentinel.from_dict()`, `Action`, `evaluate()`, `guard()`. <!-- id: 4.2 -->
- [x] Build Typer CLI (`sentinel`): <!-- id: 4.3 -->
  - `sentinel init`
  - `sentinel policy validate <path>`
  - `sentinel policy test <path>`
  - `sentinel simulate <scenarios>`
  - `sentinel explain <decision-id>`
  - `sentinel report --format json|markdown`
  - `sentinel version`
- [x] Test CLI commands and exit codes. <!-- id: 4.4 -->

### Phase 5: SENTINEL Attack Lab <!-- id: phase-5 -->
- [x] Build safe simulation framework with Virtual Filesystem and Fake Tool Adapters. <!-- id: 5.1 -->
- [x] Implement scenario catalogue (13 distinct realistic scenarios: `.env` exfiltration, `/etc/shadow` access, `rm -rf /` pipe commands, unauthorized outbound webhook, unknown tool invocation, directory breakout, human approval gate, malformed payload, conflicting rules, policy widening, benign operations). <!-- id: 5.2 -->
- [x] Build runner, pass/fail evaluation, reproducible benchmark metrics generator, and markdown/JSON export. <!-- id: 5.3 -->

### Phase 6: FastAPI Backend Service <!-- id: phase-6 -->
- [x] Implement REST API:
  - `POST /api/v1/evaluate`
  - `GET /api/v1/policies` & `POST /api/v1/policies/validate` & `POST /api/v1/policies/activate`
  - `GET /api/v1/attack-lab/scenarios` & `POST /api/v1/attack-lab/run`
  - `GET /api/v1/decisions` & `GET /api/v1/decisions/{id}` & `GET /api/v1/decisions/verify-chain`
  - `GET /api/v1/approvals` & `POST /api/v1/approvals/{id}/action`
  - `POST /api/v1/policies/assist` (BharatCode LLM assistance)
  - `GET /api/v1/stats`
- [x] Implement BharatCode API client (`https://bharatcode.ai/api/model/v1`, model: `qwen-3.8-27b`) with graceful offline/demo fallback. <!-- id: 6.2 -->
- [x] Test API endpoints via pytest. <!-- id: 6.3 -->

### Phase 7: SENTINEL Web Console (Next.js + Tailwind + TypeScript) <!-- id: phase-7 -->
- [x] Initialize Next.js App Router project with TypeScript strict mode, Tailwind CSS, Lucide icons. <!-- id: 7.1 -->
- [x] Build Dark-first developer-security navigation & layout (`Navbar`, `RootLayout`). <!-- id: 7.2 -->
- [x] Build **Dashboard**: real persisted metrics (allow, deny, approval, error counts), live stream timeline, status overview, quick actions. <!-- id: 7.3 -->
- [x] Build **Policy Studio**: real YAML syntax-aware editor, visual schema validation, embedded tester, BharatCode natural-language policy drafting assistant with diff view & test verification. <!-- id: 7.4 -->
- [x] Build **Attack Lab**: interactive scenario runner, live simulation output, pass/fail indicators, full benchmark executor, export reports. <!-- id: 7.5 -->
- [x] Build **Decision Explorer**: searchable, filterable receipt audit log, cryptographic hash chain verification viewer, full JSON receipt modal, approval action controls. <!-- id: 7.6 -->
- [x] Build **Interactive Playground / Docs**: quickstart SDK code snippets, CLI cheatsheet, architecture diagrams, policy schema reference. <!-- id: 7.7 -->

### Phase 8: Verification, Community Docs & Polishing <!-- id: phase-8 -->
- [x] Full pytest test run on Python backend & engine (28/28 passed). <!-- id: 8.1 -->
- [x] Production build of Next.js frontend (`npm run build` completed cleanly, 8 static routes). <!-- id: 8.2 -->
- [x] Verify clean setup from README without errors (`python demo.py` verified). <!-- id: 8.3 -->
- [x] Finalize `progress.md` with complete evidence-backed deliverables. <!-- id: 8.4 -->

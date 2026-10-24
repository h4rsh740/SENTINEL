# SENTINEL Project Roadmap

SENTINEL is built with a focused, staged vision for autonomous agent runtime security.

---

## 🎯 Phase 1: Deterministic Engine & Safe Simulation (Completed - v0.1.0)
- [x] Pure, zero-LLM deterministic policy evaluation engine.
- [x] Fail-safe default-deny and priority-based rule evaluation.
- [x] Guaranteed tool non-execution for blocked or pending-approval actions.
- [x] RFC-8785 canonical JSON serialization with sequential SHA-256 hash chaining.
- [x] Typer CLI (`sentinel init`, `validate`, `test`, `simulate`, `explain`, `report`).
- [x] SENTINEL Attack Lab with 13 reproducible safe scenarios.
- [x] BharatCode API advisory integration (`qwen-3.8-27b`) for policy authoring.
- [x] Full Next.js Web Console (Dashboard, Policy Studio, Attack Lab, Decision Explorer, Docs).

---

## 🚀 Phase 2: Native Agent Framework Adapters (Q1 2027)
- [ ] LangChain & LangGraph `SentinelToolCallbackHandler`.
- [ ] CrewAI action filter middleware.
- [ ] AutoGen tool execution guard.
- [ ] Model Context Protocol (MCP) proxy adapter: enforce Sentinel policies on any MCP server tools.

---

## 🔒 Phase 3: Cryptographic Signatures & Hardware Keys (Q2 2027)
- [ ] Asymmetric Ed25519 digital signatures on decision receipts.
- [ ] Support for hardware security modules (HSM) and KMS key signing.
- [ ] Merkle audit tree verification for high-throughput batching.

---

## 🌐 Phase 4: Enterprise Cluster & Policy Synchronization (Q3 2027)
- [ ] Multi-node distributed policy synchronization via Raft consensus.
- [ ] PostgreSQL / Supabase storage backend for enterprise audit lakes.
- [ ] Role-Based Access Control (RBAC) and OIDC authentication for console.

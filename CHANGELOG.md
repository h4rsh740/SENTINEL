# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-24
### Added
- SENTINEL Core deterministic policy engine with strict default-deny.
- Safe tool adapter (`SafeToolGuard`) guaranteeing non-execution on denied or pending actions.
- Canonical JSON serialization (RFC-8785) with SHA-256 tamper-evident hash chaining.
- Safe SENTINEL Attack Lab with 10 reproducible attack simulation scenarios.
- Typer CLI (`sentinel`) with validation, testing, simulation, explanation, and reporting.
- SQLite audit persistence for decision receipts and human approval workflows.
- BharatCode API integration (`qwen-3.8-27b`) for advisory natural-language policy drafting.
- SENTINEL Web Console (Next.js App Router, TypeScript, Tailwind CSS).

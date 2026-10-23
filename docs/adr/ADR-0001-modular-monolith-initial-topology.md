# ADR-0001 — Modular monolith initial topology

Status: Accepted for Phase 1 implementation.

BinaField starts with one server deployment boundary while preserving the six frozen logical engine ownership boundaries. Database schemas, application modules, events and repository interfaces must retain those boundaries so later service extraction does not change product semantics.

This ADR does not permit cross-module table writes outside the owning module's application interface.

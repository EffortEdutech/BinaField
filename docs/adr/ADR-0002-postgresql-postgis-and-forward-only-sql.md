# ADR-0002 — PostgreSQL/PostGIS and forward-only SQL migrations

Status: Accepted for Phase 1 implementation.

PostgreSQL 16 with PostGIS is the canonical server datastore for the Phase 1 baseline. Migrations are numbered, forward-only and immutable after release. A later correction is a new migration. Breaking changes use expand/contract because offline clients may reconnect after old application versions have been deployed.

# Simulated pilot result

Date: 2026-10-30  
Release under test: `0.8.0-pilot.1`  
Mode: **SIMULATION — no real participant acceptance claimed**

## Purpose

Validate the controlled-pilot mechanics while broader platform development continues. This simulation is not a substitute for real-user pilot acceptance and does not authorize promotion to a broad release.

## Simulated checks

- Organisation context and authorization
- Template creation
- Blueprint version validation and publishing
- Matching deployment creation
- Assignment creation and persistence
- Submission review queue access
- Supervisor decision and persisted outcome

The reproducible runner is:

```powershell
cd apps/admin-web
npm run smoke
```

The last authenticated run passed all six checks. Its records were:

- Template: `8de0e6eb-f764-44c3-9bd5-78d2f4076939`
- Version: `48705464-ebc3-4005-bcd1-c43fa7a01dc8`
- Deployment: `6c53d871-f1d3-46f4-a300-6fd7c259b37a`
- Assignment: `e899c1c7-01d5-4ca8-9cca-f42b632d53fe`

## Decision

**Simulation accepted for development validation.**

Real participant sign-off, Liana's field run, support observation, and broader-release promotion remain deferred until the platform is declared ready for pilot use.

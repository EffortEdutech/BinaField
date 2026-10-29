# Unresolved risks and deferrals

| ID | Risk/deferral | Impact | Mitigation / exit condition | Decision |
|---|---|---|---|---|
| R-01 | Pilot owner names, device assignments, and review window are not yet signed off. | Pilot coordination ambiguity. | Complete `docs/pilot/PILOT-OWNER-SIGNOFF.md`. | Conditional release gate |
| R-02 | Full installed-PWA matrix across Android/iPhone remains deferred. | Compatibility outside tested cell is unknown. | Run the P2-PWA device/browser evidence matrix. | Deferred to Phase 2 |
| R-03 | Dashboard is basic counts/results, not full analytics. | Limited trend/reporting capability. | Implement P2-DASH requirements. | Deferred to Phase 2 |
| R-04 | Export and append-only audit product surfaces are not yet implemented. | Manual evidence review is required. | Implement P2-AUD and P2-EXP. | Deferred to Phase 2 |
| R-05 | Historical malformed assignments require quarantine/correction. | Legacy data cleanup may need supervision. | Preserve originals; issue corrected published-version assignments. | Accepted pilot limitation |
| R-06 | Deployment protection can block automated fetch tooling. | Automated probes may need an authenticated user/session. | Use local smoke runner or authenticated browser. | Accepted operational limitation |

## Release decision

**CONDITIONAL.** Release `0.8.0-pilot.1` is approved only for the documented seeded controlled pilot. It is not a general production release and must not claim the deferred capabilities above.

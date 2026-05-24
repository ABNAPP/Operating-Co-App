# Spec Coverage Tracker

| Spec Area | Status | Notes |
| --- | --- | --- |
| App shell and navigation | Done (Phase 1) | Dashboard, Companies, Workspace, Data Hub, Engine Docs, Settings |
| Dashboard display-only rule | Done (Phase 0/1) | Dashboard implemented as output table with no valuation computation |
| Global vs company engine rule | Done (Phase 0/1) | Documented in architecture and valuation-flow docs |
| Company Workspace structure | Done (Phase 1) | Snapshot, Inputs, Historical, Forecast, Engines, Review/Decision, Notes/Sources placeholders |
| Data Hub structure | Done (Phase 1) | Required shared-data cards included |
| Engine Docs structure | Done (Phase 1) | Required placeholders included |
| Mock company dataset | Done (Phase 1) | Microsoft, Disney, Volvo |
| Environment variable preparation | Done (Phase 0/1) | `.env.example` prepared, no real keys |
| Global valuation calculations | Not Started | Deferred to later phase |
| API integrations (FRED/market/FX/Firebase) | Not Started | Deferred; no live API calls |

## Traceability Rule
Every new implementation phase must update this tracker so each feature maps back to the master specification.

# Operating Co App Architecture (Phase 0)

## Purpose
- Translate the "Operating Co Template — Master Specification v1.4" into a Next.js / React / TypeScript app foundation.
- This phase excludes valuation math, API integrations, Google Sheets logic, and Apps Script.

## Core Product Concept
Input -> Reference Data -> Global Valuation Engine -> Company-specific valuation results -> Outputs/Dashboard.

## Architecture Rules
- Dashboard is display/navigation only. It is **not** a valuation engine.
- Global Valuation Engine is shared TypeScript logic across all companies.
- Company Valuation Engine Results are company-specific outputs generated from one company's inputs.
- No real API calls in Phase 0/1.
- No valuation calculations in Phase 0/1.

## Main Areas
- Dashboard (table view of official/support outputs)
- Companies (card view + create company action)
- Company Workspace (full company analysis shell)
- Data Hub (shared reference data and API status)
- Engine Docs (traceability and build status)
- Settings (environment and configuration scaffolding)

# Finance worker report modules — PR #365 follow-up

Do not include ROI or ROA.

Public-safe endpoints:
- `/api/reports/finance-kpi`
- `/api/reports/revenue-chart`
- `/api/reports/run-rate-2026`

Protected/admin endpoints:
- `/api/reports/daily-revenue`
- `/api/reports/liabilities`
- `/api/reports/ebitda`
- `/api/reports/export.csv`
- `/api/reports/export.pdf`

Dashboard charts:
1. FY2025 baseline vs YTD 2026
2. Daily revenue curve
3. Cumulative YTD revenue
4. Gap to FY2025
5. EBITDA and EBITDA margin
6. Short-term vs long-term liabilities
7. Equity ratio / leverage ratio

Security:
- Public shows aggregate KPI only.
- Admin can show daily rows, CSV/PDF export and source references.
- No mail sending.
- No campaign triggering.
- No production deploy from this patch package.

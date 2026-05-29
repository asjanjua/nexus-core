# Operational KPIs — May 2026
**Workspace:** NexusAI Pilot Client — Digital Banking Division  
**Prepared by:** Chief Operating Officer  
**Classification:** Internal  
**Period:** May 1–31, 2026

---

## Executive Summary

May performance was mixed. Transaction volumes hit a record monthly high of 4.2 million processed payments, but net margin compression continued for the third consecutive month. Two critical blockers remain unresolved: the core banking middleware upgrade (now 6 weeks overdue) and the KYC vendor contract renegotiation stalled at legal review.

---

## 1. Transaction and Volume Metrics

| Metric | April 2026 | May 2026 | Target | Status |
|--------|-----------|---------|--------|--------|
| Total Transactions Processed | 3.8M | 4.2M | 4.0M | ABOVE TARGET |
| Payment Success Rate | 98.1% | 97.6% | 99.0% | BELOW TARGET |
| Average Transaction Value (USD) | $312 | $298 | $320 | BELOW TARGET |
| P2P Transfer Volume | $142M | $158M | $150M | ABOVE TARGET |
| Bill Payment Volume | $88M | $91M | $95M | SLIGHTLY BELOW |
| International Remittance | $34M | $39M | $35M | ABOVE TARGET |

The drop in payment success rate from 98.1% to 97.6% is attributed to a middleware timeout issue introduced in the May 14th patch. Engineering has a fix in staging; expected production release June 3rd.

---

## 2. Customer Metrics

| Metric | April 2026 | May 2026 | MoM Change |
|--------|-----------|---------|-----------|
| Active Monthly Users | 187,400 | 194,200 | +3.6% |
| New Account Openings | 8,200 | 9,100 | +11.0% |
| Account Closure Rate | 1.2% | 1.4% | +0.2pp |
| NPS Score | 54 | 51 | -3 points |
| Average App Sessions/User | 6.2 | 6.5 | +4.8% |
| Support Ticket Volume | 4,100 | 5,300 | +29.3% |

Support ticket volume spike (29.3% MoM increase) is directly linked to the payment success rate issue. 68% of May tickets relate to failed transactions. NPS decline from 54 to 51 is being monitored; if it falls below 50 in June, escalation to the Board is required per governance policy.

---

## 3. Risk and Compliance

### AML/CTF Monitoring
- Suspicious Transaction Reports filed: 14 (April: 11)
- Cases escalated to Financial Intelligence Unit: 2
- False positive rate on AML screening: 23% (target: below 18%) — REQUIRES ATTENTION
- Average case resolution time: 4.2 days (target: 3 days) — OVERDUE

### Regulatory Deadlines
- **CRITICAL:** Central Bank quarterly liquidity report due June 15th. Data extraction from legacy system not yet initiated.
- Open regulatory queries: 3 (2 from Q1, 1 from April inspection)
- Consumer complaints filed with regulator: 2 (both related to failed transactions)

### Fraud
- Fraud attempts detected: 892
- Fraud cases confirmed: 41 (4.6% detection-to-confirmed ratio)
- Total fraud losses (gross): $48,200
- Recovery rate: 71%

---

## 4. Technology and Infrastructure

| System | Uptime (May) | Target | Notes |
|--------|-------------|--------|-------|
| Core Banking System | 99.2% | 99.9% | 2 incidents |
| Payment Gateway | 98.8% | 99.5% | Middleware issue |
| Mobile App | 99.7% | 99.9% | No incidents |
| API Gateway | 99.9% | 99.9% | On target |
| Data Warehouse | 98.1% | 99.5% | Planned maintenance overrun |

**Core Banking Middleware Upgrade:** Originally scheduled April 22nd, now expected June 18th. 6-week delay caused by vendor dependency on third-party certification. Delay exposes the bank to increased operational risk during peak volumes.

---

## 5. Financial Performance (Operational View)

- Operating Cost per Transaction: $0.087 (April: $0.081) — INCREASING (concern)
- Net Interest Margin: 3.1% (April: 3.4%) — DECLINING (3rd consecutive month)
- Fee Revenue (May): $2.1M (April: $2.3M) — 8.7% decline
- Cost-to-Income Ratio: 68% (target: 60%) — ABOVE TARGET

The cost-per-transaction increase is driven by higher support and remediation costs from the payment failure incidents. Without the middleware fix, this metric is unlikely to improve in June.

---

## 6. Open Blockers Requiring Executive Decision

1. **Middleware Upgrade Delay (6 weeks overdue):** Board visibility required. Risk of further delay if vendor fails to deliver by June 18th. Contingency plan (rollback to v2.1) needs formal approval.

2. **KYC Vendor Contract Renegotiation:** Legal review has been in progress for 5 weeks. Current vendor pricing is 34% above market. Savings opportunity of $420,000 annually. Requires COO sign-off to proceed to final negotiation.

3. **AML False Positive Rate:** At 23%, exceeds the regulator's informal guidance of 20%. Technology fix (rule-set recalibration) requires a 2-week blackout window. Recommended window: June 22–July 6 to avoid quarter-end conflicts.

---

## 7. June Priorities

- Resolve payment success rate issue by June 3rd
- Deliver Central Bank liquidity report by June 15th
- Obtain Board approval for middleware contingency plan
- Complete KYC vendor negotiation (target: June 20th)
- Initiate AML recalibration project planning

*Prepared: May 31, 2026 | Next review: June 15, 2026*

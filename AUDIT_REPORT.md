# System Audit Report - NextBotics Fleet Pro

## Date: 2026-03-18

---

## 1. BROKEN ENDPOINTS (Path Mismatches)

| Frontend Expects | Backend Has | Status |
|-----------------|-------------|--------|
| GET /fleet/vehicles/stats/overview | GET /fleet/vehicles/stats | ❌ BROKEN |
| GET /fleet/drivers/stats/overview | GET /fleet/drivers/stats | ❌ BROKEN |
| GET /fleet/alerts/stats/unread-count | GET /fleet/alerts/unread-count | ❌ BROKEN |
| GET /fleet/trips/stats/summary | GET /fleet/trips/stats | ❌ BROKEN |
| GET /fleet/fuel/stats | GET /fleet/fuel/transactions/stats | ❌ BROKEN |
| GET /fleet/analytics/utilization | GET /fleet/analytics/fleet | ❌ BROKEN |
| GET /fleet/analytics/audit-performance | GET /fleet/analytics/audits | ❌ BROKEN |
| GET /fleet/analytics/fuel-consumption | GET /fleet/analytics/fuel | ❌ BROKEN |
| GET /fleet/analytics/personal-performance | GET /fleet/analytics/my-performance | ❌ BROKEN |
| GET /fleet/inventory/stats | GET /fleet/inventory/items/stats | ❌ BROKEN |
| GET /fleet/invoices/stats | GET /fleet/invoices/stats (same) | ✅ OK |
| GET /fleet/audits/stats/summary | GET /fleet/audits/stats/summary | ✅ OK |

## 2. RESPONSE STRUCTURE MISMATCHES

| Endpoint | Frontend Expects | Backend Returns |
|----------|-----------------|-----------------|
| GET /fleet/vehicles | `{ vehicles: [], total: number }` | `{ items: [], total, page, perPage }` |
| GET /fleet/drivers | `{ drivers: [], total: number }` | `{ items: [], total, page, perPage }` |
| GET /fleet/alerts | `{ alerts: [], total: number }` | `{ items: [], total, unreadCount }` |
| GET /fleet/trips | `{ trips: [], total: number }` | `{ items: [], total, pagination }` |
| GET /fleet/requisitions | `{ requisitions: [], total: number }` | Need to verify |
| GET /fleet/inventory/items | `{ items: [], total: number }` | `{ items: [], pagination }` |
| GET /fleet/invoices | `{ invoices: [], total: number }` | `{ items: [], pagination }` |

## 3. MISSING BACKEND CONNECTIONS

| Feature | Status | Note |
|---------|--------|------|
| Dashboard Analytics | ❌ Partial | Backend returns different structure than frontend expects |
| Fuel Stats endpoint | ❌ Missing | Frontend expects `/fuel/stats` but only `/fuel/transactions/stats` exists |
| Vehicle Stats | ❌ Path mismatch | Frontend expects overview endpoint |
| Driver Stats | ❌ Path mismatch | Frontend expects overview endpoint |

## 4. UI ELEMENTS NOT CONNECTED TO REAL DATA

| Component | Issue |
|-----------|-------|
| FleetDashboard.tsx | Uses analytics response structure that doesn't match backend |
| TVDisplay.tsx | Calls API endpoints with mismatched paths |
| VehiclesPage.tsx | Expects `data.vehicles` but backend returns `data.items` |
| DriversPage.tsx | Expects `data.drivers` but backend returns `data.items` |

## 5. FIX PLAN

1. **Fix backend route paths** to match frontend expectations
2. **Add missing endpoints** where frontend expects them
3. **Update response structures** to match frontend expectations
4. **Fix frontend components** that have wrong data access patterns

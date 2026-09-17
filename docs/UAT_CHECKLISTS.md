# MediFlow LIS — User Acceptance Testing (UAT) Checklists

Comprehensive verification checklists for enterprise validation across all 10 system roles prior to production commissioning.

---

## 1. Super Admin (System Operator)
- [ ] Authenticate with Master credentials (`admin@medilabs.com`).
- [ ] Verify multi-tenant isolation: Super Admin can list all 19+ registered laboratories without cross-tenant pollution.
- [ ] Create and provision a new Laboratory with Initial Lab Admin credentials.
- [ ] Toggle Laboratory status between `active` and `suspended`, verifying login lockout when suspended.
- [ ] Upgrade/Downgrade subscription plans and verify automatic quota adjustments.
- [ ] Trigger manual system-wide database backup and verify snapshot integrity.
- [ ] Broadcast system-wide administrative notification to all active tenant users.
- [ ] Evaluate real-time system health telemetry on `/system-health` and `/api/health`.

---

## 2. Lab Admin (Tenant Director)
- [ ] Authenticate with Lab Admin credentials (`labadmin@apexlabs.com`).
- [ ] Verify Dashboard KPIs: Active patients, daily order count, pending verifications, monthly revenue.
- [ ] Manage branch collection centers: Create, configure, and assign staff to branches.
- [ ] Manage User Roster: Create Pathologists, Technicians, Receptionists, and Accountants.
- [ ] Configure Report Template: Customize header text, NABL accreditation logos, and footer disclaimers.
- [ ] Configure Gateway Settings: Test SMS (Msg91) and WhatsApp Cloud API credentials.
- [ ] Review Audit Logs: Ensure all administrative changes create immutable audit records.
- [ ] Execute Data Migration Wizard: Import legacy patient records via CSV without errors.

---

## 3. Branch Admin / Manager
- [ ] View branch-specific patient registrations and work queues.
- [ ] Override base test pricing with branch-specific fee schedules.
- [ ] Reconcile daily phlebotomist cash drawer and submit end-of-day closing ledger.
- [ ] Dispatch and receive inter-branch inventory stock transfers.

---

## 4. Receptionist (Accession & Booking)
- [ ] Register new patient with auto-generated immutable Patient ID (`PID-2026-XXXXXX`).
- [ ] Search patient by 10-digit mobile number, verifying duplicate warnings.
- [ ] Book test orders with multiple tests and health packages.
- [ ] Enforce discount authorization limits (Max 10% for Receptionist).
- [ ] Generate order invoice with partial or full payment collection.
- [ ] Print barcode label for specimen tubes (`SMP-2026-XXXXXX`).

---

## 5. Lab Technician (Phlebotomy & Specimen Processing)
- [ ] Collect blood specimen, scan barcode, and transition status to `collected`.
- [ ] Reject compromised specimen with standardized clinical rejection reason (e.g. Hemolysis).
- [ ] Open Technician Result Grid for accessioned specimen.
- [ ] Input numeric/text observation values with real-time biological normal range indicators.
- [ ] Verify automatic panic/critical alert detection when biological values exceed panic thresholds.
- [ ] Save draft results and submit for Pathologist verification.
- [ ] Verify Result Locking: Technicians cannot modify results once verified by a Pathologist.

---

## 6. Consultant Pathologist (Clinical Review & Sign-Off)
- [ ] Open Verification Desk work queue filtered by department.
- [ ] Inspect patient historical delta-check variations vs. baseline.
- [ ] Verify clinical calculation formulas (e.g. Friedewald LDL: `chol - hdl - (trig / 5)`).
- [ ] Perform clinical verification and attach digital signature.
- [ ] Approve report and trigger cryptographic QR verification token generation.
- [ ] Release report for patient and referring doctor delivery.
- [ ] Amend released report with mandatory clinical justification, incrementing version to `v2.0`.

---

## 7. Billing & Accounts User
- [ ] View accounts receivable aging report (0-30, 31-60, 61-90, 90+ days).
- [ ] Record payment receipts across UPI, Cards, Net Banking, and Cash modes.
- [ ] Process authorized billing refunds and verify invoice balance adjustment.
- [ ] Record laboratory operational expenses (reagent purchase, maintenance, utility fees).
- [ ] Generate General Ledger trial balance and monthly GST tax statement.

---

## 8. Inventory & Reagent Manager
- [ ] Catalog new inventory items with SKU, storage temperature, and minimum reorder level.
- [ ] Receive stock batches with lot numbers and expiration dates.
- [ ] Record stock consumption with automatic current stock deduction.
- [ ] Monitor automated alerts for low stock and expiring reagent batches.

---

## 9. Referring Doctor (Doctor Portal)
- [ ] Log in via dedicated Doctor Portal (`/doctor/login`).
- [ ] View list of referred patients and current test order statuses.
- [ ] Inspect critical/panic value alerts feed with highlighted abnormal flags.
- [ ] View and download finalized diagnostic PDF reports.

---

## 10. Patient (Patient Portal & Public Verification)
- [ ] Log in via Patient Portal using Mobile/Patient ID and OTP/Password (`/patient/login`).
- [ ] View personal health dashboard with historical reports archive.
- [ ] View longitudinal trend chart for key blood parameters (e.g. Hemoglobin, Platelets).
- [ ] Download official A4 PDF diagnostic report.
- [ ] Scan report QR code on mobile device and verify authentic certificate on public verification portal (`/verify/:token`).

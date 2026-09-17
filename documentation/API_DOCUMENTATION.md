# MediFlow LIS — Phase 2 API Documentation

Comprehensive reference documentation for the MediFlow Blood Diagnostic Laboratory Information System API.

## Base Configuration

- **Base URL**: `http://localhost:5000/api`
- **Default Content-Type**: `application/json`
- **Authentication**: Bearer Token in `Authorization` header (`Authorization: Bearer <JWT_TOKEN>`)
- **Tenant Simulation (Super Admin Only)**: `x-lab-id: <LAB_ID>`

---

## 1. Authentication & Security Endpoints

### 1.1 User Login
Authenticates staff, validates laboratory status, checks lockout thresholds, and issues a JWT token.

- **Method**: `POST`
- **Path**: `/auth/login`
- **Authentication**: None
- **Brute Force Protection**: 5 consecutive failed attempts lock the account for 15 minutes (`HTTP 429`).
- **Request Body**:
  ```json
  {
    "email": "admin@medilabs.com",
    "password": "admin123"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-superadmin",
      "email": "admin@medilabs.com",
      "name": "Super Administrator",
      "role_code": "super_admin",
      "role_name": "Super Administrator",
      "lab_id": null,
      "branch_id": null,
      "lab_name": null,
      "branch_name": null,
      "permissions": ["view_dashboard", "manage_laboratories", "manage_subscriptions", "..."],
      "authorized_branches": []
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Email and password are required.
  - `401 Unauthorized`: Invalid email or password.
  - `403 Forbidden`: Account is suspended or laboratory facility is deactivated.
  - `429 Too Many Requests`: Account temporarily locked due to repeated failed attempts.

---

### 1.2 Get Current Profile
Fetches currently authenticated user context, role, active permissions, and authorized branches.

- **Method**: `GET`
- **Path**: `/auth/me`
- **Authentication**: Bearer Token required
- **Success Response (`200 OK`)**: Returns user object with permissions array and assigned branch list.

---

### 1.3 User Logout
Terminates user session and records an audit log entry.

- **Method**: `POST`
- **Path**: `/auth/logout`
- **Authentication**: Bearer Token required
- **Success Response (`200 OK`)**:
  ```json
  { "message": "Logged out successfully" }
  ```

---

### 1.4 Change Password
Allows an authenticated user to update their account password.

- **Method**: `POST`
- **Path**: `/auth/change-password`
- **Authentication**: Bearer Token required
- **Request Body**:
  ```json
  {
    "currentPassword": "admin123",
    "newPassword": "MyNewSecurePassword999!"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  { "message": "Password changed successfully" }
  ```

---

### 1.5 Forgot Password
Generates a secure password reset token with 1-hour expiration.

- **Method**: `POST`
- **Path**: `/auth/forgot-password`
- **Authentication**: None
- **Request Body**:
  ```json
  { "email": "labadmin@apexlabs.com" }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "If an active account exists with that email, a password reset token has been issued.",
    "resetToken": "9fd16930d52b637c76..."
  }
  ```

---

### 1.6 Reset Password
Validates the reset token and assigns the new account password.

- **Method**: `POST`
- **Path**: `/auth/reset-password`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "token": "9fd16930d52b637c76...",
    "newPassword": "NewAdminPassword123!"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  { "message": "Password has been reset successfully. You can now login with your new password." }
  ```

---

## 2. Laboratory Management (Super Admin)

### 2.1 List All Laboratories
Retrieves a paginated and filterable catalog of all onboarded laboratories.

- **Method**: `GET`
- **Path**: `/laboratories`
- **Authentication**: Super Admin only (`requireRole('super_admin')`)
- **Query Parameters**:
  - `search` *(optional)*: Search term matching name, code, city, or email.
  - `status` *(optional)*: Filter by `active`, `suspended`, `deactivated`, or `all`.
  - `plan_id` *(optional)*: Filter by subscription plan ID.
- **Success Response (`200 OK`)**: Array of laboratory records including plan names, branch counts, user counts, and patient metrics.

---

### 2.2 Get Laboratory Details
Fetches full laboratory profile, authorized branches, staff roster, subscription history, and revenue statistics.

- **Method**: `GET`
- **Path**: `/laboratories/:id`
- **Authentication**: Super Admin or assigned Lab Admin (`lab_id == :id`)
- **Success Response (`200 OK`)**:
  ```json
  {
    "lab": {
      "id": "lab-apex",
      "name": "Apex Diagnostics & Reference Laboratory",
      "code": "APEX-LAB",
      "owner_name": "Dr. Robert Vance",
      "status": "active",
      "subscription_plan_id": "plan-enterprise",
      "plan_name": "Enterprise Diagnostic Network"
    },
    "branches": [...],
    "staff": [...],
    "subscription_history": [...],
    "stats": {
      "total_patients": 3,
      "total_orders": 3,
      "total_revenue": 14500
    }
  }
  ```

---

### 2.3 Provision New Laboratory + Initial Admin
Atomic onboarding workflow: registers facility profile, provisions default central hub branch, creates initial subscription record, and sets up initial Lab Admin account.

- **Method**: `POST`
- **Path**: `/laboratories`
- **Authentication**: Super Admin only
- **Request Body**:
  ```json
  {
    "name": "Metro Pathology Services",
    "code": "METRO-LAB",
    "owner_name": "Dr. Rahul Sharma",
    "email": "contact@metropathology.com",
    "phone": "+91 98765 43210",
    "address": "Level 3, Medical Arts Tower",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "subscription_plan_id": "plan-pro",
    "create_admin": true,
    "admin_name": "Dr. Rahul Sharma",
    "admin_email": "admin@metropathology.com",
    "admin_password": "admin123"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "message": "Laboratory and initial administrative profile created successfully",
    "id": "lab-12de5712",
    "admin_id": "user-8c43ef10"
  }
  ```

---

### 2.4 Update Laboratory Status
Toggles operational status between `active`, `suspended`, and `deactivated`. When suspended, tenant users are barred from logging in.

- **Method**: `PATCH`
- **Path**: `/laboratories/:id/status`
- **Authentication**: Super Admin only
- **Request Body**:
  ```json
  { "status": "suspended" }
  ```
- **Success Response (`200 OK`)**:
  ```json
  { "message": "Laboratory status updated to suspended" }
  ```

---

### 2.5 Soft-Delete Laboratory
Marks laboratory as deleted (`deleted_at IS NOT NULL`) and revokes user access without destroying historical medical audit trails.

- **Method**: `DELETE`
- **Path**: `/laboratories/:id`
- **Authentication**: Super Admin only
- **Success Response (`200 OK`)**:
  ```json
  { "message": "Laboratory deactivated and archived successfully" }
  ```

---

## 3. Subscription & Licensing Endpoints

### 3.1 List Subscription Plans
Returns catalog of available subscription tiers (`Trial`, `Starter`, `Professional`, `Enterprise`).

- **Method**: `GET`
- **Path**: `/subscriptions/plans`
- **Authentication**: Authenticated users
- **Success Response (`200 OK`)**: Array of plan objects with pricing, feature flags, max branch limits, and duration days.

---

### 3.2 List Enrolled Facility Subscriptions
Returns all facilities with calculated subscription state (`active`, `trial`, `expiring_soon`, `expired`) and remaining days.

- **Method**: `GET`
- **Path**: `/subscriptions/laboratories`
- **Authentication**: Super Admin only
- **Success Response (`200 OK`)**: Array of enrolled laboratories with calculated license expiration metrics.

---

### 3.3 Assign Subscription Plan
Assigns or upgrades a laboratory's subscription tier.

- **Method**: `POST`
- **Path**: `/subscriptions/assign`
- **Authentication**: Super Admin only
- **Request Body**:
  ```json
  {
    "lab_id": "lab-apex",
    "plan_id": "plan-enterprise",
    "billing_cycle": "yearly",
    "price_paid": 18000,
    "notes": "Enterprise expansion license"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  { "message": "Subscription assigned successfully" }
  ```

---

### 3.4 Extend Subscription
Adds bonus or promotional days to an existing facility license.

- **Method**: `POST`
- **Path**: `/subscriptions/extend`
- **Authentication**: Super Admin only
- **Request Body**:
  ```json
  {
    "lab_id": "lab-apex",
    "extension_days": 60,
    "reason": "Promotional bonus"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Subscription extended by 60 days",
    "new_expiry": "2027-11-09T18:19:42.721Z",
    "new_end_date": "2027-11-09T18:19:42.721Z"
  }
  ```

---

## 4. Notifications & System Announcements

### 4.1 Get User Notifications
Fetches notifications scoped to the current user and their laboratory.

- **Method**: `GET`
- **Path**: `/notifications`
- **Authentication**: Bearer Token required
- **Query Parameters**: `unread=true` (optional)
- **Success Response (`200 OK`)**: Array of notifications sorted by creation date.

---

### 4.2 Get Unread Notifications Count
Quick counter for top navigation bell badge.

- **Method**: `GET`
- **Path**: `/notifications/unread-count`
- **Authentication**: Bearer Token required
- **Success Response (`200 OK`)**:
  ```json
  { "unread_count": 4 }
  ```

---

### 4.3 Mark Notification as Read
Marks a single notification as read.

- **Method**: `PUT`
- **Path**: `/notifications/:id/read`
- **Authentication**: Bearer Token required
- **Success Response (`200 OK`)**:
  ```json
  { "message": "Notification marked as read" }
  ```

---

### 4.4 Mark All Notifications as Read
Batch marks all notifications for the user as read.

- **Method**: `PUT`
- **Path**: `/notifications/mark-all-read`
- **Authentication**: Bearer Token required
- **Success Response (`200 OK`)**:
  ```json
  { "message": "All notifications marked as read" }
  ```

---

### 4.5 Broadcast System Announcement
Publishes a global announcement to all active laboratories and staff users.

- **Method**: `POST`
- **Path**: `/notifications/broadcast`
- **Authentication**: Super Admin only
- **Request Body**:
  ```json
  {
    "title": "Scheduled Maintenance",
    "message": "System updates will be applied at 02:00 AM UTC.",
    "type": "warning"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  { "message": "System announcement broadcasted successfully" }
  ```

---

## 5. System Analytics & Governance (Super Admin)

### 5.1 Super Admin Global Analytics
Returns multi-tenant KPIs, financial metrics, subscription distributions, and real-time audit feed.

- **Method**: `GET`
- **Path**: `/analytics/superadmin` (or `/analytics/super-admin`)
- **Authentication**: Super Admin only
- **Success Response (`200 OK`)**:
  ```json
  {
    "metrics": {
      "total_laboratories": 3,
      "active_laboratories": 3,
      "suspended_laboratories": 0,
      "total_branches": 4,
      "total_users": 8,
      "total_patients": 5,
      "total_orders": 5,
      "total_reports": 2,
      "active_subscriptions": 3,
      "expiring_subscriptions": 0,
      "expired_subscriptions": 0,
      "total_revenue": 36000
    },
    "charts": {
      "monthly_laboratories": [...],
      "plan_distribution": [...],
      "patient_growth": [...]
    },
    "recent_activity": [
      {
        "id": "aud-269c9603",
        "action": "LOGIN",
        "user_email": "admin@medilabs.com",
        "user_role": "super_admin",
        "ip_address": "::1",
        "created_at": "2026-09-10 18:14:29"
      }
    ],
    "recent_laboratories": [...]
  }
  ```

---

## 6. Multi-Tenant Security Verification Summary

| Protection Layer | Rule Enforced | HTTP Response |
| :--- | :--- | :---: |
| **Cross-Tenant Branch Query** | Requesting `?lab_id=different-tenant` as Lab Admin | `403 Forbidden` |
| **Cross-Tenant Branch Creation** | Specifying another facility's `lab_id` in request body | `403 Forbidden` |
| **Super Admin Route Protection** | Lab Admin accessing `/api/laboratories` or `/api/subscriptions/assign` | `403 Forbidden` |
| **Unauthenticated Request** | Calling protected endpoints without valid Bearer token | `401 Unauthorized` |
| **Brute Force Lockout** | 5 consecutive bad password attempts on an account | `429 Too Many Requests` |
| **Suspended Facility Isolation** | Logging into account belonging to suspended laboratory | `403 Forbidden` |

---

## 7. Complete Accounting & Financial Ledger Module

### 7.1 Financial Overview Dashboard
Calculates gross billing, collections, disbursements, net margin, and outstanding balances.
- **Method**: `GET`
- **Path**: `/accounting/dashboard`
- **Authentication**: `manage_billing` permission
- **Query Parameters**: `branch_id` (optional)

### 7.2 Operating Expenses
- **Method**: `GET` / `POST` / `DELETE`
- **Path**: `/accounting/expenses` (`/:id` for deletion)
- **POST Body**: `{ branch_id, category_id, title, amount, payment_method, payee, invoice_reference, notes }`
- Automatically posts debit entry to `ledgers` table.

### 7.3 General Ledger Double-Entry Audit Trail
- **Method**: `GET`
- **Path**: `/accounting/ledger`
- **Query Parameters**: `branch_id, account_type, start_date, end_date`

### 7.4 Accounts Receivable Aging Analysis
Categorizes unpaid balances into aging buckets: 0-30 days, 31-60 days, 61-90 days, 90+ days.
- **Method**: `GET`
- **Path**: `/accounting/receivables`
- **Query Parameters**: `branch_id` (optional)

### 7.5 End-of-Shift Cash Closing Desk
Reconciles physical counted cash in the drawer against system collections.
- **Method**: `GET` / `POST`
- **Path**: `/accounting/cash-closing`
- **POST Body**: `{ branch_id, opening_cash, actual_cash, remarks }`
- **Response**: `{ id, opening_cash, system_cash_collected, expected_cash, actual_cash, variance, status }`

---

## 8. Laboratory Inventory & Consumable Management

### 8.1 Inventory Dashboard & Reorder Alerts
- **Method**: `GET`
- **Path**: `/inventory/dashboard`
- **Alert Endpoints**: `/inventory/alerts/low-stock`, `/inventory/alerts/expiry`

### 8.2 Item Master Catalog
- **Method**: `GET` / `POST` / `PUT`
- **Path**: `/inventory/items` (`/:id`)
- **POST Body**: `{ code, name, category_id, unit, min_stock, max_stock, purchase_price, storage_condition, supplier_id }`

### 8.3 Stock In / Purchase Receipt with Lot Tracking
- **Method**: `POST`
- **Path**: `/inventory/stock-in`
- **Body**: `{ item_id, batch_number, expiry_date, quantity, unit_cost, supplier_id, invoice_number, branch_id, notes }`

### 8.4 Clinical Stock Consumption & Waste Adjustments
- **Method**: `POST`
- **Path**: `/inventory/adjustment`
- **Body**: `{ item_id, batch_id, adjustment_type, quantity, reason, branch_id }`

### 8.5 Inter-Branch Stock Transfers
- **Method**: `GET` / `POST` / `PUT`
- **Path**: `/inventory/transfers` (`/:id/status`)
- **POST Body**: `{ from_branch_id, to_branch_id, item_id, batch_id, quantity, notes }`

---

## 9. Secure Doctor & Clinician Portal

- **Login**: `POST /doctor-portal/login` (Body: `{ username, password }`)
- **Profile**: `GET /doctor-portal/me`
- **Dashboard KPIs**: `GET /doctor-portal/dashboard`
- **Referred Patients**: `GET /doctor-portal/patients` (Strict isolation: only patients referred by doctor)
- **Diagnostic Reports**: `GET /doctor-portal/reports`
- **Certified PDF Download**: `GET /doctor-portal/reports/:id/pdf`
- **Panic Alerts**: `GET /doctor-portal/critical-alerts` (Real-time stream of panic values)

---

## 10. Secure Patient Health Portal

- **Login**: `POST /patient-portal/login` (Body: `{ username: '<mobile or PID>', password }`)
- **Profile**: `GET /patient-portal/me`
- **Dashboard**: `GET /patient-portal/dashboard`
- **My Reports**: `GET /patient-portal/reports`
- **Certified PDF Download**: `GET /patient-portal/reports/:id/pdf`
- **Order History**: `GET /patient-portal/orders`
- **Invoices & Receipts**: `GET /patient-portal/invoices`
- **Biomarker History Trends**: `GET /patient-portal/trends` (Historical numeric parameter progression)

---

## 11. Public Cryptographic QR Verification

- **Token Generation**: `POST /verify/generate-token/:report_id` (Generates tamper-proof verification token)
- **Public Verification**: `GET /verify/:token` (No authentication required; returns privacy-preserving patient identifier, issuing lab, accredited approver, report date, and authenticity status without leaking clinical data)

---

## 12. Provider-Independent Communication & Notification Gateway

- **List Providers**: `GET /communication/providers`
- **Save Provider**: `POST /communication/providers`
- **Connection Handshake Test**: `POST /communication/providers/:id/test` (Tests SMTP, SMS, WhatsApp connectivity and measures latency in ms)
- **Clinical Templates**: `GET /communication/templates` (16 clinical triggers)
- **Outgoing Audit Logs**: `GET /communication/logs`
- **Live Dispatch**: `POST /communication/send` (Body: `{ channel, recipient, subject, message }`)

---

## 13. Report Designer & Versioned Templates

- **List Templates**: `GET /report-templates`
- **Create / Edit Template**: `POST /report-templates` / `PUT /report-templates/:id`
- **Clone Template**: `POST /report-templates/:id/clone`
- **Version History**: `GET /report-templates/:id/versions`

---

## 14. Centralized Standardized Reports Catalog (24 Reports)

- **Catalog Metadata**: `GET /analytics/reports/catalog` (Returns definitions of all 24 standardized reports)
- **Dynamic Generator**: `POST /analytics/reports/generate` (Body: `{ report_code, branch_id, start_date, end_date }`)
- **CSV Stream Export**: `GET /analytics/reports/export?report_code=<code...>`

---

## 15. Multi-Tier Settings & Configuration Hub

- **Laboratory Operational Rules**: `GET` / `POST` `/settings/laboratory`
- **Branch Facility Settings**: `GET` / `POST` `/settings/branch/:id`
- **System Governance**: `GET` / `POST` `/settings/system` (Super Admin only, 403 Forbidden for others)


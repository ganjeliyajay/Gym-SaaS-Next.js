# Gym SaaS — Complete Project Documentation

##  Project Information

| 📋 Details             | 🔎 Information                   |
| ---------------------- | -------------------------------- |
| **Project Name**       | Gym SaaS  |
| **Developer**          | Ganjeliya Jay                    |
| **Project Type**       | Multi-Tenant Gym Management SaaS |
| **Frontend**           | Next.js, React, TypeScript       |
| **Styling**            | Tailwind CSS                     |
| **Backend / Database** | Supabase / PostgreSQL            |
| **Authentication**     | Supabase Auth                    |
| **Deployment**         | Vercel                           |

---

## 1. Project Overview

Gym SaaS is a modern web-based gym management platform designed to centralize the daily operations of gyms and fitness businesses.

The platform brings together:

- Gym/business management
- Member management
- Membership plans
- Attendance and check-ins
- Classes and scheduling
- Payments and billing
- Products
- Team/trainer management
- Role-based access control
- Signup forms
- Public member registration
- Waivers
- QR-code workflows
- Dashboard analytics
- Notifications
- Subscription and recurring-payment workflows
- Business reporting

The main objective is to replace scattered spreadsheets, manual records and disconnected tools with a single centralized platform.

The public landing page describes the product around three core ideas:

> **Manage. Grow. Repeat.**

The live landing page currently presents Gym SaaS as a platform for managing members, trainers, payments and daily gym operations, with features including member management, attendance, payments, classes, team/role management and analytics.

---

## 2. Product Vision

### Problem

Many gyms manage important operational information through a combination of:

- Spreadsheets
- Paper forms
- Manual attendance registers
- Separate payment records
- WhatsApp communication
- Different tools for trainers and staff
- Manual membership renewal tracking
- Manually generated reports

This creates operational problems such as:

- Duplicate data
- Lost information
- Slow member lookup
- Incorrect attendance records
- Payment tracking difficulties
- Poor visibility into business performance
- No centralized team permissions
- Difficult membership renewal management

### Solution

Gym SaaS provides one connected system where a gym can manage its operational workflow from a central dashboard.

The intended workflow is:

```text
Gym Setup
   ↓
Team Configuration
   ↓
Membership / Product Setup
   ↓
Member Registration
   ↓
Membership Assignment
   ↓
Attendance / Check-in
   ↓
Payments & Billing
   ↓
Classes & Operations
   ↓
Analytics & Reports
   ↓
Renewal / Retention
```

---

# 3. Target Users

Gym SaaS is designed for multiple types of users.

## 3.1 Gym Owner

The owner needs visibility into:

- Total members
- Active memberships
- Revenue
- Attendance
- Team
- Classes
- Products
- Payments
- Business analytics

The owner is also responsible for major administrative configuration.

## 3.2 Administrator

Administrators manage day-to-day gym operations.

Typical responsibilities include:

- Member management
- Payments
- Memberships
- Products
- Team management
- Classes
- Attendance
- Operational settings

## 3.3 Manager

Managers can perform operational tasks according to their assigned permissions.

Access is intentionally narrower than a full administrator.

## 3.4 Trainer

Trainers primarily work with member activity, classes and training-related workflows.

## 3.5 Member

Members are the customers of the gym.

The broader product design includes member-facing capabilities such as:

- Member profile
- Membership information
- Billing information
- Check-in
- QR workflows
- Public signup / registration

---

# 4. Core Product Modules

## 4.1 Dashboard

The dashboard acts as the operational command center.

Typical dashboard areas include:

- KPI statistics
- Revenue overview
- Today's activity
- Upcoming classes
- Recent members
- Quick actions
- Business insights

The dashboard is intended to answer questions such as:

- How many members are active?
- What happened today?
- What revenue has been generated?
- Which classes are upcoming?
- Which members joined recently?
- What operational activity needs attention?

### Dashboard component structure

Known dashboard components include:

```text
Dashboard
├── DashboardStats
├── RevenueOverview
├── TodayActivity
├── UpcomingClasses
├── RecentMembers
└── QuickActions
```

---

# 5. Member Management

Member management is one of the central modules.

The member system is intended to maintain:

- First name
- Last name
- Email
- Phone
- Gym association
- Membership information
- Status
- Profile information
- Payment/customer information
- Attendance activity

The member management workflow is:

```text
Create Member
     ↓
Store Member
     ↓
Assign Membership
     ↓
Track Attendance
     ↓
Track Payments
     ↓
Monitor Membership
     ↓
Renew / Update
```

The application includes member listing and member-detail workflows.

---

# 6. Membership Management

Memberships are separated conceptually from the member record.

A member can have membership information containing fields such as:

- Gym ID
- Member ID
- Product ID
- Status
- Price paid
- Discount
- Start date
- End date
- Remaining visits
- Membership metadata

This allows the system to distinguish:

```text
Member
   ↓
Membership
   ↓
Product / Plan
```

rather than storing all membership state directly inside the member profile.

---

# 7. Products and Plans

Products represent gym offerings that can be purchased or assigned to members.

Examples can include:

- Monthly memberships
- Quarterly memberships
- Yearly memberships
- Visit-based plans
- Other gym services

Product-related workflows are connected to:

- Memberships
- Payments
- Signup forms
- Checkout
- Renewal logic

A major business rule is that a product selected through a signup flow should belong to the same gym/signup configuration rather than being arbitrarily accepted from client input.

---

# 8. Attendance Management

Attendance is designed around daily member activity.

The broader project logic includes attendance concepts such as:

```text
employeeId / member identity
date
checkIn
checkOut
workingHours
status
```

Attendance status values used in the project logic include:

- `present`
- `absent`
- `late`
- `half_day`

For employee/HR-style attendance workflows, the documented business rules include:

| Check-in time | Status |
|---|---|
| Before 10:00 AM | Present |
| 10:00–11:00 AM | Present |
| 11:00 AM–12:00 PM | Late |
| After 1:00 PM | Half Day |
| No check-in | Absent |

The exact rule set should be treated as application/business logic rather than a universal gym-industry rule.

### Attendance metrics

The project has included logic for:

- Present count
- Late count
- Half-day count
- Absent count
- Attendance rate
- Weekly attendance trend

### Future attendance direction

The planned system direction includes moving away from repeated client/server polling toward real-time updates using:

- WebSockets
- Socket.IO
- Supabase Realtime

The preferred architecture should avoid unnecessary polling where event-driven updates are sufficient.

---

# 9. Member Check-in and QR Code

QR functionality is part of the broader product architecture.

The project includes QR-related dependencies and workflows for:

- QR generation
- QR scanning
- Member check-in
- Secure member QR tokens

The environment template includes:

```env
QR_SIGNING_SECRET=
```

This indicates that member QR tokens are intended to be signed server-side rather than treated as trusted raw client data.

A secure QR workflow should be:

```text
Member
  ↓
Signed QR Token
  ↓
Scanner
  ↓
Server Verification
  ↓
Member Lookup
  ↓
Membership Validation
  ↓
Visit / Attendance Update
  ↓
Success Response
```

Important rule:

> A QR token must not be treated as proof of authorization by itself. The server should validate the token, gym ownership, member status and relevant membership conditions.

---

# 10. Classes and Scheduling

The product includes a class and scheduling module.

The public product description identifies:

- Classes
- Scheduling
- Team/trainer management
- Upcoming classes

The intended workflow is:

```text
Create Class
    ↓
Assign Trainer
    ↓
Set Schedule
    ↓
Manage Capacity / Members
    ↓
Display Upcoming Classes
```

The project roadmap also includes true recurring class generation.

A production implementation should distinguish:

- Class template
- Recurrence rule
- Generated class instance
- Trainer assignment
- Attendance/booking state

This prevents recurring schedules from becoming a collection of manually duplicated records.

---

# 11. Team Management

Team management supports gym staff and trainers.

The known role model includes:

```text
super_admin
admin
manager
trainer
member
```

The team UI has included components such as:

```text
TeamHeader
TeamStats
TeamRoleOverview
TeamToolbar
TeamTable
TeamMobileList
TeamEmptyState
```

The TeamTable workflow is designed to support actions such as:

- View details
- Edit
- Role/status filtering
- Team management

---

# 12. Role-Based Access Control (RBAC)

RBAC is an important security layer.

The application uses role-based permissions rather than assuming that every authenticated user can perform every action.

Conceptually:

```text
User
 ↓
Profile
 ↓
Role
 ↓
Permissions
 ↓
Allowed Operations
```

Example role hierarchy:

### Super Admin

Highest administrative scope.

Potential capabilities:

- Manage gyms
- Manage administrators
- Manage system-level settings
- Access broader platform controls

### Admin

Gym-level administrator.

Capabilities include operational management such as:

- Members
- Payments
- Products
- Team
- Settings
- Invitations

### Manager

Operational management with restricted administrative privileges.

### Trainer

Trainer-oriented access.

### Member

Member-facing access only.

---

# 13. Permission Model

The project includes a permission map concept similar to:

```ts
ROLE_PERMISSIONS
```

Permissions include operations such as:

- Invite team member
- Remove team member
- Manage members
- Manage payments
- Manage products
- Manage settings

One explicitly defined business requirement is:

> Only authorized administrative roles should be able to invite team members.

Therefore, the UI restriction alone is not sufficient.

The authorization must also be enforced server-side.

---

# 14. Authentication

Authentication is built around Supabase Auth.

The application uses:

- `@supabase/ssr`
- `@supabase/supabase-js`

The general authentication architecture is:

```text
Browser
  ↓
Supabase Auth
  ↓
Authenticated User
  ↓
Profile
  ↓
Gym Association
  ↓
Role
  ↓
Application Access
```

The application should never assume that authentication alone grants access to a gym's data.

Authentication answers:

> Who is this user?

Authorization answers:

> What can this user access?

---

# 15. Multi-Tenant Architecture

Gym SaaS is designed as a multi-tenant application.

The primary tenant boundary is the gym.

Conceptually:

```text
Platform
├── Gym A
│   ├── Users
│   ├── Members
│   ├── Products
│   ├── Payments
│   ├── Classes
│   └── Attendance
│
├── Gym B
│   ├── Users
│   ├── Members
│   ├── Products
│   ├── Payments
│   ├── Classes
│   └── Attendance
│
└── Gym C
    └── ...
```

Most business records therefore contain a `gym_id`.

This is essential because the same database serves multiple gyms.

---

# 16. Database Architecture

The project uses Supabase/PostgreSQL.

Important entities in the project include:

```text
gyms
profiles
members
member_memberships
products
payments
classes
attendance
signup forms
notifications
team/user relationships
```

The exact schema should always be considered versioned through the SQL migrations in:

```text
supabase/migrations/
```

---

# 17. Profiles

The known profile structure includes fields such as:

```text
id
gym_id
full_name
email
phone
avatar_url
role
status
```

Typical defaults include:

```text
role   → owner
status → active
```

The profile is the application-level identity that connects the authenticated Supabase user to a gym and role.

---

# 18. Members Table

The member record is associated with a gym.

Conceptually:

```text
members
├── id
├── gym_id
├── first_name
├── last_name
├── email
├── phone
├── ...
└── membership/customer metadata
```

A major design principle is tenant isolation through `gym_id`.

---

# 19. Member Memberships

Membership data is modeled separately.

Conceptual structure:

```text
member_memberships
├── id
├── gym_id
├── member_id
├── product_id
├── status
├── price_paid
├── discount_applied
├── start_date
├── end_date
├── remaining_visits
└── ...
```

This supports:

- Membership history
- Multiple memberships
- Visit-based memberships
- Membership expiration
- Renewal
- Discount tracking
- Product relationships

---

# 20. Payments

Payments are connected to gym operations and membership workflows.

Payment-related information can include:

- Amount
- Member
- Membership
- Payment status
- Transaction information
- Gateway customer identifiers
- Gateway transaction identifiers
- Payment dates

Authorize.Net integration is part of the broader architecture.

The environment template contains:

```env
AUTHORIZENET_API_LOGIN_ID=
AUTHORIZENET_TRANSACTION_KEY=
AUTHORIZENET_SIGNATURE_KEY=
AUTHORIZENET_ENVIRONMENT=SANDBOX
```

Secrets must remain server-side.

---

# 21. Authorize.Net Architecture

The project is designed to support Authorize.Net for payment operations.

The broader payment roadmap includes:

- Payment processing
- Customer records
- Payment-method updates
- Recurring payments
- Failed-payment handling
- Webhook/event synchronization
- Subscription lifecycle synchronization

A production-grade flow should be:

```text
Client
  ↓
Server API
  ↓
Authorize.Net
  ↓
Gateway Result
  ↓
Server Validation
  ↓
Database Transaction
  ↓
UI Update
```

The client must not directly own gateway secrets.

---

# 22. Signup Forms

Gym SaaS includes a configurable signup-form direction.

The form-builder architecture can support:

- Form configuration
- Custom fields
- Product selection
- Waiver fields
- Public signup
- QR entry points
- Checkout

The important tenant rule is:

```text
Signup Form
   ↓
Selected Product
   ↓
Validate Product belongs to Signup/Gym
   ↓
Create Member
   ↓
Create Membership
   ↓
Create Payment (if applicable)
```

Client-provided product IDs must not be trusted without server-side validation.

---

# 23. Waiver Management

Waivers are part of the signup workflow.

The intended flow is:

```text
Public Signup
   ↓
Display Waiver
   ↓
User Acceptance
   ↓
Persist Acceptance
   ↓
Associate with Member / Signup
```

A production implementation should persist:

- Waiver version
- Acceptance timestamp
- Member identity
- Relevant form/version
- IP/device metadata where legally appropriate
- Signature/acceptance representation

The important principle is that the acceptance should be stored as actual database state rather than only shown as a successful UI message.

---

# 24. Public Signup

Public signup allows a gym to collect member information without requiring an existing staff account.

Potential flow:

```text
Public Signup URL
      ↓
Signup Form
      ↓
Member Information
      ↓
Product Selection
      ↓
Waiver
      ↓
Validation
      ↓
Payment / Checkout
      ↓
Member Creation
      ↓
Membership Creation
      ↓
Confirmation
```

Public endpoints require especially strict validation because the caller is not yet an authenticated gym staff member.

---

# 25. Checkout

The broader roadmap includes checkout.

Checkout should validate all important server-side relationships:

- Gym
- Signup form
- Product
- Price
- Membership
- Member
- Payment amount

Never rely on a client-provided price as the source of truth.

The server should derive the final amount from trusted database records.

---

# 26. Notifications

The system includes a notification architecture.

Potential notification events include:

- Membership expiry
- Payment success
- Payment failure
- Signup confirmation
- Staff invitations
- Operational alerts

A major production requirement is:

> The application should not report a notification as "sent" if no real provider is configured or if delivery has not actually occurred.

Notification state should distinguish:

```text
queued
processing
sent
failed
not_configured
```

rather than returning a false success state.

---

# 27. Email and SMS

The project roadmap includes production configuration for:

- Email provider
- Twilio

These providers should be treated as external infrastructure.

Recommended architecture:

```text
Application Event
      ↓
Notification Service
      ↓
Provider Adapter
 ┌────┴─────┐
Email      SMS
Provider   Twilio
```

Provider credentials should always be server-side.

---

# 28. Gym Door Integration

The broader product roadmap includes integration with a real gym-door/access-control vendor API.

The expected workflow is:

```text
Membership Valid
      ↓
Access Request
      ↓
Gym Door Vendor API
      ↓
Door Access
```

This must be server-authorized.

The client should never be allowed to directly decide whether a member is allowed to enter.

---

# 29. Analytics

The platform is intended to provide business-level analytics.

Potential metrics include:

- Active members
- New members
- Revenue
- MRR
- ARR
- Renewal rate
- Churn
- LTV
- Attendance trends
- Membership distribution
- Payment performance

Analytics must use well-defined business formulas.

For example:

```text
MRR
= recurring monthly revenue recognized for active recurring subscriptions
```

The exact formula should be documented and consistently used across dashboard, reports and exports.

---

# 30. Revenue Analytics

Revenue reporting should distinguish between:

- Gross payments
- Successful payments
- Refunds
- Discounts
- Recurring revenue
- One-time revenue

A common reporting mistake is counting every payment record as recurring revenue.

The analytics layer should derive metrics from payment/membership state rather than simply summing arbitrary rows.

---

# 31. Subscription Lifecycle

The long-term architecture includes:

```text
Trial / Active
      ↓
Renewal
      ↓
Renewed
      ↓
Failed Renewal
      ↓
Past Due
      ↓
Cancelled / Expired
```

Payment gateway events should synchronize subscription state.

Webhook/event processing should be idempotent so the same gateway event cannot accidentally create duplicate state changes.

---

# 32. RLS — Row Level Security

Supabase Row Level Security is one of the most important security mechanisms in this application.

Because multiple gyms share the same database, a user from Gym A must not be able to query Gym B's data.

Conceptually:

```sql
user.gym_id = record.gym_id
```

should be part of the authorization model.

RLS policies should cover:

- SELECT
- INSERT
- UPDATE
- DELETE

as appropriate.

---

# 33. Important RLS Lessons from Development

During development, several RLS-related issues were encountered, including errors similar to:

```text
new row violates row-level security policy
```

for tables such as:

- gyms
- classes
- member_notification_preferences

These errors demonstrate an important architectural rule:

> Database permissions must match the application authorization model.

Do not solve RLS problems by using insecure policies such as:

```sql
OR true
```

or unrestricted anonymous access.

The project roadmap explicitly identifies removal of unsafe public `OR true` policies as a security task.

---

# 34. Server Authorization

RLS is important, but application APIs also need explicit authorization.

Sensitive operations should validate:

1. Authentication
2. User identity
3. Gym membership
4. Role
5. Permission
6. Resource ownership
7. Business rules

Example:

```text
POST /team/invite

Authentication
    ↓
Is user authenticated?
    ↓
Get profile
    ↓
Get gym_id
    ↓
Check role
    ↓
Check invite permission
    ↓
Validate target email
    ↓
Create invitation
```

Never depend only on hiding a button in the frontend.

---

# 35. Security Model

The application handles sensitive business information and payment-related identifiers.

Important security principles:

### Never expose

- Supabase service role key
- Authorize.Net transaction key
- Authorize.Net signature key
- QR signing secret
- Cron secret
- Other private gateway credentials

### Safe public environment variables

Variables prefixed with:

```text
NEXT_PUBLIC_
```

can be exposed to the browser only when the underlying value is intentionally public.

The repository's `.env.example` explicitly distinguishes client-safe Supabase variables from server-only secrets.

---

# 36. Environment Variables

The current environment template contains:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Server-only Supabase
SUPABASE_SERVICE_ROLE_KEY=

# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GYM_NAME=Gym SaaS

# Authorize.Net
AUTHORIZENET_API_LOGIN_ID=
AUTHORIZENET_TRANSACTION_KEY=
AUTHORIZENET_SIGNATURE_KEY=
AUTHORIZENET_ENVIRONMENT=SANDBOX

# Cron
CRON_SECRET=

# QR
QR_SIGNING_SECRET=
```

For production:

- Use Vercel environment variables or equivalent secure secret storage.
- Never commit `.env.local`.
- Never put service-role or gateway secrets into client components.
- Rotate credentials if they have ever been exposed.

---

# 37. Technology Stack

The current repository package configuration identifies the following major technologies:

| Technology | Purpose |
|---|---|
| Next.js 16.3.4 | Full-stack React framework |
| React 19.2.8 | UI |
| TypeScript 5 | Type safety |
| Supabase JS 2.116.0 | Database/Auth/API |
| Supabase SSR 0.12.7 | Server-side Supabase integration |
| Tailwind CSS 4 | Styling |
| Axios | HTTP requests |
| Lucide React | Icons |
| Motion | UI animation |
| QRCode | QR generation |
| jsQR | QR scanning |
| PostgreSQL / Supabase | Database |
| Vercel | Deployment |

The repository also contains TypeScript, ESLint and Next.js configuration.

---

# 38. Package Scripts

The repository defines:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Development

```bash
npm run dev
```

Starts the Next.js development server.

### Production build

```bash
npm run build
```

Creates the production build.

### Production server

```bash
npm run start
```

Starts the built application.

### Lint

```bash
npm run lint
```

Runs ESLint.

---

# 39. High-Level Repository Structure

The repository currently contains the main application under `src` and Supabase migrations under `supabase/migrations`.

The application architecture developed around an App Router structure similar to:

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── members/
│   │       ├── payments/
│   │       ├── products/
│   │       └── settings/
│   │
│   └── ...
│
├── components/
├── lib/
├── ...
│
supabase/
└── migrations/
```

> The exact current tree should be treated as the source of truth when making future code changes. The structure above documents the application's established architectural organization.

---

# 40. Frontend Architecture

The project uses Next.js App Router.

The application is divided into:

```text
Public / Marketing
        ↓
Authentication
        ↓
Dashboard Shell
        ↓
Feature Modules
        ↓
Data / Server Layer
        ↓
Supabase
```

A major design requirement throughout development has been:

> Preserve the existing UI/design while replacing demo or hardcoded data with real Supabase-backed functionality.

This separation is important because business logic should not unnecessarily force redesign of the existing interface.

---

# 41. UI / UX Direction

The product has a modern SaaS-oriented design language.

The landing page emphasizes:

- Strong hero section
- Gym imagery
- Feature cards
- Dashboard/product messaging
- Pricing
- Testimonials/product-use examples
- FAQ
- Responsive navigation
- CTA sections

The current landing page presents:

### Starter

₹999/month

### Growth

₹2,999/month

### Pro

₹6,999/month

The live page states that these plans are example pricing presented in INR.

---

# 42. Landing Page Sections

The current live landing page includes:

```text
Navbar
  ↓
Hero
  ↓
Product Stats / Trust Section
  ↓
Feature Grid
  ↓
Dashboard / Centralized Operations Section
  ↓
How It Works
  ↓
CTA
  ↓
Pricing
  ↓
Product-use / Review-style Section
  ↓
FAQ
  ↓
Footer
```

The landing page describes six main feature categories:

1. Member Management
2. Smart Attendance
3. Payments & Billing
4. Classes & Scheduling
5. Team & Roles
6. Gym Analytics

---

# 43. Pricing Model

The public marketing page currently displays:

| Plan | Monthly Price | Target |
|---|---:|---|
| Starter | ₹999 | Small gyms |
| Growth | ₹2,999 | Growing gyms |
| Pro | ₹6,999 | Larger / ambitious gyms |

The page includes a monthly/yearly pricing toggle concept.

The product description emphasizes scaling from basic gym operations to more advanced analytics and management controls.

---

# 44. Responsive Design

The application is intended to support:

- Desktop
- Tablet
- Mobile

The team area, for example, includes both:

```text
TeamTable
TeamMobileList
```

This reflects the requirement to provide different layouts for larger and smaller screens where necessary.

Responsive design should preserve:

- Navigation usability
- Table readability
- Form accessibility
- CTA visibility
- Touch-friendly controls
- Dashboard card layout

---

# 45. Interactive UI

The project uses Motion for animation.

Interactive UI patterns include:

- Animated sections
- Navigation interactions
- Cards
- Modals
- Dropdowns
- Filters
- Toast notifications
- QR interactions
- Responsive menus

Animations should support usability rather than distract from business workflows.

---

# 46. Toast Notifications

The application has a toast notification direction to replace scattered inline error messages.

The expected behavior is:

```text
Action
 ↓
API Request
 ↓
Success / Error
 ↓
Toast
```

Examples:

```text
Member created successfully
Payment failed
Profile updated
Invitation sent
Unable to load members
```

Toasts should not claim success unless the underlying operation actually succeeded.

---

# 47. Data Fetching Philosophy

A major development goal is replacing demo data with real backend data.

Instead of:

```ts
const members = demoMembers;
```

the application should use:

```text
Authenticated User
       ↓
Profile
       ↓
Gym ID
       ↓
Authorized Supabase Query
       ↓
Real Database Data
       ↓
UI
```

This is especially important in multi-tenant pages.

---

# 48. Example Member Loading Flow

The member list should conceptually work as:

```text
loadMembers()
   ↓
get authenticated user
   ↓
get profile
   ↓
extract gym_id
   ↓
query members
   ↓
handle Supabase errors
   ↓
return members
   ↓
render UI
```

If Supabase returns an empty array, the application should distinguish between:

- No records
- Incorrect gym ID
- Authentication failure
- RLS denial
- Query error
- Schema mismatch

This prevents silent debugging problems.

---

# 49. Error Handling

The project has encountered several database/schema errors during development.

Examples include:

```text
Could not find the table public.member_memberships
```

```text
column members.authorize_net_customer_id does not exist
```

```text
Could not find the membership_id column of payments
```

```text
function public.set_updated_at() does not exist
```

These errors highlight an important migration discipline:

```text
Schema change
    ↓
Migration
    ↓
Database
    ↓
Schema cache refresh
    ↓
Application query
```

Application code and database migrations must evolve together.

---

# 50. Supabase Schema Synchronization

Whenever a column/table/function is added:

1. Add migration.
2. Apply migration to Supabase.
3. Confirm the object exists.
4. Confirm RLS policies.
5. Test using authenticated user.
6. Verify API/server query.
7. Verify frontend query.
8. Test production environment.

Do not assume that updating TypeScript types or frontend code automatically changes the database.

---

# 51. API Architecture

The application follows a Next.js full-stack architecture.

Conceptually:

```text
Next.js UI
   ↓
Server Actions / Route Handlers
   ↓
Authorization
   ↓
Business Logic
   ↓
Supabase / External Services
```

External integrations should be isolated from UI components.

---

# 52. Sensitive API Authorization Checklist

Every sensitive endpoint should validate:

```text
[ ] Authenticated
[ ] User exists
[ ] Profile exists
[ ] Gym exists
[ ] User belongs to gym
[ ] Role is allowed
[ ] Permission is allowed
[ ] Resource belongs to gym
[ ] Input validated
[ ] Business rule validated
[ ] Database operation authorized
```

This checklist should be applied especially to:

- Team invitations
- Member updates
- Membership changes
- Payments
- Product changes
- Signup administration
- Settings
- Notifications
- QR check-ins
- Door access
- Subscription operations

---

# 53. Important Production Security Tasks

The project's broader hardening checklist includes:

1. Rotate exposed Supabase/Authorize.Net/Gym Door secrets.
2. Remove insecure public `OR true` RLS policies.
3. Harden every sensitive API authorization.
4. Secure manual/QR visit decrement.
5. Validate signup waiver persistence.
6. Validate that selected products belong to the signup form/gym.
7. Secure member check-in QR.
8. Implement real Authorize.Net payment-method updates.
9. Implement Authorize.Net webhook/event synchronization.
10. Stop fake "sent" notification states when providers are unavailable.
11. Secure custom-domain mapping/provisioning.
12. Implement real Gym Door vendor API integration.
13. Implement true recurring class generation.
14. Deploy notification cron jobs.
15. Configure production email provider.
16. Configure production Twilio.
17. Implement recurring-payment renewal and failure handling.
18. Synchronize subscription lifecycle.
19. Verify analytics calculations such as MRR, ARR, renewal rate, churn and LTV.

These items represent production-hardening and completion work rather than assumptions that every item is already complete.

---

# 54. Known Development Challenges

The project has encountered several classes of issues.

## Authentication

Example:

```text
Anonymous sign-ins are disabled
```

This indicates that application logic should not assume anonymous authentication is available.

## RLS

Example:

```text
new row violates row-level security policy
```

This requires checking both the authenticated identity and the table policy.

## Schema Cache

Example:

```text
Could not find the table in the schema cache
```

This often indicates that:

- Migration was not applied
- Table name is wrong
- Schema cache is stale
- Environment points to another Supabase project

## Missing Columns

Example:

```text
column ... does not exist
```

This means application code and DB schema are out of sync.

## Missing Database Functions

Example:

```text
function public.set_updated_at() does not exist
```

This means the trigger/function dependency must be created through a migration before the table trigger references it.

---

# 55. Database Debugging Method

Recommended debugging sequence:

```text
1. Check browser error
2. Check server log
3. Check Supabase response
4. Check authenticated user
5. Check profile
6. Check gym_id
7. Run direct SQL query
8. Check table schema
9. Check RLS
10. Check migration
11. Check environment variables
12. Re-test
```

For an empty frontend array:

```text
Supabase SQL returns rows
but
Next.js returns []
```

investigate:

```text
Auth user
   ↓
Profile gym_id
   ↓
RLS auth.uid()
   ↓
Query filter
   ↓
Environment/project URL
   ↓
Database being queried
```

---

# 56. Deployment

The application is deployed on Vercel.

Live URL:

```text
https://gym-saa-s-next-js.vercel.app/
```

Typical deployment workflow:

```text
Local Development
      ↓
Git Commit
      ↓
GitHub
      ↓
Vercel Build
      ↓
Production Deployment
```

---

# 57. Vercel Environment Configuration

Production environment variables must be configured in Vercel.

Important categories:

```text
Public:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_GYM_NAME

Private:
SUPABASE_SERVICE_ROLE_KEY
AUTHORIZENET_API_LOGIN_ID
AUTHORIZENET_TRANSACTION_KEY
AUTHORIZENET_SIGNATURE_KEY
CRON_SECRET
QR_SIGNING_SECRET
```

After changing environment variables, a new deployment may be required for the new values to be used by the deployed application.

---

# 58. Favicon and Open Graph

The project has included:

```text
src/app/favicon.svg
src/app/opengraph-image.png
```

Next.js App Router metadata conventions can use these files for:

- Browser favicon
- Social sharing preview
- Open Graph image

If a Vercel deployment continues showing an older image:

1. Confirm the file is actually committed.
2. Confirm the correct `app` directory is being built.
3. Confirm metadata conventions.
4. Create a new deployment.
5. Check CDN/browser cache.
6. Test the generated HTML metadata.

---

# 59. Hydration

The project has also encountered hydration mismatch errors.

Common causes include:

- Rendering browser-only values on the server
- Date/time differences
- Random values
- Non-deterministic rendering
- Client-only APIs in server-rendered components

The general solution is to ensure server-rendered output is deterministic and browser-only behavior is moved into appropriate client-side logic.

---

# 60. Icon Compatibility

The project uses `lucide-react`.

A previously encountered build issue involved importing an icon that did not exist in the installed version.

Rule:

> Always verify the exported icon name against the installed Lucide React version.

When upgrading packages, re-check icon imports.

---

# 61. Next.js Version

The repository currently declares:

```text
Next.js 16.3.4
```

with:

```text
React 19.2.8
React DOM 19.2.8
```

The project should therefore follow the App Router and React Server/Client Component conventions appropriate to these versions.

---

# 62. Server vs Client Components

A useful architectural split is:

### Server Components

Use for:

- Database fetching where appropriate
- Secure server-side logic
- Initial page rendering
- Sensitive operations

### Client Components

Use for:

- Interactive forms
- Dropdowns
- Modals
- Filters
- Animations
- Browser APIs
- QR scanning
- Local UI state

Avoid turning entire pages into client components when only one interactive child requires client-side behavior.

---

# 63. Recommended Data Flow

```text
                    ┌─────────────────┐
                    │     Browser     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Next.js      │
                    │ UI / App Router │
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
        ┌─────────────────┐    ┌─────────────────┐
        │ Server Logic /  │    │ Supabase Client │
        │ Route Handlers  │    │ for safe reads  │
        └────────┬────────┘    └────────┬────────┘
                 │                      │
                 └──────────┬───────────┘
                            ▼
                    ┌─────────────────┐
                    │ Supabase Auth   │
                    │ + PostgreSQL    │
                    │ + RLS           │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ External APIs   │
                    │ Authorize.Net   │
                    │ Email / Twilio  │
                    │ Door Vendor     │
                    └─────────────────┘
```

---

# 64. End-to-End Member Lifecycle

A complete member lifecycle can be represented as:

```text
Visitor
  ↓
Public Signup
  ↓
Form Validation
  ↓
Waiver Acceptance
  ↓
Product Validation
  ↓
Payment / Checkout
  ↓
Member Creation
  ↓
Membership Creation
  ↓
Confirmation
  ↓
Member Dashboard
  ↓
Check-in
  ↓
Attendance
  ↓
Membership Renewal
  ↓
Payment Renewal
  ↓
Retention / Analytics
```

---

# 65. End-to-End Team Lifecycle

```text
Admin
 ↓
Invite Team Member
 ↓
Invitation
 ↓
User Authentication
 ↓
Profile Creation
 ↓
Role Assignment
 ↓
Gym Association
 ↓
Permission Evaluation
 ↓
Dashboard Access
```

---

# 66. End-to-End Payment Lifecycle

```text
Member
 ↓
Select Product
 ↓
Checkout
 ↓
Server Validation
 ↓
Authorize.Net
 ↓
Transaction
 ↓
Gateway Response
 ↓
Database Payment Record
 ↓
Membership Update
 ↓
Notification
 ↓
Analytics
```

---

# 67. End-to-End QR Check-in Lifecycle

```text
Member QR
   ↓
Scanner
   ↓
Token Decode
   ↓
Server Verification
   ↓
Gym Validation
   ↓
Member Validation
   ↓
Membership Validation
   ↓
Visit / Attendance Update
   ↓
Response
```

---

# 68. Data Consistency Rules

Important consistency rules include:

### Member ownership

```text
member.gym_id == currentUser.gym_id
```

### Membership ownership

```text
membership.gym_id == currentUser.gym_id
```

### Product ownership

```text
product.gym_id == currentUser.gym_id
```

### Signup product

```text
signupForm.gym_id == product.gym_id
```

### Payment

```text
payment.gym_id == membership.gym_id
```

### Team member

```text
profile.gym_id == currentAdmin.gym_id
```

These constraints prevent cross-tenant data access.

---

# 69. Testing Strategy

A serious production test suite should cover:

## Authentication

- Login
- Logout
- Registration
- Invalid credentials
- Expired session

## Authorization

- Admin access
- Manager access
- Trainer access
- Member access
- Unauthorized role
- Cross-gym access

## Members

- Create
- Read
- Update
- Delete/archive
- Search
- Filter

## Memberships

- Create
- Activate
- Expire
- Renew
- Remaining visits

## Payments

- Successful payment
- Failed payment
- Refund
- Duplicate event
- Webhook

## Signup

- Valid signup
- Invalid product
- Invalid gym
- Waiver acceptance
- Duplicate member

## QR

- Valid QR
- Expired QR
- Invalid signature
- Wrong gym
- Inactive membership

---

# 70. Security Testing

At minimum, test:

```text
[ ] User cannot read another gym's members
[ ] User cannot update another gym's members
[ ] User cannot create records for another gym
[ ] User cannot change role without permission
[ ] Manager cannot perform admin-only actions
[ ] Member cannot access admin APIs
[ ] Client cannot choose arbitrary product price
[ ] Client cannot decrement another member's visits
[ ] QR cannot be forged
[ ] Webhook cannot be replayed without protection
[ ] Secrets never reach browser bundles
```

---

# 71. Performance Considerations

As the platform grows:

- Paginate member lists
- Paginate payment history
- Index `gym_id`
- Index foreign keys
- Index membership status/end dates
- Avoid N+1 queries
- Cache expensive analytics where appropriate
- Use server-side aggregation for reports
- Use realtime events instead of aggressive polling
- Lazy-load heavy client features such as QR scanning

---

# 72. Recommended Database Indexes

The exact indexes should follow actual query patterns, but likely high-value indexes include:

```text
members(gym_id)
members(gym_id, status)
members(gym_id, email)

member_memberships(gym_id)
member_memberships(member_id)
member_memberships(product_id)
member_memberships(gym_id, status)
member_memberships(gym_id, end_date)

payments(gym_id)
payments(member_id)
payments(membership_id)
payments(gym_id, status)

profiles(gym_id)
profiles(gym_id, role)
```

For attendance:

```text
attendance(employeeId, date)
```

or the equivalent member/gym-specific schema used by the final implementation.

---

# 73. Migration Strategy

Every database change should be represented by a migration.

Example:

```text
supabase/migrations/
├── 001_initial_schema.sql
├── 002_add_memberships.sql
├── 003_add_payments.sql
├── 004_add_rls.sql
└── ...
```

Migration names should clearly communicate their purpose.

Avoid manually changing production schema without recording the corresponding migration.

---

# 74. Development Workflow

Recommended development cycle:

```text
Understand requirement
       ↓
Check existing UI
       ↓
Check existing DB schema
       ↓
Check RLS
       ↓
Implement server/business logic
       ↓
Connect UI
       ↓
Test authenticated flow
       ↓
Test unauthorized flow
       ↓
Run lint
       ↓
Run build
       ↓
Commit
       ↓
Deploy
       ↓
Verify production
```

---

# 75. Git Workflow

Recommended:

```bash
git status
git add .
git commit -m "feat: implement member workflow"
git push origin main
```

Before pushing:

```bash
npm run lint
npm run build
```

Do not commit:

```text
.env
.env.local
service credentials
gateway secrets
private certificates
```

---

# 76. Production Readiness Checklist

## Authentication

- [ ] Production Supabase project configured
- [ ] Auth redirect URLs configured
- [ ] Password reset tested
- [ ] Session handling tested

## Authorization

- [ ] RBAC implemented server-side
- [ ] RLS enabled
- [ ] Cross-gym access tested
- [ ] Admin-only endpoints protected

## Database

- [ ] All migrations applied
- [ ] Indexes verified
- [ ] Foreign keys verified
- [ ] Trigger functions exist
- [ ] RLS policies reviewed

## Payments

- [ ] Authorize.Net production credentials configured
- [ ] Webhooks implemented
- [ ] Payment failure flow tested
- [ ] Renewal tested
- [ ] Refund logic tested

## Notifications

- [ ] Email provider configured
- [ ] Twilio configured
- [ ] Failure states implemented
- [ ] Cron deployed

## QR

- [ ] QR signing secret configured
- [ ] Token expiration implemented
- [ ] Server verification implemented
- [ ] Cross-gym protection implemented

## Deployment

- [ ] Vercel environment variables configured
- [ ] Production build succeeds
- [ ] Domain configured
- [ ] Metadata configured
- [ ] Favicon verified
- [ ] Open Graph preview verified

---

# 77. Current Product Positioning

The live landing page positions Gym SaaS as a centralized platform for:

> Members + Memberships + Attendance + Payments + Classes + Team + Analytics

The marketing experience emphasizes:

- Easy setup
- Secure access
- Scalability
- Centralized operations
- Reduced administrative overhead
- Growth-oriented gym management

The page currently describes the product as suitable for gym owners, fitness businesses, managers and teams.

---

# 78. Portfolio / Resume Description

### Short version

**Gym SaaS — Full-Stack Gym Management Platform**

Built a multi-tenant gym management SaaS using Next.js, React, TypeScript, Tailwind CSS and Supabase. Implemented authentication, role-based access control, member and membership management, payments, attendance, products, team management, QR workflows and dashboard analytics with a responsive SaaS interface.

### Technical version

Developed a full-stack multi-tenant gym management platform using Next.js App Router, TypeScript, React, Tailwind CSS and Supabase/PostgreSQL. Designed tenant-aware database architecture with gym-level isolation, authentication, RBAC, RLS, member/membership workflows, attendance, payments, product management, team management, QR-based workflows and production deployment through Vercel.

---

# 79. Interview Explanation

If asked:

### "Tell me about your Gym SaaS project."

A strong explanation is:

> Gym SaaS is a multi-tenant gym management platform that I built using Next.js, React, TypeScript, Tailwind CSS and Supabase. The main goal is to centralize gym operations such as member management, memberships, attendance, payments, products, classes and team management.
>
> The application uses Supabase Auth for authentication and PostgreSQL with Row Level Security for tenant isolation. Each gym has its own users and business data, and access is controlled using roles such as admin, manager, trainer and member.
>
> On the frontend I used Next.js App Router with reusable components and responsive layouts. I also worked on QR-based workflows, payment integration architecture, signup forms, waivers, notifications and analytics.
>
> One of the major challenges was making sure that frontend functionality, backend authorization, Supabase RLS policies and database migrations all remained synchronized. I also worked through issues involving schema mismatches, authentication, RLS, production environment variables and deployment.

---

# 80. Why Supabase?

Supabase is a strong fit for this application because it provides:

- PostgreSQL
- Authentication
- Row Level Security
- Realtime capabilities
- JavaScript/TypeScript SDK
- Server-side integration
- Database migrations

For a multi-tenant SaaS, PostgreSQL + RLS is especially useful because tenant boundaries can be enforced close to the data layer.

---

# 81. Why Next.js?

Next.js provides:

- App Router
- Server Components
- Client Components
- Route Handlers
- Server-side rendering
- Strong React integration
- Vercel deployment
- Full-stack application structure

This makes it possible to keep the frontend and backend application logic in one project while still separating secure server-side operations from browser UI.

---

# 82. Why TypeScript?

TypeScript improves:

- Component prop safety
- Database data handling
- API response consistency
- Refactoring
- IDE support
- Maintainability

This is particularly valuable in a large SaaS application where many entities are related:

```text
Gym
 ↓
Profile
 ↓
Member
 ↓
Membership
 ↓
Product
 ↓
Payment
```

---

# 83. Why Row Level Security?

A multi-tenant SaaS cannot rely only on frontend filtering.

For example, this is not sufficient:

```ts
supabase
  .from("members")
  .select("*")
  .eq("gym_id", currentGymId)
```

The database should also prevent unauthorized rows from being returned.

Therefore:

```text
Frontend filtering
        +
Server authorization
        +
Database RLS
```

creates a stronger security model.

---

# 84. Architectural Principle

The most important architecture principle for Gym SaaS is:

> **Never trust the client with authorization or business-critical decisions.**

The client can request:

```text
"Create this membership"
```

but the server/database must decide:

```text
Is this user allowed?
Does this gym own the product?
Is the member in this gym?
Is the price valid?
Is the membership allowed?
```

---

# 85. Future Roadmap

## Phase 1 — Security Hardening

- Rotate all potentially exposed credentials
- Audit all RLS policies
- Remove unsafe public policies
- Audit every API
- Add authorization helpers
- Add security tests

## Phase 2 — Membership

- Complete visit decrement
- Complete renewal workflow
- Add expiration handling
- Add renewal reminders

## Phase 3 — Payments

- Complete Authorize.Net customer management
- Payment method update
- Webhooks
- Failed payment handling
- Recurring renewal
- Refund support

## Phase 4 — Communication

- Email production setup
- Twilio production setup
- Notification queue
- Notification cron
- Delivery status

## Phase 5 — Operations

- True recurring classes
- Trainer scheduling
- Member check-in QR
- Gym door API

## Phase 6 — Analytics

- MRR
- ARR
- Churn
- Renewal rate
- LTV
- Attendance trends
- Revenue reports

## Phase 7 — SaaS Infrastructure

- Custom domains
- Subscription plans
- Billing for gyms
- Tenant provisioning
- Multi-gym support
- Platform admin controls

---

# 86. Final Architecture Summary

```text
                         GYM SaaS
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       Public             Auth            Dashboard
       Website             │                 │
          │                │                 │
          │                ▼                 ▼
          │             Profiles         RBAC / Roles
          │                │                 │
          └────────────────┼─────────────────┘
                           │
                         Gym
                           │
       ┌────────────┬──────┼──────┬─────────────┐
       │            │      │      │             │
    Members    Memberships Products Payments  Team
       │            │      │      │             │
       └────────────┴──────┼──────┴─────────────┘
                           │
                    Attendance / QR
                           │
                    Classes / Schedule
                           │
                     Notifications
                           │
                       Analytics
                           │
                    External Services
                 ┌─────────┼─────────┐
                 │         │         │
            Authorize.Net Email    Twilio
                 │
             Door Vendor
```

---

# 87. Project Quality Goals

The final production version should target:

### Security

- Strong tenant isolation
- Server-side authorization
- RLS
- Secret protection
- Secure QR tokens
- Webhook verification

### Reliability

- Correct database state
- Idempotent webhooks
- Accurate payment state
- Accurate membership state
- Reliable notifications

### Maintainability

- Typed data
- Reusable components
- Clear server/business logic
- Migration-based database changes
- Centralized permission checks

### User Experience

- Responsive UI
- Fast navigation
- Clear feedback
- Accessible forms
- Useful dashboard
- Simple workflows

### Scalability

- Indexed database queries
- Pagination
- Realtime events where useful
- Background jobs
- External-service abstraction
- Tenant-safe architecture

---

# 88. Source and Verification Notes

This documentation was prepared from the supplied project repository and live deployment information, together with the project's established implementation context.

### Public repository

https://github.com/ganjeliyajay/Gym-SaaS-Next.js

The repository currently exposes the main `src` application area, Supabase migrations, environment template, package configuration and seed-related files. The repository package configuration identifies Next.js 16.3.4, React 19.2.8, Supabase, Tailwind CSS, Motion, QRCode and jsQR among the project's dependencies.

### Live application

https://gym-saa-s-next-js.vercel.app/

The current landing page publicly presents Gym SaaS as a gym-management platform with member management, attendance, payments/billing, classes/scheduling, team/roles and analytics. It currently shows INR example pricing for Starter, Growth and Pro plans.

### Important distinction

Some sections in this document describe the **broader application architecture, implemented workflows, development decisions and production roadmap** rather than claiming that every roadmap item is currently production-complete.

For future development, the actual source code and latest Supabase migrations should always be treated as the final source of truth.

---

# 89. One-Line Project Summary

> **Gym SaaS is a full-stack, multi-tenant gym management platform built with Next.js, React, TypeScript, Tailwind CSS and Supabase, designed to centralize members, memberships, attendance, payments, classes, staff, QR workflows and gym business analytics in one secure system.**

---

# 90. Project Links

- **GitHub Repository:** https://github.com/ganjeliyajay/Gym-SaaS-Next.js
- **Live Website:** https://gym-saa-s-next-js.vercel.app/

---

## Documentation Status

**Document:** Complete Project Documentation  
**Project:** Gym SaaS  
**Documentation purpose:** Technical reference, project explanation, portfolio documentation, onboarding and future development  
**Last prepared:** September 2026

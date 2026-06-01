# Production UI Observations

Captured screenshots are stored in `production-screenshots/` and intentionally ignored by Git.

## Global Layout

- Header brand: Dameron shield logo, `Dameron Security - Admin`.
- Right header actions: notification bell with red unread count, `Back to Dashboard`, `Logout`.
- Page width: centered content with generous horizontal margins.
- Styling: white background, thin gray borders, black primary buttons, red outlined destructive buttons.
- Cards and panels use subtle borders with small radius.

## Dashboard

- Four module cards:
  - Visitor Check-in
  - Event Reporting
  - Incident Reporting
  - User Management
- Each card has a short description and a black action button.

## Visitor Check-in

- Top-right `New Check-in` button.
- Filters: Date From, Date To, Search by Name.
- New Check-in modal fields:
  - First Name
  - Last Name
  - Check-in Date
  - Cancel
  - Check In

## Event Reporting

- Search input at top.
- `Add New Event` button.
- Event list table columns:
  - Date/Time
  - Zone
  - Category
  - Narrative
  - Status
  - Reported By
  - Actions
- Pagination with page-size selector.
- Add event form fields:
  - Date/Time
  - Zone
  - Category
  - Narrative
  - Status

## Incident Reporting

- Filter fields:
  - Date Range Preset
  - From Date
  - To Date
  - Incident Category
  - Incident Severity
  - Status
  - Sub Site
  - Search Keyword
  - Search in Narrative
- Incident table columns:
  - Date/Time
  - Incident #
  - Officer
  - Status
  - Category
  - Severity
  - Actions
- Status badges include Pending Review and Pending.
- Severity badge shown as Low in captured rows.

## User Management

- Search by name, email, or employee ID.
- Employee Management table columns:
  - Employee ID
  - Name
  - Email
  - Role
  - Actions
- `Add User` button.
- Red outlined `Delete` action.


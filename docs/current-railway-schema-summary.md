# Current Railway Schema Summary

Captured from Railway on 2026-05-27 using `scripts/inspect-railway-schema.js`.

The raw schema snapshot is stored in `docs/current-railway-schema.json`.

## Tables

- `employees`
- `event_drafts`
- `event_images`
- `events`
- `incident_drafts`
- `incident_images`
- `incidents`
- `notifications`
- `users`
- `visitors`

## Row Counts

- `employees`: 0
- `event_drafts`: 0
- `event_images`: 0
- `events`: 45,094
- `incident_drafts`: 0
- `incident_images`: 0
- `incidents`: 426
- `notifications`: 1,230
- `users`: 28
- `visitors`: 66,723

## Main Tables

### `users`

- `id`
- `email`
- `password`
- `first_name`
- `last_name`
- `role`
- `created_at`
- `employee_id`

### `visitors`

- `visitor_id`
- `first_name`
- `last_name`
- `check_in_time`
- `check_out_time`
- `status`
- `valid_until`
- `created_at`
- `room_number`

### `events`

- `id`
- `date_time`
- `user_id`
- `zone`
- `category`
- `narrative`
- `status`
- `created_at`
- `event_number`
- `assigned_to`

### `incidents`

- `incident_id`
- `incident_number`
- `reporting_officer_id`
- `status`
- `approval_status`
- `approved_by`
- `approval_date`
- `approval_notes`
- `created_at`
- `location`
- `sub_site`
- `zone`
- `room_street`
- `building`
- `floor`
- `department`
- `area_type`
- `severity_level`
- `narrative`
- `primary_category`
- `additional_categories`
- `is_confidential`
- `incident_date`
- `incident_time`
- `reporting_phone`
- `officer_post`
- `shift_supervisor`
- `area_secured`
- `officer_at_location`

## Rebuild Recommendation

Preserve these legacy table names for the first Hostinger migration so data movement is straightforward. Add missing compliance/security tables separately, especially `audit_logs`, rather than renaming everything during the first migration.

After production is stable on Hostinger, a later cleanup migration can introduce cleaner names/views if needed.

## Post-Migration Index Improvements

Add or confirm indexes for the busiest filters:

- `visitors(check_in_time desc)`
- `visitors(status)`
- `lower(visitors.last_name), lower(visitors.first_name)`
- `events(date_time desc)`
- `events(status)`
- `events(user_id)`
- `events` full-text search over `narrative`
- `incidents(incident_date desc, incident_time desc)`
- `incidents(status)`
- `incidents(approval_status)`
- `incidents(severity_level)`
- `incidents(sub_site)`
- `incidents` full-text search over `narrative`

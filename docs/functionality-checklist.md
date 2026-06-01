# Functionality Checklist

Current rebuild verification status against the Railway-backed dev API.

## Verified Read Flows

- Login with existing bcrypt-hashed Railway user.
- Dashboard loads notification unread count.
- Visitor Check-in page loads filters and visitor table.
- Event Reporting page loads search, event table, pagination, edit buttons, delete buttons.
- Incident Reporting page loads filters, incident table, status badges, severity badges, view buttons.
- User Management page loads search, employee table, add user button, delete buttons.

## Verified Non-Destructive UI Flows

- New Check-in modal opens and closes.
- Add New Event modal opens and closes.
- Edit Event modal opens and closes.
- New Incident modal opens and closes.
- Incident View modal opens and closes.
- Add User modal opens and closes.
- Module navigation and Back to Dashboard work.

## Still Needs Write Testing

Run these against a cloned/dev database before using them on production data:

- Create visitor.
- Check out visitor.
- Create event.
- Edit event.
- Delete event.
- Create incident.
- Create user.
- Delete user.

## Notes

- Production-like styling now uses the legacy logo and `Karrik, Afacad, sans-serif` font stack.
- Place actual Karrik font files in `client/public/fonts/` to make Karrik render:
  - `Karrik-Regular.woff2`
  - `Karrik-Regular.woff`
- The captured legacy CSS imports Afacad and applies it globally, so Afacad is the active fallback until Karrik files are supplied.


create table if not exists audit_logs (
  id bigserial primary key,
  actor_user_id integer references users(id),
  actor_employee_id text,
  action text not null check (action in ('create', 'update', 'delete', 'login', 'logout')),
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_visitors_status on visitors (status);
create index if not exists idx_visitors_check_in_time on visitors (check_in_time desc);
create index if not exists idx_visitors_name_lower on visitors (lower(last_name), lower(first_name));

create index if not exists idx_events_date on events (date_time desc);
create index if not exists idx_events_event_number on events (event_number);
create index if not exists idx_events_status on events (status);
create index if not exists idx_events_user on events (user_id);
create index if not exists idx_events_narrative_search on events using gin (to_tsvector('english', coalesce(narrative, '')));

create index if not exists idx_incidents_date_time on incidents (incident_date desc, incident_time desc);
create index if not exists idx_incidents_status on incidents (status);
create index if not exists idx_incidents_approval_status on incidents (approval_status);
create index if not exists idx_incidents_severity on incidents (severity_level);
create index if not exists idx_incidents_sub_site on incidents (sub_site);
create index if not exists idx_incidents_narrative_search on incidents using gin (to_tsvector('english', coalesce(narrative, '')));

create index if not exists idx_notifications_user_unread on notifications (user_id, created_at desc) where coalesce(is_read, false) = false;
create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on audit_logs (entity_type, entity_id);

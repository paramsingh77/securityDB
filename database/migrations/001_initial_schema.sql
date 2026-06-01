create extension if not exists pgcrypto;

create table users (
  id serial primary key,
  email varchar not null unique,
  password varchar not null,
  first_name varchar,
  last_name varchar,
  role varchar not null default 'user',
  created_at timestamp default now(),
  employee_id integer unique
);

create table employees (
  id serial primary key,
  name text,
  email text unique,
  password text,
  role text
);

create table visitors (
  visitor_id serial primary key,
  first_name varchar not null,
  last_name varchar not null,
  check_in_time timestamp not null,
  check_out_time timestamp,
  status varchar not null default 'checked_in',
  valid_until timestamp not null,
  created_at timestamp default now(),
  room_number integer
);

create table events (
  id serial primary key,
  date_time timestamp,
  user_id integer references users(id),
  zone varchar,
  category varchar,
  narrative text,
  status varchar,
  created_at timestamp default now(),
  event_number integer not null unique,
  assigned_to integer references users(id)
);

create sequence if not exists events_event_number_seq;

create table event_drafts (
  draft_id serial primary key,
  user_id integer references users(id),
  event_data jsonb not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table event_images (
  id serial primary key,
  event_id integer references events(id) on delete cascade,
  image_url text,
  created_at timestamp default now()
);

create table incidents (
  incident_id serial primary key,
  incident_number varchar not null unique,
  reporting_officer_id integer references users(id),
  status varchar,
  approval_status varchar,
  approved_by integer references users(id),
  approval_date timestamp,
  approval_notes text,
  created_at timestamp default now(),
  location varchar,
  sub_site varchar,
  zone varchar,
  room_street varchar,
  building varchar,
  floor varchar,
  department varchar,
  area_type varchar,
  severity_level varchar,
  narrative text,
  primary_category varchar,
  additional_categories text[],
  is_confidential boolean,
  incident_date date,
  incident_time time,
  reporting_phone varchar,
  officer_post varchar,
  shift_supervisor varchar,
  area_secured boolean,
  officer_at_location boolean
);

create table incident_drafts (
  draft_id serial primary key,
  user_id integer references users(id),
  incident_data jsonb not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table incident_images (
  image_id serial primary key,
  incident_id integer references incidents(incident_id) on delete cascade,
  image_url varchar not null,
  uploaded_at timestamp default now()
);

create table notifications (
  notification_id serial primary key,
  user_id integer references users(id),
  incident_id integer references incidents(incident_id),
  type text not null,
  message text not null,
  created_at date default current_date,
  is_read boolean default false
);

create table audit_logs (
  id bigserial primary key,
  actor_user_id integer references users(id),
  actor_employee_id text,
  action text not null check (action in ('create', 'update', 'delete', 'login', 'logout')),
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_visitors_status on visitors (status);
create index idx_visitors_check_in_time on visitors (check_in_time desc);
create index idx_visitors_name_lower on visitors (lower(last_name), lower(first_name));

create index idx_events_date on events (date_time desc);
create index idx_events_event_number on events (event_number);
create index idx_events_status on events (status);
create index idx_events_user on events (user_id);
create index idx_events_narrative_search on events using gin (to_tsvector('english', coalesce(narrative, '')));

create index idx_event_images_event on event_images (event_id);

create index idx_incidents_date_time on incidents (incident_date desc, incident_time desc);
create index idx_incidents_status on incidents (status);
create index idx_incidents_approval_status on incidents (approval_status);
create index idx_incidents_severity on incidents (severity_level);
create index idx_incidents_sub_site on incidents (sub_site);
create index idx_incidents_narrative_search on incidents using gin (to_tsvector('english', coalesce(narrative, '')));

create index idx_notifications_user_unread on notifications (user_id, created_at desc) where coalesce(is_read, false) = false;
create index idx_audit_logs_created_at on audit_logs (created_at desc);
create index idx_audit_logs_entity on audit_logs (entity_type, entity_id);

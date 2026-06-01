import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  Edit,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api, clearToken, getToken, setToken } from './api.js';
import './styles.css';

const modules = [
  { id: 'visitors', title: 'Visitor Check-in', detail: 'Manage visitor check-ins and check-outs. Track all visitors entering and leaving the premises.', action: 'Visitor Check-in' },
  { id: 'events', title: 'Event Reporting', detail: 'Report and track daily events, activities, and notable occurrences during your shift.', action: 'Report Event' },
  { id: 'incidents', title: 'Incident Reporting', detail: 'Report security incidents, accidents, or any situations requiring immediate attention.', action: 'Report Incident' },
  { id: 'users', title: 'User Management', detail: 'Manage security personnel accounts and access permissions.', action: 'Manage Users', adminOnly: true },
];

const emptyPage = { rows: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } };

function formatDateTime(value) {
  if (!value) return '';
  const str = typeof value === 'string' ? value.replace(' ', 'T').replace(/(\.\d+)?$/, 'Z') : value;
  const d = new Date(str);
  d.setHours(d.getHours() - 7);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'UTC',
  }).format(d);
}


function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);
  return <div className={`toast toast-${type}`}>{message}</div>;
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'success') => setToast({ message, type, key: Date.now() }), []);
  const element = toast ? <Toast key={toast.key} message={toast.message} type={toast.type} onDone={() => setToast(null)} /> : null;
  return { show, element };
}

function usePagedResource(path, params, enabled = true) {
  const [data, setData] = useState(emptyPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const key = JSON.stringify(params);

  async function load() {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== '' && value != null),
      );
      setData(await api(`${path}?${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [path, key, enabled]);

  return { data, loading, error, reload: load };
}

function Header({ user, unreadCount, setView, onLogout }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => setView('dashboard')}>
        <img className="brand-logo" src="/assets/dameron-security-logo.png" alt="" />
        <strong>Dameron Security - {user?.role === 'admin' ? 'Admin' : 'User'}</strong>
      </button>
      <div className="header-actions">
        <button className="icon-button" aria-label="Notifications">
          <Bell size={19} />
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
        <button className="secondary-button" onClick={() => setView('dashboard')}>Back to Dashboard</button>
        <button className="danger-button logout-button" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <img className="login-logo" src="/assets/dameron-security-logo.png" alt="" />
        <h1>Dameron Security</h1>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
      </form>
    </main>
  );
}

function Dashboard({ setView, user }) {
  return (
    <section className="workspace">
      <div className="module-grid">
        {modules.filter((m) => !m.adminOnly || user?.role === 'admin').map((module) => {
          return (
            <article className="module-card" key={module.id}>
              <div>
                <h2>{module.title}</h2>
                <p>{module.detail}</p>
              </div>
              <button className="primary-button" onClick={() => setView(module.id)}>{module.action}</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="search-box">
      <Search size={20} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Pager({ pagination, setPage }) {
  if (!pagination) return null;
  return (
    <div className="pager">
      <button className="secondary-button" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>Previous</button>
      <span>Page {pagination.page} of {pagination.pages}</span>
      <button className="secondary-button" disabled={pagination.page >= pagination.pages} onClick={() => setPage(pagination.page + 1)}>Next</button>
    </div>
  );
}

function VisitorsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const params = { ...filters, page, limit: 10 };
  const { data, loading, error, reload } = usePagedResource('/visitors', params);
  const { show, element: toastEl } = useToast();

  async function checkOut(id) {
    setActionLoading(id);
    try {
      await api(`/visitors/${id}/check-out`, { method: 'PATCH' });
      show('Visitor checked out successfully');
      reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="workspace">
      {toastEl}
      <div className="toolbar align-right">
        <button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={16} /> New Check-in</button>
      </div>
      <div className="filter-panel three">
        <label>Date From<input type="date" value={filters.dateFrom} onChange={(event) => { setPage(1); setFilters({ ...filters, dateFrom: event.target.value }); }} /></label>
        <label>Date To<input type="date" value={filters.dateTo} onChange={(event) => { setPage(1); setFilters({ ...filters, dateTo: event.target.value }); }} /></label>
        <label>Search by Name<input value={filters.search} onChange={(event) => { setPage(1); setFilters({ ...filters, search: event.target.value }); }} placeholder="Enter name..." /></label>
      </div>
      <DataTable loading={loading} error={error} empty="No visitors found" rowCount={data.rows.length}>
        <thead><tr><th>Date/Time</th><th>First Name</th><th>Last Name</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {data.rows.map((visitor) => (
            <tr key={visitor.visitor_id}>
              <td>{formatDateTime(visitor.check_in_time)}</td>
              <td>{visitor.first_name}</td>
              <td>{visitor.last_name}</td>
              <td><StatusBadge status={visitor.status} /></td>
              <td>{visitor.status !== 'Checked Out' && (
                <button
                  className="secondary-button"
                  disabled={actionLoading === visitor.visitor_id}
                  onClick={() => checkOut(visitor.visitor_id)}
                >
                  {actionLoading === visitor.visitor_id ? 'Checking out...' : 'Check Out'}
                </button>
              )}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Pager pagination={data.pagination} setPage={setPage} />
      {modalOpen && <NewVisitorModal onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); show('Visitor checked in successfully'); reload(); }} />}
    </section>
  );
}

function NewVisitorModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', checkInDate: '', checkInTime: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = { firstName: form.firstName, lastName: form.lastName };
      if (form.checkInDate && form.checkInTime) {
        // Send as local datetime string — server stores as-is (matching existing DB format)
        body.checkInTime = `${form.checkInDate} ${form.checkInTime}:00`;
      }
      await api('/visitors', { method: 'POST', body: JSON.stringify(body) });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal title="New Check-in" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>First Name<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required /></label>
        <label>Last Name<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required /></label>
        <label style={{fontSize:'0.85rem',color:'var(--text-muted, #888)'}}>Check-in Date &amp; Time <span style={{fontWeight:400}}>(leave blank to use current time)</span>
          <div style={{display:'flex',gap:'0.5rem',marginTop:'0.25rem'}}>
            <input type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} style={{flex:1}} />
            <input type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} style={{flex:1}} />
          </div>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={loading}>{loading ? 'Saving...' : 'Check In'}</button>
        </div>
      </form>
    </Modal>
  );
}

function EventsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const { data, loading, error, reload } = usePagedResource('/events', { search, page, limit: 10 });
  const { show, element: toastEl } = useToast();

  async function deleteEvent(id) {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    setActionLoading(id);
    try {
      await api(`/events/${id}`, { method: 'DELETE' });
      show('Event deleted successfully');
      reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="workspace">
      {toastEl}
      <div className="toolbar">
        <SearchBox value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search events..." />
        <button className="primary-button" onClick={() => setEditing({})}>Add New Event</button>
      </div>
      <Panel title="Event List" count={`${data.pagination.total} events found`}>
        <DataTable loading={loading} error={error} empty="No events found" rowCount={data.rows.length}>
          <thead><tr><th>Date/Time</th><th>Zone</th><th>Category</th><th>Narrative</th><th>Status</th><th>Reported By</th><th>Actions</th></tr></thead>
          <tbody>
            {data.rows.map((event) => (
              <tr key={event.id}>
                <td>{formatDateTime(event.date_time)}</td>
                <td>{event.zone}</td>
                <td>{event.category}</td>
                <td className="narrative-cell">{event.narrative}</td>
                <td><StatusBadge status={event.status} /></td>
                <td>{[event.first_name, event.last_name].filter(Boolean).join(' ') || 'N/A'}{event.employee_id ? <small>(ID: {event.employee_id})</small> : null}</td>
                <td className="row-actions">
                  <button className="secondary-button" onClick={() => setEditing(event)}><Edit size={15} /> Edit</button>
                  <button className="danger-button" disabled={actionLoading === event.id} onClick={() => deleteEvent(event.id)}>
                    <Trash2 size={15} /> {actionLoading === event.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <Pager pagination={data.pagination} setPage={setPage} />
      </Panel>
      {editing && <EventModal event={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); show(editing.id ? 'Event updated successfully' : 'Event created successfully'); reload(); }} />}
    </section>
  );
}

function EventModal({ event, onClose, onSaved }) {
  const [form, setForm] = useState({
    dateTime: event?.date_time?.slice(0, 16) || new Date().toISOString().slice(0, 16),
    zone: event?.zone || '',
    category: event?.category || 'Safety',
    narrative: event?.narrative || '',
    status: event?.status || 'Open',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(submitEvent) {
    submitEvent.preventDefault();
    setLoading(true);
    setError('');
    try {
      const path = event ? `/events/${event.id}` : '/events';
      await api(path, { method: event ? 'PUT' : 'POST', body: JSON.stringify(form) });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal title={event ? 'Edit Event' : 'Add New Event'} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>Date/Time*<input type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} required /></label>
        <label>Zone*<select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} required>
          <option value="">Select a Zone</option>
          <option>530 Building &gt; Floor - 1</option>
          <option>530 NE Parking Lot</option>
          <option>530 SE Parking Lot</option>
          <option>530 South Parking Lot</option>
          <option>530 SW Parking Lot</option>
          <option>Annex Building</option>
          <option>CUP Building &gt; Floor - 1</option>
          <option>CUP Building &gt; Floor - 1 &gt; Boiler Room</option>
          <option>CUP Building &gt; Floor - 1 &gt; Boiler Oxygen Storage</option>
          <option>CUP Building &gt; Floor - 1 &gt; Chiller Room</option>
          <option>CUP Building &gt; Floor - 1 &gt; Cup Lobby</option>
          <option>CUP Building &gt; Floor - 1 &gt; Disel Fuel Tank Storage</option>
          <option>CUP Building &gt; Floor - 1 &gt; Electrical Room</option>
          <option>CUP Building &gt; Floor - 1 &gt; Engineering Shop/Storage</option>
          <option>CUP Building &gt; Floor - 1 &gt; Engineering Work Yard</option>
          <option>CUP Building &gt; Floor - 1 &gt; Generator Room</option>
          <option>CUP Building &gt; Floor - 1 &gt; Med Air Room/Nitrous Oxide</option>
          <option>CUP Building &gt; Floor - 1 &gt; Plant Operation office</option>
          <option>CUP Building &gt; Floor - 2</option>
          <option>CUP Building &gt; Floor - 2 &gt; Cub 2nd floor lobby</option>
          <option>CUP Building &gt; Floor - 2 &gt; Data Center</option>
          <option>CUP Building &gt; Floor - 2 &gt; IT offices and work area</option>
          <option>CUP Building &gt; Floor - 2 &gt; IT Training and Conference</option>
          <option>CUP North Parking Lot</option>
          <option>CUP West Parking Lot</option>
          <option>Dameron House</option>
          <option>Doctors Parking Lot</option>
          <option>ED Patient Parking Lot</option>
          <option>Harrison Employee Parking Lot</option>
          <option>Harrison Street Parking</option>
          <option>HR Building</option>
          <option>Linacia Building &gt; Floor - 1</option>
          <option>Linacia North Parking Lot</option>
          <option>Linacia South Parking Lot</option>
          <option>Lincton &gt; Floor - 1</option>
          <option>Lincton Emp Parking</option>
          <option>Loading Dock</option>
          <option>Magnolia Employee Parking Lot</option>
          <option>Main Hospital &gt; Basement</option>
          <option>Main Hospital &gt; Basement &gt; Bio-Med</option>
          <option>Main Hospital &gt; Basement &gt; Boiler Room</option>
          <option>Main Hospital &gt; Basement &gt; Centeral Supply</option>
          <option>Main Hospital &gt; Basement &gt; Conference Room B</option>
          <option>Main Hospital &gt; Basement &gt; Elevator Lobby</option>
          <option>Main Hospital &gt; Basement &gt; Engineering Lobby</option>
          <option>Main Hospital &gt; Basement &gt; Engineering Shop</option>
          <option>Main Hospital &gt; Basement &gt; Kitchen and Cafeteria</option>
          <option>Main Hospital &gt; Basement &gt; Material and Management Supply</option>
          <option>Main Hospital &gt; Basement &gt; Medical Records - HIM</option>
          <option>Main Hospital &gt; Basement &gt; Nuclear Med and Pathology</option>
          <option>Main Hospital &gt; Basement &gt; Outside Loading Dock</option>
          <option>Main Hospital &gt; Basement &gt; Physical Therapy</option>
          <option>Main Hospital &gt; Basement &gt; Sound Physician's Office</option>
          <option>Main Hospital &gt; FLoor - 1</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Administration</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Admitting</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Emergency Department</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Fast Track</option>
          <option value="Main Hospital > Floor - 1 > Cath Lab">Main Hospital &gt; Floor - 1 &gt; Cardiac Rehab</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Imaging Services</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Impatient Pharmacy</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Main Lobby</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Surgery</option>
          <option>Main Hospital &gt; Floor - 1 &gt; Training Area</option>
          <option>Main Hospital &gt; Floor - 2 &gt; 2nd Floor Pre op</option>
          <option>Main Hospital &gt; Floor - 2 &gt; Endoscopy</option>
          <option>Main Hospital &gt; Floor - 2 &gt; Oil Pedis and clinical and training area</option>
          <option>Main Hospital &gt; Floor - 2 &gt; Tele 2 East</option>
          <option>Main Hospital &gt; Floor - 2 &gt; Tele 2 North Main</option>
          <option>Main Hospital &gt; Floor - 2 &gt; Tele 2 West</option>
          <option>Main Hospital &gt; Floor - 3 &gt; Case Management</option>
          <option>Main Hospital &gt; Floor - 3 &gt; Med Surg 3 North Main</option>
        </select></label>
        <label>Category*<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required><option>Safety</option><option>Security</option><option>Maintenance</option><option>Others</option></select></label>
        <label>Narrative*<textarea value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} required /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Open</option><option>Closed</option></select></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={loading}>{loading ? 'Saving...' : 'Submit Report'}</button>
        </div>
      </form>
    </Modal>
  );
}

function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [filters, setFilters] = useState({ preset: 'Today', fromDate: '', toDate: '', category: '', severity: '', status: '', subSite: '', keyword: '', narrative: '' });
  const params = { ...filters, preset: undefined, page, limit: 10 };
  const { data, loading, error, reload } = usePagedResource('/incidents', params);
  const { show, element: toastEl } = useToast();

  function applyPreset(preset) {
    const next = { ...filters, preset };
    if (preset === 'Today') {
      next.fromDate = todayInput();
      next.toDate = todayInput();
    } else if (preset === 'This Week') {
      next.fromDate = dateDaysAgo(7);
      next.toDate = todayInput();
    } else if (preset === 'This Month') {
      next.fromDate = dateDaysAgo(30);
      next.toDate = todayInput();
    }
    setPage(1);
    setFilters(next);
  }

  return (
    <section className="workspace">
      {toastEl}
      <div className="filter-panel incident-filter">
        <label>Date Range Preset<select value={filters.preset} onChange={(e) => applyPreset(e.target.value)}><option>Today</option><option>This Week</option><option>This Month</option><option>Custom</option></select></label>
        <label>From Date<input type="date" value={filters.fromDate} onChange={(e) => { setPage(1); setFilters({ ...filters, fromDate: e.target.value }); }} /></label>
        <label>To Date<input type="date" value={filters.toDate} onChange={(e) => { setPage(1); setFilters({ ...filters, toDate: e.target.value }); }} /></label>
        <label>Incident Category<input value={filters.category} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value }); }} placeholder="All Categories" /></label>
        <label>Incident Severity<select value={filters.severity} onChange={(e) => { setPage(1); setFilters({ ...filters, severity: e.target.value }); }}>
          <option value="">All Severity Levels</option>
          <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
        </select></label>
        <label>Status<input value={filters.status} onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value }); }} placeholder="All Status" /></label>
        <label>Sub Site<input value={filters.subSite} onChange={(e) => { setPage(1); setFilters({ ...filters, subSite: e.target.value }); }} placeholder="All Sub Sites" /></label>
        <label>Search Keyword<input value={filters.keyword} onChange={(e) => { setPage(1); setFilters({ ...filters, keyword: e.target.value }); }} placeholder="Search incidents..." /></label>
        <label className="wide">Search in Narrative<input value={filters.narrative} onChange={(e) => { setPage(1); setFilters({ ...filters, narrative: e.target.value }); }} placeholder="Search within incident narratives..." /></label>
        <button className="secondary-button clear-button" onClick={() => setFilters({ preset: 'Today', fromDate: '', toDate: '', category: '', severity: '', status: '', subSite: '', keyword: '', narrative: '' })}>Clear Filters</button>
      </div>
      <div className="section-row"><h1>Incident Reports ({data.pagination.total})</h1><button className="primary-button" onClick={() => setModalOpen(true)}>New Incident</button></div>
      <Panel>
        <DataTable loading={loading} error={error} empty="No incidents found" rowCount={data.rows.length}>
          <thead><tr><th>Date/Time</th><th>Incident #</th><th>Officer</th><th>Status</th><th>Category</th><th>Severity</th><th>Actions</th></tr></thead>
          <tbody>
            {data.rows.map((incident) => (
              <tr key={incident.incident_id}>
                <td>{incident.incident_date} {incident.incident_time}</td>
                <td>{incident.incident_number}</td>
                <td>{incident.officer_email || 'N/A'}</td>
                <td><span className="badge-row"><StatusBadge status={incident.approval_status} /><StatusBadge status={incident.status} /></span></td>
                <td>{incident.primary_category || 'N/A'}</td>
                <td><StatusBadge status={incident.severity_level || 'Low'} /></td>
                <td><button className="secondary-button" onClick={() => setViewing(incident)}><Eye size={15} /> View</button></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <Pager pagination={data.pagination} setPage={setPage} />
      </Panel>
      {modalOpen && <IncidentModal onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); show('Incident created successfully'); reload(); }} />}
      {viewing && <IncidentView incident={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}

const INCIDENT_ZONES = [
  '530 Building > Floor - 1','530 NE Parking Lot','530 SE Parking Lot','530 South Parking Lot','530 SW Parking Lot',
  'Annex Building',
  'CUP Building > Floor - 1','CUP Building > Floor - 1 > Boiler Room','CUP Building > Floor - 1 > Boiler Oxygen Storage',
  'CUP Building > Floor - 1 > Chiller Room','CUP Building > Floor - 1 > Cup Lobby','CUP Building > Floor - 1 > Disel Fuel Tank Storage',
  'CUP Building > Floor - 1 > Electrical Room','CUP Building > Floor - 1 > Engineering Shop/Storage','CUP Building > Floor - 1 > Engineering Work Yard',
  'CUP Building > Floor - 1 > Generator Room','CUP Building > Floor - 1 > Med Air Room/Nitrous Oxide','CUP Building > Floor - 1 > Plant Operation office',
  'CUP Building > Floor - 2','CUP Building > Floor - 2 > Cub 2nd floor lobby','CUP Building > Floor - 2 > Data Center',
  'CUP Building > Floor - 2 > IT offices and work area','CUP Building > Floor - 2 > IT Training and Conference',
  'CUP North Parking Lot','CUP West Parking Lot','Dameron House','Doctors Parking Lot','ED Patient Parking Lot',
  'Harrison Employee Parking Lot','Harrison Street Parking','HR Building',
  'Linacia Building > Floor - 1','Linacia North Parking Lot','Linacia South Parking Lot',
  'Lincton > Floor - 1','Lincton Emp Parking','Loading Dock','Magnolia Employee Parking Lot',
  'Main Hospital > Basement','Main Hospital > Basement > Bio-Med','Main Hospital > Basement > Boiler Room',
  'Main Hospital > Basement > Centeral Supply','Main Hospital > Basement > Conference Room B','Main Hospital > Basement > Elevator Lobby',
  'Main Hospital > Basement > Engineering Lobby','Main Hospital > Basement > Engineering Shop','Main Hospital > Basement > Kitchen and Cafeteria',
  'Main Hospital > Basement > Material and Management Supply','Main Hospital > Basement > Medical Records - HIM',
  'Main Hospital > Basement > Nuclear Med and Pathology','Main Hospital > Basement > Outside Loading Dock',
  'Main Hospital > Basement > Physical Therapy',"Main Hospital > Basement > Sound Physician's Office",
  'Main Hospital > FLoor - 1','Main Hospital > Floor - 1 > Administration','Main Hospital > Floor - 1 > Admitting',
  'Main Hospital > Floor - 1 > Emergency Department','Main Hospital > Floor - 1 > Fast Track','Main Hospital > Floor - 1 > Cardiac Rehab',
  'Main Hospital > Floor - 1 > Imaging Services','Main Hospital > Floor - 1 > Impatient Pharmacy',
  'Main Hospital > Floor - 1 > Main Lobby','Main Hospital > Floor - 1 > Surgery','Main Hospital > Floor - 1 > Training Area',
  'Main Hospital > Floor - 2 > 2nd Floor Pre op','Main Hospital > Floor - 2 > Endoscopy',
  'Main Hospital > Floor - 2 > Oil Pedis and clinical and training area',
  'Main Hospital > Floor - 2 > Tele 2 East','Main Hospital > Floor - 2 > Tele 2 North Main','Main Hospital > Floor - 2 > Tele 2 West',
  'Main Hospital > Floor - 3 > Case Management','Main Hospital > Floor - 3 > Med Surg 3 North Main',
];

const INCIDENT_CATEGORIES = [
  'Assault','Battery','Burglary','Child Abuse','Disorderly Conduct','Domestic Violence',
  'Drug/Alcohol','Elopement','Fire','Fraud','Harassment','Hazardous Material','Infant Abduction',
  'Larceny/Theft','Medical Emergency','Missing Person','Motor Vehicle Accident','Natural Disaster',
  'Property Damage','Robbery','Sexual Assault','Suspicious Activity','Trespassing','Vandalism',
  'Weapons','Workplace Violence','Other',
];

const SUB_SITES = [
  'Main Hospital','530 Building','CUP Building','Annex Building','Linacia Building',
  'Lincton','HR Building','Dameron House','Loading Dock','Parking Lots','Off Site',
];

const STEP_LABELS = ['Basic Info','Address/Location','Property','Vehicle','Subject','Outside Services','Mapped Data','Notifications'];

function IncidentModal({ onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    // step 1
    subSite: '', zone: '', incidentDate: todayInput(), incidentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    reportingOfficerId: '', severityLevel: '', primaryCategory: '', additionalCategories: [],
    isConfidential: false, narrative: '',
    // step 2
    onProperty: true, roomStreet: '', building: '', floor: '', aptUnit: '', areaSecured: false,
    department: '', areaType: '', shiftSupervisor: '', officerAtLocation: false,
    reportingOfficerType: 'Other', officerPost: '', reportingPhone: '',
    // step 3 — property
    propDescription: '', propLoss: '', propColor: '', propSerial: '', propModel: '', propType: '',
    propOwnerName: '', propOwnerStatus: '', propLastSeenDate: '', propLastSeenTime: '', propLastSeenBy: '', propLastSeenPhone: '',
    propGoneDate: '', propGoneTime: '', propGoneBy: '', propGonePhone: '',
    // step 4 — vehicle
    vehMake: '', vehModel: '', vehYear: '', vehColor: '', vehPlate: '', vehState: '', vehVin: '',
    vehOwnerName: '', vehOwnerPhone: '', vehInsurance: '', vehPolicy: '', vehDamageLoc: '', vehDamageDesc: '',
    vehTowCompany: '', vehTowDest: '', vehImpound: '',
    // step 5 — subject
    subType: '', subFirstName: '', subMiddleName: '', subLastName: '', subSuffix: '',
    subAlias: '', subRace: '', subSex: '', subHeight: '', subWeight: '', subHairColor: '', subEyeColor: '',
    subBuild: '', subAge: '', subDob: '', subSsn: '', subDl: '', subDlState: '',
    subAddress: '', subCity: '', subState: '', subZip: '', subPhone: '', subEmail: '',
    // step 6 — outside services
    policeAgency: '', policeOfficer: '', policeBadge: '', policeReport: '',
    fireAgency: '', fireOfficer: '', fireBadge: '', fireReport: '',
    ambulanceAgency: '', ambulanceOfficer: '', ambulanceBadge: '', ambulanceReport: '',
    hospitalName: '', hospitalContact: '',
    // step 7 — mapped data
    latitude: '', longitude: '', accuracy: '', altitude: '', altitudeAccuracy: '',
    heading: '', speed: '', timestamp: '', locationDesc: '', mapNotes: '',
    // step 8 — notifications
    notifDate: '', notifTime: '', personNotified: '', notifiedBy: '',
    notifMethod: '', notifNotes: '', followUp: false,
  });

  useEffect(() => {
    api('/users?limit=100').then((r) => setOfficers(r.rows || [])).catch(() => {});
  }, []);

  const f = (field) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: v }));
  };

  function canAdvance() {
    if (step === 0) return form.incidentDate && form.incidentTime && form.narrative;
    return true;
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const body = {
        incidentDate: form.incidentDate,
        incidentTime: form.incidentTime,
        status: 'Pending Review',
        approvalStatus: 'Pending',
        subSite: form.subSite || null,
        zone: form.zone || null,
        severityLevel: form.severityLevel || null,
        primaryCategory: form.primaryCategory || null,
        additionalCategories: form.additionalCategories.length ? form.additionalCategories : null,
        isConfidential: form.isConfidential,
        narrative: form.narrative,
        roomStreet: form.roomStreet || null,
        building: form.building || null,
        floor: form.floor || null,
        department: form.department || null,
        areaType: form.areaType || null,
        areaSecured: form.areaSecured,
        shiftSupervisor: form.shiftSupervisor || null,
        officerAtLocation: form.officerAtLocation,
        officerPost: form.officerPost || null,
        reportingPhone: form.reportingPhone || null,
      };
      await api('/incidents', { method: 'POST', body: JSON.stringify(body) });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const progressPct = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <Modal title="Event Details" onClose={onClose}>
      <div className="wizard">
        <div className="wizard-progress">
          <div className="wizard-progress-bar" style={{ width: `${progressPct}%` }} />
          <span className="wizard-progress-label">Step {step + 1} of {STEP_LABELS.length}</span>
        </div>

        {step === 0 && (
          <div className="wizard-step">
            <h3>Incident Basic Info</h3>
            <div className="two-col">
              <label>Sub Site*<select value={form.subSite} onChange={f('subSite')} required>
                <option value="">Select a Sub Site</option>
                {SUB_SITES.map((s) => <option key={s}>{s}</option>)}
              </select></label>
              <label>Zone*<select value={form.zone} onChange={f('zone')} required>
                <option value="">Select a Zone</option>
                {INCIDENT_ZONES.map((z) => <option key={z}>{z}</option>)}
              </select></label>
            </div>
            <div className="two-col">
              <label>Date of Incident*<input type="date" value={form.incidentDate} onChange={f('incidentDate')} required /></label>
              <label>Time of Incident*<input type="time" value={form.incidentTime} onChange={f('incidentTime')} required /></label>
            </div>
            <div className="two-col">
              <label>Reporting Officer*<select value={form.reportingOfficerId} onChange={f('reportingOfficerId')}>
                <option value="">Select an Officer</option>
                {officers.map((o) => <option key={o.id} value={o.id}>{[o.first_name, o.last_name].filter(Boolean).join(' ') || o.email}</option>)}
              </select></label>
              <label>Incident Severity<select value={form.severityLevel} onChange={f('severityLevel')}>
                <option value="">Not Specified</option>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select></label>
            </div>
            <div className="two-col">
              <label>Primary Incident Category*<select value={form.primaryCategory} onChange={f('primaryCategory')}>
                <option value="">Select a Category</option>
                {INCIDENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select></label>
              <label>Additional Incident Categories<textarea value={form.additionalCategories.join(', ')} onChange={(e) => setForm({ ...form, additionalCategories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="You Can Select Multiple Categories Here" /></label>
            </div>
            <label className="checkbox-label"><input type="checkbox" checked={form.isConfidential} onChange={f('isConfidential')} /> Mark as Confidential Report</label>
            <label>Narrative <span style={{ color: 'red' }}>*</span><textarea value={form.narrative} onChange={f('narrative')} required placeholder="Enter incident narrative" rows={4} /></label>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-step">
            <h3>Other Basic Info</h3>
            <label className="checkbox-label"><input type="checkbox" checked={form.onProperty} onChange={f('onProperty')} /> ON Property</label>
            <div className="two-col">
              <label>Room/Street<input value={form.roomStreet} onChange={f('roomStreet')} placeholder="Room/Street" /></label>
              <label>Building<input value={form.building} onChange={f('building')} placeholder="" /></label>
            </div>
            <div className="three-col">
              <label>Floor<input value={form.floor} onChange={f('floor')} placeholder="Floor" /></label>
              <label>Apt/Unit<input value={form.aptUnit} onChange={f('aptUnit')} placeholder="Apt/Unit" /></label>
              <label className="checkbox-label" style={{ alignSelf: 'end' }}><input type="checkbox" checked={form.areaSecured} onChange={f('areaSecured')} /> Area Secured</label>
            </div>
            <div className="two-col">
              <label>Department<input value={form.department} onChange={f('department')} placeholder="Department" /></label>
              <label>Area Type<input value={form.areaType} onChange={f('areaType')} placeholder="Area Type" /></label>
            </div>
            <div className="three-col">
              <label>Shift Supervisor<input value={form.shiftSupervisor} onChange={f('shiftSupervisor')} placeholder="Shift Supervisor" /></label>
              <label className="checkbox-label" style={{ alignSelf: 'end' }}><input type="checkbox" checked={form.officerAtLocation} onChange={f('officerAtLocation')} /> Officer at Location</label>
              <label>Reporting Officer Type<input value={form.reportingOfficerType} onChange={f('reportingOfficerType')} /></label>
            </div>
            <div className="two-col">
              <label>Officer Post<input value={form.officerPost} onChange={f('officerPost')} placeholder="Officer Post" /></label>
              <label>Reporting Phone<input value={form.reportingPhone} onChange={f('reportingPhone')} placeholder="201-555-0123" /></label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step">
            <h3>Property 1</h3>
            <div className="three-col">
              <label>Item Description<input value={form.propDescription} onChange={f('propDescription')} placeholder="Item Description" /></label>
              <label>$ Loss<input value={form.propLoss} onChange={f('propLoss')} placeholder="$ Loss" /></label>
              <label>Color<input value={form.propColor} onChange={f('propColor')} placeholder="Color" /></label>
            </div>
            <div className="three-col">
              <label>Serial<input value={form.propSerial} onChange={f('propSerial')} placeholder="Serial" /></label>
              <label>Model<input value={form.propModel} onChange={f('propModel')} placeholder="Model" /></label>
              <label>Property Type<input value={form.propType} onChange={f('propType')} placeholder="Property Type" /></label>
            </div>
            <div className="two-col">
              <label>Owner Name<input value={form.propOwnerName} onChange={f('propOwnerName')} placeholder="Owner Name" /></label>
              <label>Owner Status<input value={form.propOwnerStatus} onChange={f('propOwnerStatus')} placeholder="Owner Status" /></label>
            </div>
            <div className="three-col">
              <label>Last Seen Date<input type="date" value={form.propLastSeenDate} onChange={f('propLastSeenDate')} /></label>
              <label>Last Seen Time<input type="time" value={form.propLastSeenTime} onChange={f('propLastSeenTime')} /></label>
              <label>Last Seen By<input value={form.propLastSeenBy} onChange={f('propLastSeenBy')} placeholder="Last Seen By" /></label>
            </div>
            <label>Last Seen Phone<input value={form.propLastSeenPhone} onChange={f('propLastSeenPhone')} placeholder="201-555-0123" /></label>
            <div className="three-col">
              <label>Discovered Gone Date<input type="date" value={form.propGoneDate} onChange={f('propGoneDate')} /></label>
              <label>Discovered Gone Time<input type="time" value={form.propGoneTime} onChange={f('propGoneTime')} /></label>
              <label>Discovered Gone By<input value={form.propGoneBy} onChange={f('propGoneBy')} placeholder="Discovered Gone By" /></label>
            </div>
            <label>Discovered Gone Phone<input value={form.propGonePhone} onChange={f('propGonePhone')} placeholder="201-555-0123" /></label>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step">
            <h3>Vehicle Information</h3>
            <div className="four-col">
              <label>Make<input value={form.vehMake} onChange={f('vehMake')} placeholder="Vehicle Make" /></label>
              <label>Model<input value={form.vehModel} onChange={f('vehModel')} placeholder="Vehicle Model" /></label>
              <label>Year<input value={form.vehYear} onChange={f('vehYear')} placeholder="Vehicle Year" /></label>
              <label>Color<input value={form.vehColor} onChange={f('vehColor')} placeholder="Vehicle Color" /></label>
            </div>
            <div className="three-col">
              <label>License Plate<input value={form.vehPlate} onChange={f('vehPlate')} placeholder="License Plate" /></label>
              <label>State<input value={form.vehState} onChange={f('vehState')} placeholder="State" /></label>
              <label>VIN<input value={form.vehVin} onChange={f('vehVin')} placeholder="Vehicle VIN" /></label>
            </div>
            <div className="two-col">
              <label>Owner Name<input value={form.vehOwnerName} onChange={f('vehOwnerName')} placeholder="Owner Name" /></label>
              <label>Owner Phone<input value={form.vehOwnerPhone} onChange={f('vehOwnerPhone')} placeholder="Owner Phone" /></label>
            </div>
            <div className="two-col">
              <label>Insurance Company<input value={form.vehInsurance} onChange={f('vehInsurance')} placeholder="Insurance Company" /></label>
              <label>Policy Number<input value={form.vehPolicy} onChange={f('vehPolicy')} placeholder="Policy Number" /></label>
            </div>
            <div className="two-col">
              <label>Damage Location<input value={form.vehDamageLoc} onChange={f('vehDamageLoc')} placeholder="Damage Location" /></label>
              <label>Damage Description<textarea value={form.vehDamageDesc} onChange={f('vehDamageDesc')} placeholder="Damage Description" /></label>
            </div>
            <div className="three-col">
              <label>Tow Company<input value={form.vehTowCompany} onChange={f('vehTowCompany')} placeholder="Tow Company" /></label>
              <label>Tow Destination<input value={form.vehTowDest} onChange={f('vehTowDest')} placeholder="Tow Destination" /></label>
              <label>Impound Number<input value={form.vehImpound} onChange={f('vehImpound')} placeholder="Impound Number" /></label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-step">
            <h3>Subject Information</h3>
            <label>Type<select value={form.subType} onChange={f('subType')}>
              <option value="">Select Type</option>
              <option>Suspect</option><option>Victim</option><option>Witness</option><option>Other</option>
            </select></label>
            <div className="four-col">
              <label>First Name<input value={form.subFirstName} onChange={f('subFirstName')} placeholder="First Name" /></label>
              <label>Middle Name<input value={form.subMiddleName} onChange={f('subMiddleName')} placeholder="Middle Name" /></label>
              <label>Last Name<input value={form.subLastName} onChange={f('subLastName')} placeholder="Last Name" /></label>
              <label>Suffix<input value={form.subSuffix} onChange={f('subSuffix')} placeholder="Suffix" /></label>
            </div>
            <div className="three-col">
              <label>Alias/Nickname<input value={form.subAlias} onChange={f('subAlias')} placeholder="Alias/Nickname" /></label>
              <label>Race<select value={form.subRace} onChange={f('subRace')}>
                <option value="">Select Race</option>
                <option>American Indian/Alaska Native</option><option>Asian</option><option>Black/African American</option>
                <option>Hispanic/Latino</option><option>Native Hawaiian/Pacific Islander</option><option>White</option><option>Other</option>
              </select></label>
              <label>Sex<select value={form.subSex} onChange={f('subSex')}>
                <option value="">Select Sex</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select></label>
            </div>
            <div className="six-col">
              <label>Height<input value={form.subHeight} onChange={f('subHeight')} placeholder={'5\'10"'} /></label>
              <label>Weight<input value={form.subWeight} onChange={f('subWeight')} placeholder="180 lbs" /></label>
              <label>Hair Color<input value={form.subHairColor} onChange={f('subHairColor')} placeholder="Hair Color" /></label>
              <label>Eye Color<input value={form.subEyeColor} onChange={f('subEyeColor')} placeholder="Eye Color" /></label>
              <label>Build<input value={form.subBuild} onChange={f('subBuild')} placeholder="Build Type" /></label>
              <label>Age<input value={form.subAge} onChange={f('subAge')} placeholder="Age" /></label>
            </div>
            <div className="two-col">
              <label>Date of Birth<input type="date" value={form.subDob} onChange={f('subDob')} /></label>
              <label>SSN<input value={form.subSsn} onChange={f('subSsn')} placeholder="XXX-XX-XXXX" /></label>
            </div>
            <div className="two-col">
              <label>Driver's License<input value={form.subDl} onChange={f('subDl')} placeholder="Driver's License Number" /></label>
              <label>DL State<input value={form.subDlState} onChange={f('subDlState')} placeholder="State" /></label>
            </div>
            <label>Address<input value={form.subAddress} onChange={f('subAddress')} placeholder="Street Address" /></label>
            <div className="three-col">
              <label>City<input value={form.subCity} onChange={f('subCity')} placeholder="City" /></label>
              <label>State<input value={form.subState} onChange={f('subState')} placeholder="State" /></label>
              <label>ZIP<input value={form.subZip} onChange={f('subZip')} placeholder="ZIP Code" /></label>
            </div>
            <div className="two-col">
              <label>Phone<input value={form.subPhone} onChange={f('subPhone')} placeholder="Phone Number" /></label>
              <label>Email<input value={form.subEmail} onChange={f('subEmail')} placeholder="Email Address" /></label>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="wizard-step">
            <h3>Outside Services</h3>
            <h4>Police</h4>
            <div className="two-col">
              <label>Agency<input value={form.policeAgency} onChange={f('policeAgency')} placeholder="Police Agency" /></label>
              <label>Officer<input value={form.policeOfficer} onChange={f('policeOfficer')} placeholder="Officer Name" /></label>
            </div>
            <div className="two-col">
              <label>Badge #<input value={form.policeBadge} onChange={f('policeBadge')} placeholder="Badge Number" /></label>
              <label>Report #<input value={form.policeReport} onChange={f('policeReport')} placeholder="Report Number" /></label>
            </div>
            <h4>Fire</h4>
            <div className="two-col">
              <label>Agency<input value={form.fireAgency} onChange={f('fireAgency')} placeholder="Fire Agency" /></label>
              <label>Officer<input value={form.fireOfficer} onChange={f('fireOfficer')} placeholder="Officer Name" /></label>
            </div>
            <div className="two-col">
              <label>Badge #<input value={form.fireBadge} onChange={f('fireBadge')} placeholder="Badge Number" /></label>
              <label>Report #<input value={form.fireReport} onChange={f('fireReport')} placeholder="Report Number" /></label>
            </div>
            <h4>Ambulance</h4>
            <div className="two-col">
              <label>Agency<input value={form.ambulanceAgency} onChange={f('ambulanceAgency')} placeholder="Ambulance Agency" /></label>
              <label>Officer<input value={form.ambulanceOfficer} onChange={f('ambulanceOfficer')} placeholder="Officer Name" /></label>
            </div>
            <div className="two-col">
              <label>Badge #<input value={form.ambulanceBadge} onChange={f('ambulanceBadge')} placeholder="Badge Number" /></label>
              <label>Report #<input value={form.ambulanceReport} onChange={f('ambulanceReport')} placeholder="Report Number" /></label>
            </div>
            <h4>Hospital</h4>
            <div className="two-col">
              <label>Name<input value={form.hospitalName} onChange={f('hospitalName')} placeholder="Hospital Name" /></label>
              <label>Contact<input value={form.hospitalContact} onChange={f('hospitalContact')} placeholder="Contact Name" /></label>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="wizard-step">
            <h3>Mapped Data</h3>
            <div className="two-col">
              <label>Latitude<input value={form.latitude} onChange={f('latitude')} placeholder="Latitude" /></label>
              <label>Longitude<input value={form.longitude} onChange={f('longitude')} placeholder="Longitude" /></label>
            </div>
            <div className="two-col">
              <label>Accuracy (meters)<input value={form.accuracy} onChange={f('accuracy')} placeholder="Accuracy" /></label>
              <label>Altitude (meters)<input value={form.altitude} onChange={f('altitude')} placeholder="Altitude" /></label>
            </div>
            <div className="three-col">
              <label>Altitude Accuracy<input value={form.altitudeAccuracy} onChange={f('altitudeAccuracy')} placeholder="Altitude Accuracy" /></label>
              <label>Heading<input value={form.heading} onChange={f('heading')} placeholder="Heading" /></label>
              <label>Speed<input value={form.speed} onChange={f('speed')} placeholder="Speed" /></label>
            </div>
            <label>Timestamp<input value={form.timestamp} onChange={f('timestamp')} placeholder="Timestamp" /></label>
            <label>Location Description<textarea value={form.locationDesc} onChange={f('locationDesc')} placeholder="Describe the location..." rows={3} /></label>
            <label>Map Notes<textarea value={form.mapNotes} onChange={f('mapNotes')} placeholder="Additional notes about the location..." rows={3} /></label>
          </div>
        )}

        {step === 7 && (
          <div className="wizard-step">
            <h3>Client Notifications</h3>
            <div className="two-col">
              <label>Notification Date<input type="date" value={form.notifDate} onChange={f('notifDate')} /></label>
              <label>Notification Time<input type="time" value={form.notifTime} onChange={f('notifTime')} /></label>
            </div>
            <div className="two-col">
              <label>Person Notified<input value={form.personNotified} onChange={f('personNotified')} placeholder="Name of person notified" /></label>
              <label>Notified By<input value={form.notifiedBy} onChange={f('notifiedBy')} placeholder="Name of person making notification" /></label>
            </div>
            <label>Notification Method<select value={form.notifMethod} onChange={f('notifMethod')}>
              <option value="">Select Method</option>
              <option>Phone</option><option>Email</option><option>In Person</option><option>Radio</option><option>Other</option>
            </select></label>
            <label>Notification Notes<textarea value={form.notifNotes} onChange={f('notifNotes')} placeholder="Additional notes about the notification..." rows={3} /></label>
            <label className="checkbox-label"><input type="checkbox" checked={form.followUp} onChange={f('followUp')} /> Follow-up Required</label>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="wizard-nav">
          {step > 0 && <button type="button" className="secondary-button" onClick={() => setStep(step - 1)}>Previous: {STEP_LABELS[step - 1]}</button>}
          <span style={{ flex: 1 }} />
          {step < STEP_LABELS.length - 1 && (
            <button type="button" className="primary-button wizard-next" disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
              Next: {STEP_LABELS[step + 1]}
            </button>
          )}
          {step === STEP_LABELS.length - 1 && (
            <button type="button" className="primary-button wizard-submit" disabled={loading || !canAdvance()} onClick={submit}>
              {loading ? 'Submitting...' : 'Submit Incident Report'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function IncidentView({ incident, onClose }) {
  return (
    <Modal title={`Incident ${incident.incident_number}`} onClose={onClose}>
      <dl className="detail-list">
        <dt>Date/Time</dt><dd>{incident.incident_date} {incident.incident_time}</dd>
        <dt>Status</dt><dd>{incident.approval_status} / {incident.status}</dd>
        <dt>Officer</dt><dd>{incident.officer_email || 'N/A'}</dd>
        <dt>Sub Site</dt><dd>{incident.sub_site || 'N/A'}</dd>
        <dt>Zone</dt><dd>{incident.zone || 'N/A'}</dd>
        <dt>Severity</dt><dd>{incident.severity_level || 'Not Specified'}</dd>
        <dt>Category</dt><dd>{incident.primary_category || 'N/A'}</dd>
        <dt>Confidential</dt><dd>{incident.is_confidential ? 'Yes' : 'No'}</dd>
        <dt>Room/Street</dt><dd>{incident.room_street || 'N/A'}</dd>
        <dt>Building</dt><dd>{incident.building || 'N/A'}</dd>
        <dt>Floor</dt><dd>{incident.floor || 'N/A'}</dd>
        <dt>Department</dt><dd>{incident.department || 'N/A'}</dd>
        <dt>Area Secured</dt><dd>{incident.area_secured ? 'Yes' : 'No'}</dd>
        <dt>Shift Supervisor</dt><dd>{incident.shift_supervisor || 'N/A'}</dd>
        <dt>Officer Post</dt><dd>{incident.officer_post || 'N/A'}</dd>
        <dt>Reporting Phone</dt><dd>{incident.reporting_phone || 'N/A'}</dd>
        <dt>Narrative</dt><dd>{incident.narrative}</dd>
      </dl>
    </Modal>
  );
}

function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const { data, loading, error, reload } = usePagedResource('/users', { search, page, limit: 50 });
  const { show, element: toastEl } = useToast();

  async function deleteUser(id) {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setActionLoading(id);
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      show('User deleted successfully');
      reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="workspace">
      {toastEl}
      <div className="toolbar"><SearchBox value={search} onChange={(value) => { setPage(1); setSearch(value); }} placeholder="Search by name, email, or employee ID..." /></div>
      <Panel title="Employee Management" action={<button className="primary-button" onClick={() => setModalOpen(true)}>Add User</button>}>
        <DataTable loading={loading} error={error} empty="No users found" rowCount={data.rows.length}>
          <thead><tr><th>Employee ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {data.rows.map((user) => (
              <tr key={user.id}>
                <td>{user.employee_id}</td>
                <td>{[user.first_name, user.last_name].filter(Boolean).join(' ')}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td className="action-buttons">
                  <button className="secondary-button" onClick={() => setResetUser(user)}>Reset Password</button>
                  <button className="danger-button" disabled={actionLoading === user.id} onClick={() => deleteUser(user.id)}>
                    {actionLoading === user.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <Pager pagination={data.pagination} setPage={setPage} />
      </Panel>
      {modalOpen && <UserModal onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); show('User created successfully'); reload(); }} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onSaved={() => { setResetUser(null); show('Password reset successfully'); }} />}
    </section>
  );
}

function ResetPasswordModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      await api(`/users/${user.id}/reset-password`, { method: 'PATCH', body: JSON.stringify({ password }) });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={`Reset Password — ${[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}`} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>New Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} placeholder="Min 10 chars, upper+lower+number" /></label>
        <label>Confirm Password<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={10} placeholder="Re-enter new password" /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        </div>
      </form>
    </Modal>
  );
}

function UserModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ employeeId: '', firstName: '', lastName: '', email: '', role: 'user', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(form) });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal title="Add User" onClose={onClose}>
      <form className="stack-form two-col" onSubmit={submit}>
        <label>Employee ID<input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required /></label>
        <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>user</option><option>admin</option></select></label>
        <label>First Name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
        <label>Last Name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={10} placeholder="Min 10 chars, upper+lower+number" /></label>
        {error && <p className="form-error wide">{error}</p>}
        <div className="modal-actions wide">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={loading}>{loading ? 'Creating...' : 'Add User'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Panel({ title, count, action, children }) {
  return (
    <section className="panel">
      {(title || count || action) && <header><h2>{title}</h2><span>{count}</span>{action}</header>}
      {children}
    </section>
  );
}

function DataTable({ loading, error, empty, rowCount, children }) {
  if (error) return <div className="panel-state error">{error}</div>;
  return (
    <div className="table-wrap">
      <table>{children}</table>
      {loading && <div className="panel-state">Loading...</div>}
      {!loading && rowCount === 0 && <div className="panel-state">{empty}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || 'N/A').replaceAll('_', ' ');
  return <span className={`status-badge ${normalized.toLowerCase().replaceAll(' ', '-')}`}>{normalized}</span>;
}

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then((result) => setUser(result.user)).catch(() => clearToken());
  }, []);

  useEffect(() => {
    if (!user) return;
    api('/notifications/unread-count').then((result) => setUnreadCount(result.count)).catch(() => setUnreadCount(0));
  }, [user]);

  if (!user) return <Login onLogin={setUser} />;

  const pages = {
    dashboard: <Dashboard setView={setView} user={user} />,
    visitors: <VisitorsPage />,
    events: <EventsPage />,
    incidents: <IncidentsPage />,
    users: user.role === 'admin' ? <UsersPage /> : <Dashboard setView={setView} user={user} />,
  };

  return (
    <main className="app-shell">
      <Header user={user} unreadCount={unreadCount} setView={setView} onLogout={() => { clearToken(); setUser(null); }} />
      {pages[view] || pages.dashboard}
      <footer>Technical Issues? Contact: parminders@americanam.org</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api, errorMessage } from '../api';
import { Modal } from './Modal';
import type { AdminDashboard, AdminItem, AdminPage, User } from '../types';

type Tab = 'dashboard' | 'users' | 'areas' | 'ratings' | 'incidents' | 'audit';
const tabs: Tab[] = ['dashboard', 'users', 'areas', 'ratings', 'incidents', 'audit'];
const human = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replaceAll('_', ' ');

/** The UI reflects capabilities, but every admin read/write is independently authorized by the API. */
export function Admin({
  user,
  onClose,
  onChange,
}: {
  user: User;
  onClose: () => void;
  onChange: () => void;
}) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [rows, setRows] = useState<AdminPage | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminItem | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        if (tab === 'dashboard')
          setDashboard(
            await api<AdminDashboard>('/admin/dashboard', { signal: controller.signal }),
          );
        else {
          const params = new URLSearchParams({ page: String(page), limit: '20' });
          if (tab !== 'audit') {
            params.set('q', search);
            if (status) params.set('status', status);
          }
          setRows(await api<AdminPage>(`/admin/${tab}?${params}`, { signal: controller.signal }));
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(errorMessage(failure));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [tab, search, status, page, version]);
  const chooseTab = (next: Tab) => {
    setTab(next);
    setQuery('');
    setSearch('');
    setStatus('');
    setPage(1);
    setRows(null);
    setSelected(null);
    setNotice('');
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(query);
    setPage(1);
  };
  const nextStatus = (item: AdminItem) =>
    item.status === 'ACTIVE' ? (tab === 'users' ? 'SUSPENDED' : 'HIDDEN') : 'ACTIVE';
  const actionLabel = (item: AdminItem) =>
    tab === 'users'
      ? item.status === 'ACTIVE'
        ? 'Suspend account'
        : 'Reactivate account'
      : item.status === 'ACTIVE'
        ? 'Hide content'
        : 'Restore content';
  const moderate = useCallback(
    async (item: AdminItem) => {
      if (reason.trim().length < 5) {
        setError('Give a moderation reason of at least 5 characters.');
        return;
      }
      setPending(true);
      setError('');
      try {
        const newStatus =
          item.status === 'ACTIVE' ? (tab === 'users' ? 'SUSPENDED' : 'HIDDEN') : 'ACTIVE';
        await api(`/admin/${tab}/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus, reason: reason.trim() }),
        });
        setNotice('Moderation saved. This action is recorded in the audit trail.');
        setSelected(null);
        setReason('');
        setVersion((value) => value + 1);
        onChange();
      } catch (failure) {
        setError(errorMessage(failure));
      } finally {
        setPending(false);
      }
    },
    [onChange, reason, tab],
  );
  return (
    <Modal title="Community moderation" onClose={onClose} wide>
      <div className="admin-intro">
        <ShieldCheck size={18} />
        <p>A thoughtful community starts with accountable moderation. Every change is audited.</p>
      </div>
      <nav className="admin-tabs" aria-label="Admin sections">
        {tabs.map((value) => (
          <button
            key={value}
            className={tab === value ? 'active' : ''}
            aria-current={tab === value ? 'page' : undefined}
            onClick={() => chooseTab(value)}
          >
            {value === 'dashboard' ? (
              <LayoutDashboard size={16} />
            ) : value === 'users' ? (
              <Users size={16} />
            ) : value === 'audit' ? (
              <ClipboardList size={16} />
            ) : null}
            {human(value)}
          </button>
        ))}
      </nav>
      {notice && (
        <p className="success" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
          <button className="text-button" onClick={() => setVersion((value) => value + 1)}>
            Retry
          </button>
        </p>
      )}
      {tab !== 'dashboard' && tab !== 'audit' && (
        <form className="admin-filters" onSubmit={submitSearch}>
          <label className="search-input">
            <Search size={17} />
            <input
              aria-label={`Search ${tab}`}
              placeholder={`Search ${tab}…`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button className="button secondary" type="submit">
            Search
          </button>
          <label className="visually-hidden" htmlFor="admin-status">
            Filter by status
          </label>
          <select
            id="admin-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value={tab === 'users' ? 'SUSPENDED' : 'HIDDEN'}>
              {tab === 'users' ? 'Suspended' : 'Hidden'}
            </option>
          </select>
        </form>
      )}
      {loading && (
        <p className="loading-state" role="status">
          Loading {tab}…
        </p>
      )}
      {!loading && tab === 'dashboard' && dashboard && (
        <>
          <div className="stat-grid">
            {(['users', 'areas', 'ratings', 'incidents'] as const).map((key) => (
              <article className="stat-card" key={key}>
                <span>{human(key)}</span>
                <strong>{dashboard[key].toLocaleString()}</strong>
              </article>
            ))}
          </div>
          <h3>Reporting overview</h3>
          <div className="stat-detail">
            {Object.entries(dashboard.statistics).map(([key, value]) => (
              <div key={key}>
                <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                <strong>{value ?? '—'}</strong>
              </div>
            ))}
          </div>
          <h3>Recent activity</h3>
          {dashboard.recentActivity.length ? (
            <ul className="activity-list">
              {dashboard.recentActivity.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.action
                      ? human(item.action)
                      : item.user?.name || item.name || 'Community experience'}
                    {item.entityType ? ` · ${human(item.entityType)}` : ''}
                    {item.comment ? ` · ${item.comment}` : ''}
                  </span>
                  <time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No recent activity yet.</p>
          )}
        </>
      )}
      {!loading && tab !== 'dashboard' && rows && (
        <>
          <div className="table-scroll">
            <table className="admin-table">
              <caption>
                {human(tab)} · {rows.total} {rows.total === 1 ? 'record' : 'records'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{tab === 'audit' ? 'Action' : 'Record'}</th>
                  <th scope="col">Details</th>
                  <th scope="col">{tab === 'audit' ? 'When' : 'Status'}</th>
                  {tab !== 'audit' && <th scope="col">Review</th>}
                </tr>
              </thead>
              <tbody>
                {rows.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.name ||
                          (item.category
                            ? human(item.category)
                            : item.action
                              ? human(item.action)
                              : item.user?.name || `Rating ${item.score ?? ''}`)}
                      </strong>
                      <small>{item.email || item.id.slice(0, 12)}</small>
                    </td>
                    <td>
                      {item.comment ||
                        item.description ||
                        item.otherType ||
                        item.reason ||
                        item.area?.name ||
                        item.role ||
                        '—'}
                      {item.score !== undefined && (
                        <span className="table-score">{item.score} / 10</span>
                      )}
                      {tab === 'audit' && (
                        <small>
                          {item.actor?.name} · {item.entityType} · {item.entityId}
                        </small>
                      )}
                    </td>
                    <td>
                      {tab === 'audit' ? (
                        item.createdAt ? (
                          new Date(item.createdAt).toLocaleString()
                        ) : (
                          '—'
                        )
                      ) : (
                        <span className={`status-pill ${item.status === 'ACTIVE' ? 'active' : ''}`}>
                          {item.status ? human(item.status) : 'Unknown'}
                        </span>
                      )}
                    </td>
                    {tab !== 'audit' && (
                      <td>
                        <button
                          className="button secondary small-button"
                          onClick={() => {
                            setSelected(item);
                            setReason('');
                            setError('');
                          }}
                          aria-label={`Review ${item.name || item.category || item.id}`}
                        >
                          <Eye size={15} />
                          Review
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.items.length === 0 && (
            <p className="empty-state">No records match these filters.</p>
          )}
          <div className="pagination">
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <ArrowLeft size={18} />
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(rows.total / rows.limit))}
            </span>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={page * rows.limit >= rows.total}
              onClick={() => setPage((value) => value + 1)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
      {selected && (
        <section className="moderation-review" aria-label="Review selected record">
          <div>
            <h3>{selected.name || selected.category || 'Review content'}</h3>
            <button className="text-button" onClick={() => setSelected(null)}>
              Close review
            </button>
          </div>
          <p>
            {selected.comment ||
              selected.description ||
              selected.otherType ||
              selected.email ||
              'Review the information before changing visibility.'}
          </p>
          {selected.geometry && <PolygonPreview geometry={selected.geometry} />}
          <dl className="record-meta">
            <dt>Record ID</dt>
            <dd>{selected.id}</dd>
            <dt>Created</dt>
            <dd>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</dd>
            <dt>Current status</dt>
            <dd>{selected.status}</dd>
          </dl>
          <label>
            Moderation reason
            <textarea
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={5}
              maxLength={1000}
              placeholder="Why is this action appropriate?"
            />
          </label>
          <p className="small muted">
            New status: {nextStatus(selected)}. Content is retained for accountability.
          </p>
          <button
            className="button primary"
            disabled={
              pending || (tab === 'users' && (selected.id === user.id || selected.role === 'ADMIN'))
            }
            onClick={() => void moderate(selected)}
          >
            {nextStatus(selected) === 'ACTIVE' ? <Eye size={16} /> : <EyeOff size={16} />}
            {pending ? 'Saving…' : actionLabel(selected)}
          </button>
          {tab === 'users' && selected.role === 'ADMIN' && (
            <p className="small muted">Administrator accounts are protected from suspension.</p>
          )}
        </section>
      )}
    </Modal>
  );
}

function PolygonPreview({ geometry }: { geometry: NonNullable<AdminItem['geometry']> }) {
  const points = geometry.coordinates[0] || [];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const preview = points
    .map(
      ([x, y]) =>
        `${20 + ((x - minX) / (maxX - minX || 1)) * 260},${160 - ((y - minY) / (maxY - minY || 1)) * 140}`,
    )
    .join(' ');
  return (
    <figure className="polygon-preview">
      <svg viewBox="0 0 300 180" role="img" aria-label="Selected area polygon boundary">
        <polygon points={preview} fill="#d3ece3" stroke="#157765" strokeWidth="2" />
      </svg>
      <figcaption>Polygon boundary (north up)</figcaption>
      <details>
        <summary>Inspect coordinates</summary>
        <pre>{JSON.stringify(geometry.coordinates, null, 2)}</pre>
      </details>
    </figure>
  );
}

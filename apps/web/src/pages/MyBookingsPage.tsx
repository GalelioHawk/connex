import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import dayjs from 'dayjs';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#4D96FF', completed: 'var(--accent)', cancelled: 'var(--warning)', no_show: 'var(--danger)',
};

export default function MyBookingsPage() {
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const bookings = useQuery(api.eduBookings.listMyBookings, { sessionId: sid });
  const now = Date.now();
  const filtered = (bookings ?? []).filter((b) =>
    filter === 'upcoming' ? b.scheduled_at >= now && b.status === 'scheduled' : b.scheduled_at < now || b.status !== 'scheduled',
  );

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 720 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Bookings</h1>
        <div className="row" style={{ margin: '18px 0' }}>
          {(['upcoming', 'past'] as const).map((f) => (
            <button key={f} className={`chip ${filter === f ? 'active' : ''}`} style={{ textTransform: 'capitalize' }} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        {bookings === undefined ? <p className="secondary">Loading...</p> : filtered.length === 0 ? (
          <p className="secondary">No {filter} bookings.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map((item) => (
              <Link key={item.id} to={`/tutoring/bookings/${item.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'var(--text)' }}>
                <div>
                  <strong>{item.student_name}</strong>
                  <p className="secondary" style={{ margin: '4px 0 0' }}>{dayjs(item.scheduled_at).format('ddd D MMM, HH:mm')} · {item.duration_minutes}min{item.subject_code ? ` · ${item.subject_code}` : ''}</p>
                </div>
                <span style={{ color: STATUS_COLOR[item.status], fontWeight: 900, textTransform: 'capitalize' }}>{item.status.replace('_', ' ')}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

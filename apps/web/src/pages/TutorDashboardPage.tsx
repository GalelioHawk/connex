import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import dayjs from 'dayjs';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

export default function TutorDashboardPage() {
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;

  const bookings = useQuery(api.eduBookings.listMyBookings, { sessionId: sid });
  const students = useQuery(api.eduBookings.listMyStudents, { sessionId: sid });
  const ledger = useQuery(api.eduLedger.listMyLedgerSummary, { sessionId: sid });

  const upcoming = bookings?.filter((b) => b.status === 'scheduled') ?? [];

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 720 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>My Tutoring</h1>

        <div className="row" style={{ margin: '18px 0' }}>
          <Link to="/tutoring/bookings/new" className="btn btn-primary">Schedule lesson</Link>
          <Link to="/tutoring/students" className="btn btn-secondary">My students</Link>
          <Link to="/tutoring/homework" className="btn btn-secondary">Homework</Link>
          <Link to="/tutoring/bookings" className="btn btn-secondary">All bookings</Link>
        </div>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Upcoming lessons</h2>
        {bookings === undefined ? <p className="secondary">Loading...</p> : upcoming.length === 0 ? (
          <p className="secondary">Nothing scheduled yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {upcoming.slice(0, 5).map((b, i) => (
              <div key={i} className="card">
                <strong>{b.student_name}</strong>
                <p className="secondary" style={{ margin: '4px 0 0' }}>{dayjs(b.scheduled_at).format('ddd D MMM, HH:mm')} · {b.duration_minutes}min</p>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Who owes what</h2>
        {ledger === undefined ? <p className="secondary">Loading...</p> : students?.length === 0 ? (
          <p className="secondary">Add a student to start tracking payments.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {ledger?.map((row) => (
              <Link key={row.student_id} to={`/tutoring/ledger/${row.student_id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'var(--text)' }}>
                <strong>{row.student_name}</strong>
                <span style={{ color: row.balance_zar > 0 ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 900 }}>
                  {row.balance_zar > 0 ? `Owes R${row.balance_zar}` : 'Paid up'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

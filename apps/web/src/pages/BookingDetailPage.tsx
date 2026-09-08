import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import dayjs from 'dayjs';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;

  const booking = useQuery(api.eduBookings.getBooking, { sessionId: sid, bookingId: bookingId as Id<'bookings'> });
  const updateStatus = useMutation(api.eduBookings.updateBookingStatus);
  const setMeetingLink = useMutation(api.eduBookings.setMeetingLink);
  const [linkInput, setLinkInput] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  async function setStatus(status: 'completed' | 'cancelled' | 'no_show') {
    try {
      await updateStatus({ sessionId: sid, bookingId: bookingId as Id<'bookings'>, status });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update booking.');
    }
  }

  async function saveLink() {
    setSavingLink(true);
    try {
      await setMeetingLink({ sessionId: sid, bookingId: bookingId as Id<'bookings'>, meetingLink: linkInput });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save link.');
    } finally {
      setSavingLink(false);
    }
  }

  if (booking === undefined) return <Layout><div className="container" style={{ padding: 40 }}>Loading...</div></Layout>;
  if (!booking) return null;

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 560 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 18 }}>&larr; Back</button>

        <h1 style={{ fontSize: 24, fontWeight: 900 }}>{booking.is_tutor ? booking.student_name : booking.tutor_name}</h1>
        <p className="secondary">{dayjs(booking.scheduled_at).format('dddd D MMMM, HH:mm')}</p>
        <p className="secondary">{booking.duration_minutes} minutes · {booking.mode}{booking.subject_code ? ` · ${booking.subject_code}` : ''}</p>
        <p style={{ color: 'var(--accent)', fontWeight: 800, textTransform: 'capitalize' }}>{booking.status.replace('_', ' ')}</p>

        <div className="card" style={{ marginTop: 20 }}>
          <strong>Meeting link</strong>
          {booking.meeting_link ? (
            <p style={{ marginTop: 8 }}><a href={booking.meeting_link} target="_blank" rel="noreferrer">{booking.meeting_link}</a></p>
          ) : (
            <p className="secondary" style={{ marginTop: 8 }}>No link added yet.</p>
          )}
          {booking.is_tutor && (
            <div className="row" style={{ marginTop: 10 }}>
              <input className="input" placeholder="https://meet.google.com/..." value={linkInput} onChange={(e) => setLinkInput(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={saveLink} disabled={savingLink}>{savingLink ? 'Saving...' : 'Save link'}</button>
            </div>
          )}
        </div>

        {booking.status === 'scheduled' && booking.is_tutor && (
          <div className="row" style={{ marginTop: 20 }}>
            <button className="btn" style={{ background: 'var(--accent)', color: '#fff' }} onClick={() => setStatus('completed')}>Mark complete</button>
            <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => setStatus('no_show')}>No-show</button>
          </div>
        )}

        {booking.status === 'scheduled' && (
          <button className="btn btn-secondary" style={{ marginTop: 14, color: 'var(--warning)' }} onClick={() => setStatus('cancelled')}>Cancel lesson</button>
        )}
      </div>
    </Layout>
  );
}

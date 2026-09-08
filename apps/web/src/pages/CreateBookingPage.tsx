import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import dayjs from 'dayjs';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

const DAY_OPTIONS = Array.from({ length: 10 }, (_, i) => dayjs().add(i, 'day'));
const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30;
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
});

export default function CreateBookingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;

  const students = useQuery(api.eduBookings.listMyStudents, { sessionId: sid });
  const createBooking = useMutation(api.eduBookings.createBooking);

  const [studentId, setStudentId] = useState<string | undefined>(params.get('studentId') ?? undefined);
  const [subjectCode, setSubjectCode] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState(TIME_OPTIONS[6]);
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState<'online' | 'in_person'>('online');
  const [saving, setSaving] = useState(false);

  const scheduledAt = useMemo(
    () => DAY_OPTIONS[dayIndex].hour(time.hour).minute(time.minute).second(0).millisecond(0),
    [dayIndex, time],
  );

  async function save() {
    if (!studentId) return alert('Choose a student first.');
    setSaving(true);
    try {
      await createBooking({
        sessionId: sid,
        studentId: studentId as Id<'tutorStudents'>,
        subjectCode: subjectCode || undefined,
        scheduledAt: scheduledAt.valueOf(),
        durationMinutes: duration,
        mode,
      });
      navigate('/tutoring');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not create booking.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 560 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Schedule lesson</h1>

        <label className="label">Student</label>
        <div className="row">
          {students?.map((st) => (
            <button key={st.id} className={`chip ${studentId === st.id ? 'active' : ''}`} onClick={() => setStudentId(st.id)}>{st.display_name}</button>
          ))}
        </div>
        {students?.length === 0 && <p className="muted">Add a student first from "My students".</p>}

        <label className="label">Subject (optional)</label>
        <input className="input" placeholder="e.g. mathematics" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />

        <label className="label">Day</label>
        <div className="row" style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 6 }}>
          {DAY_OPTIONS.map((d, i) => (
            <button key={i} className={`chip ${dayIndex === i ? 'active' : ''}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setDayIndex(i)}>
              {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.format('ddd D MMM')}
            </button>
          ))}
        </div>

        <label className="label">Time</label>
        <div className="row" style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 6 }}>
          {TIME_OPTIONS.map((t, i) => {
            const active = t.hour === time.hour && t.minute === time.minute;
            const label = `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
            return <button key={i} className={`chip ${active ? 'active' : ''}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setTime(t)}>{label}</button>;
          })}
        </div>

        <label className="label">Duration</label>
        <div className="row">
          {[30, 45, 60, 90].map((mins) => (
            <button key={mins} className={`chip ${duration === mins ? 'active' : ''}`} onClick={() => setDuration(mins)}>{mins}min</button>
          ))}
        </div>

        <label className="label">Mode</label>
        <div className="row">
          {(['online', 'in_person'] as const).map((m) => (
            <button key={m} className={`chip ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>{m === 'online' ? 'Online' : 'In-person'}</button>
          ))}
        </div>

        <p className="secondary" style={{ marginTop: 18 }}>{scheduledAt.format('dddd D MMMM, HH:mm')}</p>

        <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Schedule lesson'}
        </button>
      </div>
    </Layout>
  );
}

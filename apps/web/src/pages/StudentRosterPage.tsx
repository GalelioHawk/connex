import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

export default function StudentRosterPage() {
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;

  const students = useQuery(api.eduBookings.listMyStudents, { sessionId: sid });
  const addStudent = useMutation(api.eduBookings.addStudent);
  const updateStudent = useMutation(api.eduBookings.updateStudent);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fee, setFee] = useState('500');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return alert("Enter the student's name.");
    setSaving(true);
    try {
      await addStudent({ sessionId: sid, displayName: name, contactPhone: phone || undefined, monthlyFeeZar: fee ? Number(fee) : undefined });
      setName(''); setPhone(''); setFee('500'); setOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not add student.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePause(id: string, status: string) {
    await updateStudent({ sessionId: sid, studentId: id as Id<'tutorStudents'>, status: status === 'active' ? 'paused' : 'active' });
  }

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>My students</h1>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>Add student</button>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          {students === undefined && <p className="secondary">Loading...</p>}
          {students?.length === 0 && <p className="secondary">No students yet.</p>}
          {students?.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                <strong>{item.display_name}</strong>
                <p className="secondary" style={{ margin: '4px 0 0' }}>
                  {item.monthly_fee_zar ? `R${item.monthly_fee_zar}/month` : 'No fee set'}{item.contact_phone ? ` · ${item.contact_phone}` : ''}
                </p>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Link className="btn btn-secondary" to={`/tutoring/bookings/new?studentId=${item.id}`}>Schedule</Link>
                <Link className="btn btn-secondary" to={`/tutoring/homework/new?studentId=${item.id}`}>Homework</Link>
                <Link className="btn btn-secondary" to={`/tutoring/ledger/${item.id}`}>Ledger</Link>
                <button className="btn btn-secondary" onClick={() => togglePause(item.id, item.status)}>{item.status === 'active' ? 'Pause' : 'Resume'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setOpen(false)}>
          <div className="card" style={{ maxWidth: 400, width: '100%', background: 'var(--bg)' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Add a student</h2>
            <input className="input" placeholder="Student name" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 10 }} />
            <input className="input" placeholder="Contact number (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginBottom: 10 }} />
            <input className="input" placeholder="Monthly fee (ZAR)" type="number" value={fee} onChange={(e) => setFee(e.target.value)} style={{ marginBottom: 14 }} />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Add student'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

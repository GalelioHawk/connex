import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import dayjs from 'dayjs';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

type EntryModal = 'payment' | 'charge' | null;

export default function StudentLedgerPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;
  const myTutorProfile = useQuery(api.eduBookings.myTutorProfile, { sessionId: sid });
  const isTutor = !!myTutorProfile;

  const ledger = useQuery(api.eduLedger.getStudentLedger, { sessionId: sid, studentId: studentId as Id<'tutorStudents'> });
  const recordPayment = useMutation(api.eduLedger.recordPayment);
  const recordCharge = useMutation(api.eduLedger.recordCharge);

  const [modal, setModal] = useState<EntryModal>(null);
  const [amount, setAmount] = useState('500');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!amount || Number(amount) <= 0) return alert('Amount must be more than 0.');
    setSaving(true);
    try {
      if (modal === 'payment') {
        await recordPayment({ sessionId: sid, studentId: studentId as Id<'tutorStudents'>, amountZar: Number(amount), description: description || undefined, method: 'cash' });
      } else if (modal === 'charge') {
        await recordCharge({ sessionId: sid, studentId: studentId as Id<'tutorStudents'>, amountZar: Number(amount), description: description || 'Tuition charge' });
      }
      setAmount('500'); setDescription(''); setModal(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 560 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 18 }}>&larr; Back</button>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>{ledger?.student_name ?? 'Ledger'}</h1>

        <div className="card center" style={{ marginTop: 16 }}>
          <p className="secondary" style={{ margin: 0 }}>Balance</p>
          <p style={{ color: (ledger?.balance_zar ?? 0) > 0 ? 'var(--warning)' : 'var(--accent)', fontSize: 30, fontWeight: 900, margin: '4px 0' }}>
            R{ledger?.balance_zar ?? 0}
          </p>
          <p className="muted" style={{ margin: 0 }}>{(ledger?.balance_zar ?? 0) > 0 ? 'Outstanding' : 'Fully paid'}</p>
        </div>

        {isTutor && (
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => setModal('payment')}>Log payment</button>
            <button className="btn btn-secondary" onClick={() => setModal('charge')}>Add charge</button>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          {ledger === undefined && <p className="secondary">Loading...</p>}
          {ledger?.entries.length === 0 && <p className="secondary center">No entries yet.</p>}
          {ledger?.entries.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
              <div>
                <strong>{item.description}</strong>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: 12 }}>{dayjs(item.recorded_at).format('D MMM YYYY')}</p>
              </div>
              <span style={{ color: item.type === 'charge' ? 'var(--warning)' : 'var(--accent)', fontWeight: 900 }}>
                {item.type === 'charge' ? '+' : '-'}R{item.amount_zar}
              </span>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setModal(null)}>
          <div className="card" style={{ maxWidth: 400, width: '100%', background: 'var(--bg)' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{modal === 'payment' ? 'Log payment received' : 'Add a charge'}</h2>
            <input className="input" placeholder="Amount (ZAR)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginBottom: 10 }} />
            <input className="input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginBottom: 14 }} />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

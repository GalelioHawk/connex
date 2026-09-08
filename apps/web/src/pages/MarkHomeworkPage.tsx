import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

export default function MarkHomeworkPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;

  const detail = useQuery(api.eduHomework.getHomeworkDetail, { sessionId: sid, assignmentId: assignmentId as Id<'homeworkAssignments'> });
  const markHomework = useMutation(api.eduHomework.markHomework);

  const [score, setScore] = useState('');
  const [max, setMax] = useState('10');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!score || !max) return alert('Enter a score.');
    setSaving(true);
    try {
      await markHomework({ sessionId: sid, assignmentId: assignmentId as Id<'homeworkAssignments'>, markScore: Number(score), markMax: Number(max), markFeedback: feedback || undefined });
      navigate(`/tutoring/homework/${assignmentId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save mark.');
    } finally {
      setSaving(false);
    }
  }

  if (detail === undefined) return <Layout><div className="container" style={{ padding: 40 }}>Loading...</div></Layout>;
  if (!detail?.submission) return null;

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 480 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 18 }}>&larr; Back</button>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Mark: {detail.title}</h1>
        <p className="secondary">{detail.student_name}</p>
        {detail.submission.text_answer && <p style={{ marginTop: 12 }}>{detail.submission.text_answer}</p>}
        {detail.submission.file_url && <p><a href={detail.submission.file_url} target="_blank" rel="noreferrer">View submitted file</a></p>}

        <label className="label">Score</label>
        <div className="row" style={{ alignItems: 'center' }}>
          <input className="input" style={{ maxWidth: 100, textAlign: 'center' }} type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="8" />
          <span>/</span>
          <input className="input" style={{ maxWidth: 100, textAlign: 'center' }} type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder="10" />
        </div>

        <label className="label">Feedback (optional)</label>
        <textarea className="input" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="What did they do well? What to improve?" />

        <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save mark'}</button>
      </div>
    </Layout>
  );
}

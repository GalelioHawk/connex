import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

export default function AssignHomeworkPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;

  const students = useQuery(api.eduBookings.listMyStudents, { sessionId: sid });
  const assignHomework = useMutation(api.eduHomework.assignHomework);

  const [studentId, setStudentId] = useState<string | undefined>(params.get('studentId') ?? undefined);
  const [subjectCode, setSubjectCode] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!studentId) return alert('Choose a student.');
    if (!title.trim() || !instructions.trim()) return alert('Add a title and instructions.');
    setSaving(true);
    try {
      await assignHomework({ sessionId: sid, studentId: studentId as Id<'tutorStudents'>, subjectCode: subjectCode || undefined, title, instructions });
      navigate('/tutoring/homework');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not assign homework.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 560 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Assign homework</h1>

        <label className="label">Student</label>
        <div className="row">
          {students?.map((st) => (
            <button key={st.id} className={`chip ${studentId === st.id ? 'active' : ''}`} onClick={() => setStudentId(st.id)}>{st.display_name}</button>
          ))}
        </div>

        <label className="label">Subject (optional)</label>
        <input className="input" placeholder="e.g. mathematics" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />

        <label className="label">Title</label>
        <input className="input" placeholder="e.g. Algebra worksheet 3" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="label">Instructions</label>
        <textarea className="input" placeholder="What should the student do?" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5} />

        <button className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} onClick={save} disabled={saving}>{saving ? 'Assigning...' : 'Assign homework'}</button>
      </div>
    </Layout>
  );
}

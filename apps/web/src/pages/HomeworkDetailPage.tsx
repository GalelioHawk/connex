import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import dayjs from 'dayjs';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

export default function HomeworkDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;

  const detail = useQuery(api.eduHomework.getHomeworkDetail, { sessionId: sid, assignmentId: assignmentId as Id<'homeworkAssignments'> });
  const generateUploadUrl = useMutation(api.eduHomework.generateHomeworkUploadUrl);
  const submitHomework = useMutation(api.eduHomework.submitHomework);

  const [textAnswer, setTextAnswer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file && !textAnswer.trim()) return alert('Attach a file or type an answer.');
    setSubmitting(true);
    try {
      let storageId: string | undefined;
      if (file) {
        const uploadUrl = await generateUploadUrl({ sessionId: sid });
        const uploadRes = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
        if (!uploadRes.ok) throw new Error('Upload failed');
        ({ storageId } = await uploadRes.json());
      }
      await submitHomework({
        sessionId: sid,
        assignmentId: assignmentId as Id<'homeworkAssignments'>,
        storageId: storageId as Id<'_storage'> | undefined,
        textAnswer: textAnswer || undefined,
      });
      setFile(null);
      setTextAnswer('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  }

  if (detail === undefined) return <Layout><div className="container" style={{ padding: 40 }}>Loading...</div></Layout>;
  if (!detail) return null;

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 560 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 18 }}>&larr; Back</button>

        <h1 style={{ fontSize: 22, fontWeight: 900 }}>{detail.title}</h1>
        <p className="secondary">{detail.is_tutor ? detail.student_name : detail.tutor_name}{detail.subject_code ? ` · ${detail.subject_code}` : ''}</p>
        {detail.due_at && <p className="muted">Due {dayjs(detail.due_at).format('D MMM, HH:mm')}</p>}
        <p style={{ lineHeight: 1.6, marginTop: 14 }}>{detail.instructions}</p>
        {detail.attachment_url && <p><a href={detail.attachment_url} target="_blank" rel="noreferrer">View attachment</a></p>}

        {detail.submission ? (
          <div className="card" style={{ marginTop: 20 }}>
            <strong>Submission</strong>
            <p className="secondary">Submitted {dayjs(detail.submission.submitted_at).format('D MMM, HH:mm')}</p>
            {detail.submission.text_answer && <p style={{ marginTop: 8 }}>{detail.submission.text_answer}</p>}
            {detail.submission.file_url && <p><a href={detail.submission.file_url} target="_blank" rel="noreferrer">View submitted file</a></p>}
            {detail.submission.marked_at ? (
              <div style={{ marginTop: 12 }}>
                <strong>Mark: {detail.submission.mark_score}/{detail.submission.mark_max}</strong>
                {detail.submission.mark_feedback && <p className="secondary" style={{ marginTop: 4 }}>{detail.submission.mark_feedback}</p>}
              </div>
            ) : detail.is_tutor ? (
              <Link className="btn" style={{ background: 'var(--accent)', color: '#fff', marginTop: 12 }} to={`/tutoring/homework/${assignmentId}/mark`}>Mark this submission</Link>
            ) : (
              <p className="muted" style={{ marginTop: 8 }}>Waiting to be marked.</p>
            )}
          </div>
        ) : !detail.is_tutor ? (
          <div style={{ marginTop: 24 }}>
            <strong>Submit your work</strong>
            <textarea className="input" placeholder="Type your answer (optional if attaching a file)" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} rows={4} style={{ marginTop: 10 }} />
            <input ref={fileInputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ marginTop: 10 }} />
            <button className="btn btn-primary" style={{ marginTop: 14, width: '100%' }} onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit homework'}</button>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 20 }}>Not submitted yet.</p>
        )}
      </div>
    </Layout>
  );
}

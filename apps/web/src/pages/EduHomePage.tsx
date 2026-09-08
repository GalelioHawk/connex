import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

type EduTab = 'papers' | 'notes' | 'tutors' | 'help';

export default function EduHomePage() {
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;
  const [tab, setTab] = useState<EduTab>('papers');
  const [grade, setGrade] = useState(12);
  const [search, setSearch] = useState('');
  const [openPaper, setOpenPaper] = useState<any | null>(null);
  const [openNote, setOpenNote] = useState<any | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [qTitle, setQTitle] = useState('');
  const [qBody, setQBody] = useState('');

  const subjects = useQuery(api.edu.listSubjects, { sessionId: sid, grade });
  const papers = useQuery(api.edu.listPapers, { sessionId: sid, grade, search: search || undefined });
  const notes = useQuery(api.eduNotes.listNotes, { sessionId: sid, grade, search: search || undefined });
  const tutors = useQuery(api.eduTutors.listTutors, { sessionId: sid, grade, search: search || undefined });
  const helpPosts = useQuery(api.eduHelp.listPosts, { sessionId: sid, grade, search: search || undefined, filter: 'all' });
  const stats = useQuery(api.edu.getStats, { sessionId: sid, grade });
  const myTutorProfile = useQuery(api.eduBookings.myTutorProfile, { sessionId: sid });
  const myBookings = useQuery(api.eduBookings.listMyBookings, { sessionId: sid });
  const recordRecent = useMutation(api.edu.recordRecentView);
  const requestTutor = useMutation(api.eduTutors.requestTutor);
  const createQuestion = useMutation(api.eduHelp.createPost);

  const selectedSubject = useMemo(() => subjects?.[0], [subjects]);

  async function handleOpenPaper(item: any) {
    if (!item.pdf_url) return alert("This paper is catalogued, but its source link hasn't been added yet.");
    await recordRecent({ sessionId: sid, itemType: 'paper', itemId: item.id, title: item.subject_name, subtitle: `${item.year} ${item.session ?? ''}`.trim() });
    setOpenPaper(item);
  }

  async function handleContactTutor(tutorId: string) {
    try {
      const result = await requestTutor({ sessionId: sid, tutorId: tutorId as Id<'eduTutors'> });
      alert(result.already_requested ? 'Already requested — waiting for a response.' : 'Request sent to the tutor.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not send request.');
    }
  }

  async function submitQuestion() {
    const subject = selectedSubject;
    if (!subject) return alert('No subjects loaded for this grade yet.');
    try {
      await createQuestion({ sessionId: sid, grade, subjectCode: subject.code, subjectName: subject.name, title: qTitle, body: qBody });
      setQTitle(''); setQBody(''); setAskOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not post question.');
    }
  }

  const data = tab === 'papers' ? papers : tab === 'notes' ? notes : tab === 'tutors' ? tutors : helpPosts;

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px' }}>
        {myTutorProfile ? (
          <Link to="/tutoring" className="btn" style={{ background: 'var(--accent)', color: '#fff', width: '100%', marginBottom: 18, padding: 16 }}>
            My Tutoring Dashboard →
          </Link>
        ) : myBookings && myBookings.length > 0 ? (
          <Link to="/tutoring" className="btn" style={{ background: 'var(--accent)', color: '#fff', width: '100%', marginBottom: 18, padding: 16 }}>
            My Lessons & Homework →
          </Link>
        ) : null}

        <div className="row" style={{ marginBottom: 14 }}>
          {[10, 11, 12].map((g) => (
            <button key={g} className={`chip ${grade === g ? 'active' : ''}`} onClick={() => setGrade(g)}>Grade {g}</button>
          ))}
        </div>

        <input className="input" placeholder={`Search ${tab}`} value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 14 }} />

        <div className="row" style={{ marginBottom: 14 }}>
          <Stat value={stats?.question_papers ?? 0} label="Papers" />
          <Stat value={stats?.notes ?? 0} label="Notes" />
          <Stat value={stats?.tutors ?? 0} label="Tutors" />
          <Stat value={stats?.open_questions ?? 0} label="Questions" />
        </div>

        <div className="row" style={{ marginBottom: 20 }}>
          {(['papers', 'notes', 'tutors', 'help'] as EduTab[]).map((t) => (
            <button key={t} className={`chip ${tab === t ? 'active' : ''}`} style={{ textTransform: 'capitalize' }} onClick={() => setTab(t)}>{t}</button>
          ))}
          {tab === 'help' && <button className="btn btn-primary" onClick={() => setAskOpen(true)} style={{ marginLeft: 'auto' }}>Ask a question</button>}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {data === undefined && <p className="secondary">Loading...</p>}
          {data?.length === 0 && <p className="secondary">No {tab} found. Try another grade or search.</p>}

          {tab === 'papers' && papers?.map((item: any) => (
            <div key={item.id} className="card" style={{ cursor: 'pointer' }} onClick={() => handleOpenPaper(item)}>
              <strong>{item.subject_name}</strong>
              <p className="secondary" style={{ margin: '4px 0 0' }}>{item.year} · {item.session ?? 'Session unknown'}{item.paper_number ? ` · Paper ${item.paper_number}` : ''}</p>
            </div>
          ))}

          {tab === 'notes' && notes?.map((item: any) => (
            <div key={item.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpenNote(item)}>
              <strong>{item.title}</strong>
              <p className="secondary" style={{ margin: '4px 0 0' }}>{item.subject_name} · {item.topic}</p>
            </div>
          ))}

          {tab === 'tutors' && tutors?.map((item: any) => (
            <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              <div>
                <strong>{item.name} {item.verified ? '✓' : ''}</strong>
                <p className="secondary" style={{ margin: '4px 0 0' }}>{item.bio}</p>
                <p style={{ color: 'var(--accent)', margin: '4px 0 0' }}>{item.hourly_rate_zar ? `R${item.hourly_rate_zar}/hour` : 'Community tutor · Free'}</p>
              </div>
              <button className="btn btn-secondary" onClick={() => handleContactTutor(item.id)}>{item.requested ? 'Requested' : 'Contact'}</button>
            </div>
          ))}

          {tab === 'help' && helpPosts?.map((item: any) => (
            <div key={item.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{item.subject_name}</span>
                <span className="muted">{item.status}</span>
              </div>
              <strong style={{ display: 'block', marginTop: 8 }}>{item.title}</strong>
              <p className="secondary" style={{ margin: '6px 0 0' }}>{item.body}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span className="muted">{item.replies_count} replies</span>
                <span className="muted">{item.upvotes} upvotes</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {openPaper && (
        <Modal onClose={() => setOpenPaper(null)} title={openPaper.subject_name}>
          {openPaper.pdf_url ? (
            <iframe src={openPaper.pdf_url} title="Paper" style={{ width: '100%', height: '75vh', border: 'none' }} />
          ) : <p>No file attached yet.</p>}
        </Modal>
      )}

      {openNote && (
        <Modal onClose={() => setOpenNote(null)} title={openNote.title}>
          <p className="secondary">{openNote.subject_name} · {openNote.topic}</p>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{openNote.content}</p>
        </Modal>
      )}

      {askOpen && (
        <Modal onClose={() => setAskOpen(false)} title="Ask the community">
          <input className="input" placeholder="Question title" value={qTitle} onChange={(e) => setQTitle(e.target.value)} style={{ marginBottom: 10 }} />
          <textarea className="input" placeholder="Describe what you need help with" value={qBody} onChange={(e) => setQBody(e.target.value)} rows={5} style={{ marginBottom: 14 }} />
          <button className="btn btn-primary" onClick={submitQuestion}>Post question</button>
        </Modal>
      )}
    </Layout>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: 'center', padding: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '85vh', overflow: 'auto', background: 'var(--bg)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

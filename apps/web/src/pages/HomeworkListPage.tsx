import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api, type Id } from '../convex/api';
import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';

const STATUS_COLOR: Record<string, string> = { assigned: '#4D96FF', submitted: 'var(--warning)', marked: 'var(--accent)' };

export default function HomeworkListPage() {
  const { sessionId } = useAuth();
  const sid = sessionId as Id<'sessions'>;

  const myTutorProfile = useQuery(api.eduBookings.myTutorProfile, { sessionId: sid });
  const isTutor = !!myTutorProfile;
  const tutorHomework = useQuery(api.eduHomework.listHomeworkForTutor, isTutor ? { sessionId: sid } : 'skip');
  const studentHomework = useQuery(api.eduHomework.listHomeworkForStudent, !isTutor ? { sessionId: sid } : 'skip');
  const homework = isTutor ? tutorHomework : studentHomework;

  return (
    <Layout>
      <div className="container" style={{ padding: '30px 20px 80px', maxWidth: 640 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Homework</h1>
        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          {homework === undefined && <p className="secondary">Loading...</p>}
          {homework?.length === 0 && <p className="secondary">No homework yet.</p>}
          {homework?.map((item: any) => (
            <Link key={item.id} to={`/tutoring/homework/${item.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'var(--text)' }}>
              <div>
                <strong>{item.title}</strong>
                <p className="secondary" style={{ margin: '4px 0 0' }}>{isTutor ? item.student_name : item.tutor_name}{item.subject_code ? ` · ${item.subject_code}` : ''}</p>
              </div>
              <span style={{ color: STATUS_COLOR[item.status], fontWeight: 900, textTransform: 'capitalize' }}>{item.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

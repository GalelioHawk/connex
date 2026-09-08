import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function LandingPage() {
  return (
    <Layout>
      <div className="container" style={{ padding: '70px 20px', textAlign: 'center', maxWidth: 640 }}>
        <h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.2 }}>
          Learn, teach, and get paid to tutor — all in one place.
        </h1>
        <p className="secondary" style={{ fontSize: 18, marginTop: 16, lineHeight: 1.6 }}>
          Free DBE past papers, study notes and a help board for every learner — plus a real tutoring
          platform: book lessons, submit homework, get marked, and keep track of payments.
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 30 }}>
          <Link to="/register" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 26px' }}>Get started</Link>
          <Link to="/login" className="btn btn-secondary" style={{ fontSize: 16, padding: '14px 26px' }}>Log in</Link>
        </div>
      </div>
    </Layout>
  );
}

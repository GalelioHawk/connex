import Layout from '../components/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <div className="container" style={{ padding: '50px 20px', maxWidth: 720 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>Built here, for the way life works here.</h1>
        <p className="secondary" style={{ fontSize: 17, lineHeight: 1.7 }}>
          Connex is an African company building one app for the things a day actually demands: talking,
          knowing, learning and staying safe. Power cuts shape business, school and safety here. Past
          papers shouldn't sit behind paywalls during exam season. Help should be one hold of a button
          away.
        </p>
        <h2 style={{ marginTop: 30 }}>Connex Edu</h2>
        <p className="secondary" style={{ lineHeight: 1.7 }}>
          Free DBE past papers, study notes and a learner help board — plus a real tutoring platform:
          book lessons, submit homework, get marked, and keep track of payments, all in one place.
          Education stays free where it always has: past papers, notes and the help board never go
          behind a paywall.
        </p>
        <h2 style={{ marginTop: 30 }}>What we stand for</h2>
        <ul className="secondary" style={{ lineHeight: 1.9 }}>
          <li><strong style={{ color: 'var(--text)' }}>Safety first</strong> — the SOS button is a core feature, not an add-on.</li>
          <li><strong style={{ color: 'var(--text)' }}>Education stays free</strong> — a learner's budget should never decide their marks.</li>
          <li><strong style={{ color: 'var(--text)' }}>Community powered</strong> — alerts come from the people who live there.</li>
          <li><strong style={{ color: 'var(--text)' }}>Privacy by design</strong> — collect the minimum, encrypt what's collected, sell nothing.</li>
          <li><strong style={{ color: 'var(--text)' }}>Honest releases</strong> — we say plainly what's live, what's early and what's still a plan.</li>
        </ul>
      </div>
    </Layout>
  );
}

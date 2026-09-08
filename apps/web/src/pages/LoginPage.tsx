import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(phone, password);
      navigate('/edu');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container" style={{ padding: '60px 20px', maxWidth: 400 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Log in</h1>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
          <input className="input" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          <input className="input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Logging in...' : 'Log in'}</button>
        </form>
        <p className="secondary" style={{ marginTop: 16 }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </Layout>
  );
}

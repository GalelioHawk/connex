import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, phone, password);
      navigate('/edu');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="container" style={{ padding: '60px 20px', maxWidth: 400 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>Create your account</h1>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
          <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <input className="input" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          <input className="input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="secondary" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </Layout>
  );
}

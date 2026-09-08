import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <Link to="/" style={{ textDecoration: 'none', fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
            Connex <span style={{ color: 'var(--accent)' }}>Edu</span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {user ? (
              <>
                <Link to="/edu">Edu</Link>
                <Link to="/tutoring">My Tutoring</Link>
                <button className="btn btn-secondary" onClick={() => { logout(); navigate('/'); }}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/about">About</Link>
                <Link to="/login">Log in</Link>
                <Link to="/register" className="btn btn-primary">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer style={{ borderTop: '1px solid var(--border)', padding: '20px 0', marginTop: 40 }}>
        <div className="container secondary" style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
          <span>&copy; {new Date().getFullYear()} Connex</span>
          <a href="/contact.html">Contact</a>
          <a href="/privacy.html">Privacy</a>
          <a href="/terms.html">Terms</a>
          <a href="/security.html">Security</a>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function RequireAuth({ children }: { children: React.ReactElement }) {
  const { sessionId, loading } = useAuth();
  if (loading) return null;
  if (!sessionId) return <Navigate to="/login" replace />;
  return children;
}

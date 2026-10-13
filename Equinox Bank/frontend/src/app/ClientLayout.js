'use client';
import { AuthProvider } from '@/lib/AuthContext';

export default function ClientLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

'use client';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export default function SessionProvider({ children }: any) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/database';
import { UserTableRow } from '@/lib/database/schema';
import { sql } from 'drizzle-orm';
import { compareString } from '@/lib/helpers/encrypt';

export const { handler, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.get<UserTableRow>(sql`
          SELECT id, email, username, password
          FROM users
          WHERE email = ${credentials.email}
        `);

        if (!user) return null;

        const isValid = await compareString(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: String(user.id),
          email: user.email,
          username: user.username,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 365,
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 365,
  },

  pages: {
    signIn: '/auth/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string; // <-- FIX
      }

      return session;
    },
  },
});

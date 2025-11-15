import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/database';
import { UserTableRow } from '@/lib/database/schema';
import { sql } from 'drizzle-orm';
import { compareString } from '@/lib/helpers/encrypt';

const handler = NextAuth({
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
          SELECT id, email, password
          FROM users
          WHERE email = ${credentials.email}
        `);

        if (!user) {
          return null;
        }

        const isValid = await compareString(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

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
    maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 365, // optional, sync JWT expiry with session
  },

  pages: {
    signIn: '/auth/login', // your existing login page
  },

  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }

      return token;
    },
    async session({ session, token }) {
      // Only mutate if both exist
      if (session?.user && token?.id) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };

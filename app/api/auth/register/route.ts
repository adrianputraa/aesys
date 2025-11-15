import { sendApiResponse, getApiPostBody } from '@/lib/api';
import { db } from '@/lib/database';
import { NextRequest } from 'next/server';
import { hashString } from '@/lib/helpers/encrypt';
import { sql } from 'drizzle-orm';
import { usersTable } from '@/lib/database/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await getApiPostBody<ApiAuthRegisterPayload>(req);
    if (!body) {
      return sendApiResponse(400);
    }

    // check for all key
    const requiredKeys: (keyof ApiAuthRegisterPayload)[] = ['username', 'email', 'password', 'confirmPassword'];
    const missing = requiredKeys.filter((key) => !body[key]);
    if (missing.length > 0) {
      return sendApiResponse(400, null, `Missing keys: ${missing.join(', ')}`);
    }

    const { email, username, password, confirmPassword } = body;
    if (password !== confirmPassword) {
      return sendApiResponse(400, null, 'Password does not match.');
    }

    const exists = await db.get<{ id: number; email: string }>(sql`
      SELECT id, email
      FROM users
      WHERE email = ${body.email} OR username = ${body.username}
    `);

    if (exists) {
      return sendApiResponse(409, null, 'Already registered.');
    }

    const hashedPassword = await hashString(password);
    const result = await db.transaction(
      async (tx) => {
        const user = await tx
          .insert(usersTable)
          .values({
            email,
            username,
            password: hashedPassword,
          })
          .returning({
            id: usersTable.id,
            email: usersTable.email,
          });

        return user;
      },
      {
        behavior: 'deferred',
      }
    );

    return sendApiResponse(200, result);
  } catch (error: any) {
    console.error(error);
    return sendApiResponse(500, null, JSON.stringify(error.message));
  }
}

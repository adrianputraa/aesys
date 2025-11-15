import { getApiPostBody, sendApiResponse } from '@/lib/api';
import { db } from '@/lib/database';
import { usersTable } from '@/lib/database/schema';
import { or, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await getApiPostBody<ApiAuthCheckDataPayload>(req);
    if (!body) {
      return sendApiResponse(400);
    }

    const { email, username } = body;
    if (!email && !username) {
      return sendApiResponse(400);
    }

    const queryConditions = [
      email ? eq(usersTable.email, email) : undefined,
      username ? eq(usersTable.username, username) : undefined,
    ].filter((x) => !!x);

    const result = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(or(...queryConditions));

    return sendApiResponse(200, result satisfies ApiAuthCheckDataResult);
  } catch (error) {
    console.error(error);
    return sendApiResponse(500);
  }
}

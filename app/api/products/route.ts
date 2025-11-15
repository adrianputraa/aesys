import { sendApiResponse } from '@/lib/api';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  //   if (!session || !session.user) {
  //     return sendApiResponse(401);
  //   }

  try {
    console.log(session?.user);
    return sendApiResponse(200, session ?? {});
  } catch (error) {
    console.error(error);
    return sendApiResponse(500);
  }
}

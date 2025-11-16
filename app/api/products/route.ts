import { AddProductSchema } from '@/features/administrator/product/add/product';
import { getApiPostBody, getApiSearchParams, sendApiResponse } from '@/lib/api';
import { db } from '@/lib/database';
import { productsTable } from '@/lib/database/schema';
import { and, eq, inArray, InferInsertModel, or, sql, SQL } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) return sendApiResponse(401);

  const idParams = getApiSearchParams(req, 'id');
  const queryParams = getApiSearchParams(req, 'q', 'SINGLE');
  const statusParams = getApiSearchParams(req, 's', 'SINGLE');
  const categoryIdParam = getApiSearchParams(req, 'c', 'SINGLE');
  const limitParam = getApiSearchParams(req, 'lim', 'SINGLE');
  const offsetParam = getApiSearchParams(req, 'ofs', 'SINGLE');

  try {
    const conditions: SQL[] = [];

    if (queryParams && queryParams.trim() !== '') {
      const splitQuery = queryParams.trim().split(/\s+/);
      const queryArr = splitQuery.map((q) => sql`lower(${productsTable.name}) like lower(${`%${q}%`})`);

      if (queryArr.length > 0) {
        // WARNING: UNSAFE "!"
        conditions.push(or(...queryArr)!);
      }
    }

    if (idParams?.length) {
      const parsedIds = idParams.map(Number).filter((x) => !Number.isNaN(x));
      if (parsedIds.length > 0) {
        conditions.push(inArray(productsTable.id, parsedIds));
      }
    }

    if (statusParams && ['ACTIVE', 'INACTIVE'].includes(statusParams)) {
      conditions.push(eq(productsTable.status, statusParams as ProductStatus));
    }

    if (categoryIdParam && !Number.isNaN(Number(categoryIdParam))) {
      conditions.push(eq(productsTable.categoryId, Number(categoryIdParam)));
    }

    const limit = Math.min(Number(limitParam) || 100, 200);
    const offset = Number(offsetParam) || 0;

    const products = await db.query.productsTable.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      limit,
      offset,
    });

    return sendApiResponse(200, products);
  } catch (error) {
    console.error(error);
    return sendApiResponse(500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return sendApiResponse(401);

  const email = session.user.email; // <-- now it's a plain string

  try {
    const author = await db.query.usersTable.findFirst({
      where: (user, { eq }) => eq(user.email, email),
      columns: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    if (!author || author.role !== 'ADMIN') {
      return sendApiResponse(403);
    }

    const body = await getApiPostBody<AddProductSchema>(req);
    if (!body) {
      return sendApiResponse(400);
    }

    const values = {
      ...body,
      createdBy: author.id,
      updatedBy: author.id,
    } satisfies InferInsertModel<typeof productsTable>;

    const result = await db.insert(productsTable).values(values).returning();
    return sendApiResponse(200, result);
  } catch (error) {
    console.error(error);
    return sendApiResponse(500);
  }
}

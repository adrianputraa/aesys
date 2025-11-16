import { productCategories } from '@/drizzle/schema';
import { getApiPostBody, getApiSearchParams, sendApiResponse } from '@/lib/api';
import { db } from '@/lib/database';
import { productCategoriesTable, usersTable } from '@/lib/database/schema';
import { eq, inArray } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user) {
    return sendApiResponse(401);
  }

  const idParams = getApiSearchParams(req, 'id');

  try {
    const whereClause =
      idParams.length > 0
        ? inArray(
            productCategoriesTable.id,
            idParams.map((id) => Number(id)).filter((x) => !Number.isNaN(x))
          )
        : undefined;

    const categories = (await db.query.productCategoriesTable.findMany({
      where: whereClause,
      columns: {
        id: true,
        name: true,
        description: true,
      },
    })) satisfies ProductCategoryQueryResult[];

    return sendApiResponse(200, categories);
  } catch (error) {
    console.error(error);
    return sendApiResponse(500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.user || !session.user.email) {
    return sendApiResponse(401);
  }

  try {
    // VALIDATE SESSION
    const author = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, session.user?.email),
      columns: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!author || author.role !== 'ADMIN') {
      // ONLY ALLOW ADMIN TO ADD CATEGORIES
      return sendApiResponse(403);
    }

    const payload = await getApiPostBody<ProductCategoryQueryPost>(req);
    console.log(typeof payload, payload);
    if (!payload) {
      return sendApiResponse(400);
    }

    const result = await db.insert(productCategoriesTable).values(payload).returning({
      id: productCategoriesTable.id,
      name: productCategoriesTable.name,
      description: productCategories.description,
    });

    return sendApiResponse(200, result);
  } catch (error) {
    console.error(error);
    return sendApiResponse(500);
  }
}

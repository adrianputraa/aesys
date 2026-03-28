import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/server"
import { headers } from "next/headers"
import db from "@/db"
import { user, account } from "@/db/schema"
import { eq, or, like } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const sessionData = await auth.api.getSession({
      headers: await headers(),
    })

    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const userAccount = await db.query.account.findFirst({
      where: eq(account.userId, sessionData.user.id),
      columns: {
        role: true,
      },
    })

    if (userAccount?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    if (!search) {
      return NextResponse.json({ users: [] })
    }

    const users = await db.query.user.findMany({
      where: or(
        like(user.name, `%${search}%`),
        like(user.email, `%${search}%`)
      ),
      columns: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
      },
      limit: 50,
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

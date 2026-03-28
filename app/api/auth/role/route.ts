import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/server"
import { headers } from "next/headers"
import db from "@/db"
import { account } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userAccount = await db.query.account.findFirst({
      where: eq(account.userId, session.user.id),
      columns: {
        role: true,
      },
    })

    return NextResponse.json({ role: userAccount?.role || "USER" })
  } catch (error) {
    console.error("Error fetching user role:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

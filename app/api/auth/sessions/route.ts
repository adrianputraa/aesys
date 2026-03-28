import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/server"
import { headers } from "next/headers"
import db from "@/db"
import { session } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET() {
  try {
    const sessionData = await auth.api.getSession({
      headers: await headers(),
    })

    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessions = await db.query.session.findMany({
      where: eq(session.userId, sessionData.user.id),
      columns: {
        id: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        expiresAt: true,
        token: true,
        ipAddress: true,
        userAgent: true,
      },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionData = await auth.api.getSession({
      headers: await headers(),
    })

    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      )
    }

    // Verify the session belongs to the user
    const targetSession = await db.query.session.findFirst({
      where: and(
        eq(session.id, sessionId),
        eq(session.userId, sessionData.user.id)
      ),
    })

    if (!targetSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Don't allow deleting the current session
    if (sessionId === sessionData.session.id) {
      return NextResponse.json(
        { error: "Cannot revoke current session" },
        { status: 400 }
      )
    }

    await db.delete(session).where(eq(session.id, sessionId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error revoking session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

"use server"

import db from "@/db"
import { user } from "@/db/schema"
import { eq, InferSelectModel, SQL } from "drizzle-orm"
import { endOfDay, startOfDay } from "date-fns"

type User = InferSelectModel<typeof user>
// type UserRelationKey = "sessions" | "accounts"

interface GetUserOptions {
  id?: User["id"] | User["id"][]
  email?: string | string[]
  createdFrom?: Date
  createdTo?: Date
  emailVerified?: boolean
  hidden?: boolean
  columns?: Partial<Record<keyof User, boolean>>
  with?: Partial<Record<string, boolean>>
}

interface UpdateUserPayload extends Partial<Omit<User, "id">> {
  id: User["id"]
}

async function getUsers(options?: GetUserOptions) {
  return await db.query.user.findMany({
    where(row, { and, eq, gte, lte, inArray }) {
      const condArr: SQL<unknown>[] = []
      if (options) {
        const entries = Object.entries(options).filter(
          (ent) => ["columns", "with"].includes(ent[0]) || ent[1] !== undefined
        )

        for (let i = 0; i < entries.length; i++) {
          const current = entries[i]
          const key = current[0] as keyof User
          const value = current[1]

          if (Array.isArray(value) && value.length > 0) {
            condArr.push(inArray(row[key], value))
          } else if (value instanceof Date) {
            switch (current[0]) {
              case "createdFrom":
                condArr.push(gte(row[key], startOfDay(value)))
                break
              case "createdTo":
                condArr.push(lte(row[key], endOfDay(value)))
                break
            }
          } else if (typeof value === "string" || typeof value === "boolean") {
            condArr.push(eq(row[key], value))
          }
        }
      }

      return and(...condArr)
    },
    columns: options?.columns || undefined,
    with: options?.with || undefined,
  })
}

async function updateUsers(payloads: UpdateUserPayload[]) {
  const result: User[] = []

  for (let i = 0; i < payloads.length; i++) {
    const { id, ...payload } = payloads[i]
    const [row] = await db
      .update(user)
      .set(payload)
      .where(eq(user.id, id))
      .returning()

    if (row) result.push(row)
  }

  return result
}

export { getUsers, updateUsers }

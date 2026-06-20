import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"

// Mounts all better-auth endpoints under /api/auth/*.
export const { GET, POST } = toNextJsHandler(auth)

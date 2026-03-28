import z from "zod"
import { getUsers } from "../helper/server/user"

const signUpSchema = z
  .object({
    email: z.email().min(1, "Email address is required."),
    username: z.string().min(1, "Username is required."),
    password: z.string().min(1, "Password is required."),
    confirmPassword: z.string().min(1, "Confirm Password is required."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password do not match",
    path: ["confirmPassword"],
    when: (payload): boolean => {
      return signUpSchema
        .pick({ password: true, confirmPassword: true })
        .safeParse(payload.value).success
    },
  })
  .refine(
    async function (value) {
      const users = await getUsers({
        email: value.email,
        columns: {
          id: true,
        },
      })

      return users.length > 0
    },
    {
      message: "Email address already registered.",
      path: ["email"],
    }
  )

const signInSchema = z.object({
  email: z.email().min(1, "Email address is required."),
  password: z.string().min(1, "Password is required."),
})

export { signInSchema, signUpSchema }

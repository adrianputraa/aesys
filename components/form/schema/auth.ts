import * as z from 'zod';

// FOR LATER:
// .refine((value) => /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/.test(value), 'Password must contain at least one special letter.')

const loginFormSchema = z.object({
  email: z.email('Please enter a valid email address.').min(1, 'Please enter email address.'),
  password: z.string('Please enter a password.').min(1, 'Please enter a password'),
});
// .refine(
//   async (data) => {
//     // check if email address is registered
//     const exists = await checkEmail(data.email);
//     return exists;
//   },
//   {
//     error: 'Email address is not registered',
//     path: ['email'],
//   }
// );

const registerFormSchema = z
  .object({
    username: z.string().min(1, 'Please enter username.'),
    email: z.email().min(1, 'Please enter email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .refine((value) => /[A-Z]/.test(value), 'Password must contain at least one uppercase letter.')
      .refine((value) => /\d/.test(value), 'Password must contain at least one number.'),
    confirmPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .refine((value) => /[A-Z]/.test(value), 'Password must contain at least one uppercase letter.')
      .refine((value) => /\d/.test(value), 'Password must contain at least one number.'),
  })
  .superRefine(async (data, ctx) => {
    // ✅ Simulate async API calls
    const [emailExists, usernameExists] = await Promise.all([checkEmail(data.email), checkUsername(data.username)]);

    // Email already registered
    if (emailExists) {
      ctx.addIssue({
        code: 'custom',
        message: 'Email address is already registered.',
        path: ['email'],
      });
    }

    // ❌ Username taken
    if (usernameExists) {
      ctx.addIssue({
        code: 'custom',
        message: 'Username is already taken.',
        path: ['username'],
      });
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password and Confirm Password is not the same.',
        path: ['password', 'confirmPassword'],
      });
    }
  });

const forgetPasswordFormSchema = z
  .object({
    email: z.email().min(1, 'Please enter email address.'),
  })
  .refine(
    async (data) => {
      const exists = await checkEmail(data.email);
      return exists;
    },
    {
      error: 'Email address is not registered.',
      path: ['email'],
    }
  );

async function checkEmail(email: string) {
  await new Promise((r) => setTimeout(r, 300));
  return ['taken@example.com', 'admin@test.com'].includes(email);
}

async function checkUsername(username: string) {
  await new Promise((r) => setTimeout(r, 300));
  return ['admin', 'testuser'].includes(username);
}

type LoginFormSchema = z.infer<typeof loginFormSchema>;
type RegisterFormSchema = z.infer<typeof registerFormSchema>;
type ForgetPassowrdFormSchema = z.infer<typeof forgetPasswordFormSchema>;

export { loginFormSchema, registerFormSchema, forgetPasswordFormSchema };
export type { LoginFormSchema, RegisterFormSchema, ForgetPassowrdFormSchema };

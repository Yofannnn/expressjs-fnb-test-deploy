import z from "zod";

const email = z.email({ error: "Please enter a valid email." }).trim();

const password = z
  .string()
  .regex(/^(?=.*[0-9])(?=.*[!@#$%^&*()_\-+=<>?/\\|{}[\].,:;]).*$/, { error: "Password must contain at least one number and one special character" })
  .min(8, { error: "Password must be at least 8 characters long" })
  .trim();

export const LoginSchema = z.object({ email, password });

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(1, { error: "Name must be at least 1 character long" })
    .refine((val) => val.trim().length > 0, {
      error: "Name cannot only contain spaces",
    }),
  address: z.string().trim().optional(),
  email,
  password,
});

export const VerifyEmailSchema = z.object({
  verifyEmailToken: z.string(),
});

export const ForgotPasswordSchema = z.object({
  email,
});

export const ValidateResetTokenSchema = z.object({
  resetPasswordToken: z.string(),
});

export const ResetPasswordSchema = z.object({
  resetPasswordToken: z.string(),
  newPassword: password,
});

export type LoginSchemaType = z.infer<typeof LoginSchema>;
export type RegisterSchemaType = z.infer<typeof RegisterSchema>;
export type VerifyEmailSchemaType = z.infer<typeof VerifyEmailSchema>;
export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;
export type ValidateResetTokenSchemaType = z.infer<typeof ValidateResetTokenSchema>;
export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;

import { z } from "zod";

/**
 * Auth input contracts. Shared by the server actions and, where useful, by the
 * forms — so the message a user sees is the message the server would have given.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254)
  .email("That does not look like an email address.")
  .transform((value) => value.toLowerCase());

/**
 * Ten characters rather than eight. Length is the only requirement that
 * reliably helps; composition rules mostly push people towards "Password1!".
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "That name is too long."),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "This reset link is incomplete."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Both passwords need to match.",
    path: ["confirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

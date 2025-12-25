import { z } from "zod";

/**
 * Environment variable validation schema
 * Uygulama başlamadan önce tüm gerekli env değişkenlerini doğrular
 */
const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL geçerli bir URL olmalı"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY gerekli"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY gerekli"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL gerekli"),

  // IMAP (Mail)
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z.string().transform(Number).optional(),
  IMAP_USER: z.string().optional(),
  IMAP_PASSWORD: z.string().optional(),

  // SMTP (Mail sending)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),

  // İkas E-commerce
  IKAS_CLIENT_ID: z.string().optional(),
  IKAS_CLIENT_SECRET: z.string().optional(),
  IKAS_STORE_URL: z.string().optional(),

  // AI/OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Vercel KV (Rate Limiting)
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),

  // Verimor (Calls)
  VERIMOR_API_KEY: z.string().optional(),
  VERIMOR_API_USER: z.string().optional(),
});

// Validate environment variables
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Environment variable validation failed:");
    console.error(parsed.error.flatten().fieldErrors);

    // Development'ta uyarı ver, production'da hata fırlat
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
  }

  return parsed.data;
}

// Export validated env
export const env = validateEnv();

// Type-safe env access helpers
export function getRequiredEnv(key: keyof z.infer<typeof envSchema>): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(5000),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  SWAGGER_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  DATABASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url().optional(),
  ),
  KINDE_ISSUER_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type Environment = z.infer<typeof environmentSchema>;

export const validateEnvironment = (
  config: Record<string, unknown>,
): Environment => {
  return environmentSchema.parse(config);
};

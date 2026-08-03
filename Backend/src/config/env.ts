//This file centralizes the loading of environment variables.
import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 5000,

  db: {
    host: requireEnv("DB_HOST", process.env.DB_HOST),
    user: requireEnv("DB_USER", process.env.DB_USER),
    password: process.env.DB_PASSWORD || "",
    name: requireEnv("DB_NAME", process.env.DB_NAME),
  },

  jwt: {
    secret: requireEnv("JWT_SECRET", process.env.JWT_SECRET),
    expiresIn: process.env.JWT_EXPIRY || "1d",
  },
};

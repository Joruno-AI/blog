import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";

export function getAuth() {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    user: {
      additionalFields: {
        role: {
          type: ["admin", "editor", "viewer"],
          required: false,
          defaultValue: "viewer",
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    trustedOrigins: [
      "https://wangshengliang.cn",
      "https://www.wangshengliang.cn",
      "https://www.wangshengliang.site",
      "https://wangshengliang.site",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8788",
      "http://127.0.0.1:8788",
      ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ],
  });
}

type Auth = ReturnType<typeof getAuth>;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];

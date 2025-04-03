// auth.router.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { registerUser, loginUser, issueOAuthToken } from "./auth.controller";
import { registrationSchema, loginSchema, oauthTokenSchema } from "../validators";

export const authRouter = new Hono();

authRouter.post(
  "/register",
  zValidator("json", registrationSchema),
  registerUser
);

authRouter.post(
  "/login",
  zValidator("json", loginSchema),
  loginUser
);


authRouter.post(
  "/token",
  zValidator("json", oauthTokenSchema),
  issueOAuthToken
);

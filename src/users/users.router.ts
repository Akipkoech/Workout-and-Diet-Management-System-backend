import { Hono } from "hono";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  checkUserExists,
  getActiveUsers,
} from "./users.controller";
import { zValidator } from "@hono/zod-validator";
import { updateUserSchema, userSchema } from "../validators";


export const userRouter = new Hono();

userRouter.get("/users", listUsers);
userRouter.get("/users/active", getActiveUsers); 
userRouter.get("/users/by-email", checkUserExists); 
userRouter.get("/users/:id", getUserById);
userRouter.post("/users", zValidator("json", userSchema), createUser);
userRouter.put("/users/:id", zValidator("json", updateUserSchema), updateUser);
userRouter.delete("/users/:id", deleteUser);

import { Context } from "hono";
import { userService } from "./users.service";

export const listUsers = async (c: Context) => {
  try {
    const data = await userService.list();
    if (!data || data.length === 0) {
      return c.json({ message: "No users found" }, 404);
    }
    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error?.message }, 500);
  }
};

export const getUserById = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const data = await userService.getById(Number(id));
    if (!data) {
      return c.json({ message: "User not found" }, 404);
    }
    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error?.message }, 500);
  }
};

export const createUser = async (c: Context) => {
  try {
    const userData = await c.req.json();
    const newUser = await userService.create(userData);
    return c.json(newUser, 201);
  } catch (error: any) {
    return c.json({ error: error?.message }, 400);
  }
};

export const updateUser = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const userData = await c.req.json();
    const updatedUser = await userService.update(Number(id), userData);
    if (!updatedUser) {
      return c.json({ message: "User not found" }, 404);
    }
    return c.json(updatedUser, 200);
  } catch (error: any) {
    return c.json({ error: error?.message }, 400);
  }
};

export const deleteUser = async (c: Context) => {
  try {
    const id = c.req.param("id");
    const deleted = await userService.delete(Number(id));
    if (!deleted) {
      return c.json({ message: "User not found" }, 404);
    }
    return c.json({ message: "User deleted successfully" }, 200);
  } catch (error: any) {
    return c.json({ error: error?.message }, 500);
  }
};

export const checkUserExists = async (c: Context) => {
  try {
    const email = c.req.query("email");

    if (!email) {
      return c.json({ error: "Email parameter is required" }, 400);
    }

    const existsUser = await userService.existsByEmail(email);

    const user = {
      id: existsUser?.userId,
      name: existsUser?.fullName,
      role: existsUser?.role,
      email: existsUser?.email
    }
    const exists = !!existsUser;

    console.log("🚀 ~ checkUserExists ~ exists:", exists)
    return c.json({ exists, user }, 200);
  } catch (error: any) {
    return c.json({ error: error?.message }, 500);
  }
};

export const getActiveUsers = async (c: Context) => {
  try {
    const data = await userService.getActiveUsers();
    if (!data || data.length === 0) {
      return c.json({ message: "No active users found" }, 404);
    }
    return c.json(data, 200);
  } catch (error: any) {
    return c.json({ error: error?.message }, 500);
  }
};
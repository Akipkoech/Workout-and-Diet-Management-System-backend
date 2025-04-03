import "dotenv/config";
import { Context } from "hono";
import { createAuthUserService, userLoginService } from "./auth.service";
import bcrypt from "bcrypt";
import { sign } from "hono/jwt";
import { userService } from "../users/users.service";
import { aiPlanGenerationService } from "../ai-plans-history/ai-plan-generation.service";
import { nutritionPlanGenerationService } from "../nutrition-plans/nutrition-plan-generation.service";
import { db } from "../drizzle/db"; // Import your Drizzle DB instance
import { UsersTable } from "../drizzle/schema"; // Import your schema
import { eq } from "drizzle-orm"; // For querying

export const registerUser = async (c: Context) => {
  // Your existing registerUser logic (unchanged)
  try {
    const userData = await c.req.json();
    const { password, ...userInfo } = userData;

    const dateOfBirth = new Date(userInfo.dateOfBirth);
    if (isNaN(dateOfBirth.getTime())) {
      return c.json({ error: "Invalid date format for date of birth" }, 400);
    }

    const height = parseFloat(userInfo.height);
    const weight = parseFloat(userInfo.weight);
    if (isNaN(height) || isNaN(weight)) {
      return c.json({ error: "Invalid height or weight values" }, 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await userService.create({
      ...userInfo,
      height,
      weight,
      dateOfBirth,
      password: hashedPassword,
    });

    let workoutPlanGenerated = false;
    let nutritionPlanGenerated = false;

    if (createdUser && typeof createdUser.userId === "number") {
      try {
        workoutPlanGenerated = await aiPlanGenerationService.generateWorkoutPlan(createdUser.userId);
        nutritionPlanGenerated = await nutritionPlanGenerationService.generateNutritionPlan(createdUser.userId);
      } catch (planError) {
        console.error("Error generating plans:", planError);
      }
    }

    return c.json(
      {
        message: "User registered successfully",
        user: {
          ...createdUser,
          password: undefined,
        },
        workoutPlanGenerated,
        nutritionPlanGenerated,
      },
      201
    );
  } catch (error: any) {
    return c.json({ error: error?.message }, 400);
  }
};

export const loginUser = async (c: Context) => {
  try {
    const { email, password } = await c.req.json();
    const userExist = await userLoginService(email, password);

    if (!userExist) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Streak calculation logic
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const lastLogin = userExist.lastLogin ? new Date(userExist.lastLogin) : null;
    let newStreak = userExist.loginStreak || 0;

    if (lastLogin) {
      const lastLoginDay = new Date(lastLogin);
      lastLoginDay.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1; // Consecutive day, increment streak
      } else if (diffDays > 1) {
        newStreak = 1; // Skipped a day, reset to 1
      } // diffDays === 0: same day, no change
    } else {
      newStreak = 1; // First login ever
    }

    // Update the user's lastLogin and loginStreak in the database
    await db
      .update(UsersTable)
      .set({
        lastLogin: today,
        loginStreak: newStreak,
      })
      .where(eq(UsersTable.userId, userExist.userId));

    // Generate JWT token
    const payload = {
      sub: userExist.userId.toString(),
      role: userExist.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    };
    const secret = process.env.JWT_SECRET as string;
    const token = await sign(payload, secret);

    return c.json(
      {
        token,
        user: {
          ...userExist,
          password: undefined,
          loginStreak: newStreak, // Optionally include streak in response
        },
      },
      200
    );
  } catch (error: any) {
    return c.json({ error: error?.message }, 400);
  }
};


export const issueOAuthToken = async (c: Context) => {
  try {
    const { email, oauthProvider, oauthId } = await c.req.json();
    
    // Check if user exists
    const users = await userService.list();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
  
    // Create and sign JWT token
    const payload = {
      userId: user.userId!.toString(),
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
      oauthProvider,
      oauthId
    };
    
    const secret = process.env.JWT_SECRET as string;
    const token = await sign(payload, secret);
    
    return c.json({
      token,
      user: {
        ...user,
        password: undefined
      }
    }, 200);
    
  } catch (error: any) {
    console.error("OAuth token error:", error);
    return c.json({ error: error?.message || "Failed to issue OAuth token" }, 400);
  }
};
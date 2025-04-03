import db from "../drizzle/db";
import { UsersTable, ProgressTrackingTable, WorkoutPlansTable, NutritionPlansTable, TIUser } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

type UserWithDetails = {
  userId: number;
  fullName: string;
  email: string;
  dateOfBirth: Date;
  gender: string;
  height: string;
  weight: string;
  role: string;
  fitnessGoal: string;
  experienceLevel: string;
  preferredWorkoutType: string;
  activityLevel: string;
  createdAt: Date; // Add this field
  updatedAt: Date; // Add this field
  progressTracking: {
    date: Date;
    weight: string | null;
    bodyFatPercentage: string | null;
    measurements?: {
      chest: string | null;
      waist: string | null;
      hips: string | null;
      arms: string | null;
      thighs: string | null;
    };
  }[];
  workoutPlans: {
    name: string;
    goal: string;
    difficulty: string;
    durationWeeks: number;
  }[];
  nutritionPlans: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    mealsPerDay: number;
  }[];
};

interface UserService {
  list: () => Promise<UserWithDetails[]>;
  getById: (id: number) => Promise<UserWithDetails | undefined>;
  create: (user: TIUser) => Promise<TIUser>;
  update: (id: number, user: Partial<TIUser>) => Promise<TIUser | null>;
  delete: (id: number) => Promise<boolean>;
  existsByEmail: (email: string) => Promise<TIUser | null>;
  getActiveUsers: () => Promise<UserWithDetails[]>;
}

export const userService: UserService = {
  list: async (): Promise<UserWithDetails[]> => {
    const users = await db.query.UsersTable.findMany({
      columns: {
        userId: true,
        fullName: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        height: true,
        weight: true,
        role: true,
        fitnessGoal: true,
        experienceLevel: true,
        preferredWorkoutType: true,
        activityLevel: true,
        createdAt: true, // Add this field
        updatedAt: true, // Add this field
      },
      with: {
        progressTracking: {
          columns: {
            date: true,
            weight: true,
            bodyFatPercentage: true,
            chest: true,
            waist: true,
            hips: true,
            arms: true,
            thighs: true,
          },
          orderBy: (progressTracking, { desc }) => [desc(progressTracking.date)],
          limit: 5,
        },
        workoutPlans: {
          columns: {
            name: true,
            goal: true,
            difficulty: true,
            durationWeeks: true,
          },
          orderBy: (workoutPlans, { desc }) => [desc(workoutPlans.createdAt)],
          limit: 1,
        },
        nutritionPlans: {
          columns: {
            dailyCalories: true,
            proteinGrams: true,
            carbsGrams: true,
            fatGrams: true,
            mealsPerDay: true,
          },
          orderBy: (nutritionPlans, { desc }) => [desc(nutritionPlans.createdAt)],
          limit: 1,
        },
      },
    });

    return users.map(user => ({
      ...user,
      dateOfBirth: new Date(user.dateOfBirth), // Convert string to Date
      createdAt: new Date(user.createdAt), // Convert string to Date
      updatedAt: new Date(user.updatedAt), // Convert string to Date
      progressTracking: user.progressTracking.map(progress => ({
        date: new Date(progress.date), // Convert string to Date
        weight: progress.weight,
        bodyFatPercentage: progress.bodyFatPercentage,
        measurements: {
          chest: progress.chest,
          waist: progress.waist,
          hips: progress.hips,
          arms: progress.arms,
          thighs: progress.thighs,
        }
      }))
    })) as UserWithDetails[];
  },

  getById: async (id: number): Promise<UserWithDetails | undefined> => {
    const user = await db.query.UsersTable.findFirst({
      columns: {
        userId: true,
        fullName: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        height: true,
        weight: true,
        role: true,
        fitnessGoal: true,
        experienceLevel: true,
        preferredWorkoutType: true,
        activityLevel: true,
        medicalConditions: true,
        dietaryRestrictions: true,
        createdAt: true, // Add this field
        updatedAt: true, // Add this field
      },
      with: {
        progressTracking: {
          columns: {
            date: true,
            weight: true,
            bodyFatPercentage: true,
            chest: true,
            waist: true,
            hips: true,
            arms: true,
            thighs: true,
          },
          orderBy: (progressTracking, { desc }) => [desc(progressTracking.date)],
          limit: 10,
        },
        workoutPlans: true,
        nutritionPlans: true,
      },
      where: (users, { eq }) => eq(users.userId, id),
    });

    if (!user) return undefined;

    return {
      ...user,
      dateOfBirth: new Date(user.dateOfBirth), // Convert string to Date
      createdAt: new Date(user.createdAt), // Convert string to Date
      updatedAt: new Date(user.updatedAt), // Convert string to Date
      progressTracking: user.progressTracking.map(progress => ({
        date: new Date(progress.date), // Convert string to Date
        weight: progress.weight,
        bodyFatPercentage: progress.bodyFatPercentage,
        measurements: {
          chest: progress.chest,
          waist: progress.waist,
          hips: progress.hips,
          arms: progress.arms,
          thighs: progress.thighs,
        }
      }))
    } as UserWithDetails;
  },

  create: async (user: TIUser): Promise<TIUser> => {
    try {
      // First, create the user
      const [newUser] = await db
        .insert(UsersTable)
        .values(user)
        .returning();

      // Format the current date as YYYY-MM-DD for PostgreSQL
      const currentDate = new Date().toISOString().split('T')[0];

      // Then create initial progress tracking entry
      await db
        .insert(ProgressTrackingTable)
        .values({
          userId: newUser.userId,
          date: currentDate,
          weight: newUser.weight,
          bodyFatPercentage: null,
          chest: null,
          waist: null,
          hips: null,
          arms: null,
          thighs: null,
          notes: "Initial measurements",
        });

      return newUser;
    } catch (error) {
      // If there's an error, we should handle it appropriately
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  },

  update: async (id: number, user: Partial<TIUser>): Promise<TIUser | null> => {
    try {
      // Check if the update includes a password change
      if (user.password) {
        // Hash the password before storing it
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        
        // Replace the plaintext password with the hashed one
        user.password = hashedPassword;
      }

      // Proceed with the update
      const [updatedUser] = await db
        .update(UsersTable)
        .set({ ...user, updatedAt: new Date() })
        .where(eq(UsersTable.userId, id))
        .returning();
        
      return updatedUser || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  },

  delete: async (id: number): Promise<boolean> => {
    const result = await db
      .delete(UsersTable)
      .where(eq(UsersTable.userId, id))
      .returning();
    return result.length > 0;
  },

  existsByEmail: async (email: string): Promise<TIUser | null> => {
    try {
      const user = await db.query.UsersTable.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });
      return user || null;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      throw new Error('Failed to check if user exists');
    }
  },
  
  getActiveUsers: async (): Promise<UserWithDetails[]> => {
    // Define the threshold for considering a user "active"
    // For example, users who have logged in during the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Query users who have recent activity
    // You could check against updated_at, or against related records like workout_logs
    const activeUsers = await db.query.UsersTable.findMany({
      columns: {
        userId: true,
        fullName: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        height: true,
        weight: true,
        role: true,
        fitnessGoal: true,
        experienceLevel: true,
        preferredWorkoutType: true,
        activityLevel: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        progressTracking: {
          columns: {
            date: true,
            weight: true,
            bodyFatPercentage: true,
            chest: true,
            waist: true,
            hips: true,
            arms: true,
            thighs: true,
          },
          orderBy: (progressTracking, { desc }) => [desc(progressTracking.date)],
          limit: 5,
        },
        workoutPlans: {
          columns: {
            name: true,
            goal: true,
            difficulty: true,
            durationWeeks: true,
          },
          orderBy: (workoutPlans, { desc }) => [desc(workoutPlans.createdAt)],
          limit: 1,
        },
        nutritionPlans: {
          columns: {
            dailyCalories: true,
            proteinGrams: true,
            carbsGrams: true,
            fatGrams: true,
            mealsPerDay: true,
          },
          orderBy: (nutritionPlans, { desc }) => [desc(nutritionPlans.createdAt)],
          limit: 1,
        },
      },
      where: (users, { gt }) => gt(users.updatedAt, thirtyDaysAgo),
      orderBy: (users, { desc }) => [desc(users.updatedAt)],
    });

   
    return activeUsers.map(user => ({
      ...user,
      dateOfBirth: new Date(user.dateOfBirth),
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      progressTracking: user.progressTracking.map(progress => ({
        date: new Date(progress.date),
        weight: progress.weight,
        bodyFatPercentage: progress.bodyFatPercentage,
        measurements: {
          chest: progress.chest,
          waist: progress.waist,
          hips: progress.hips,
          arms: progress.arms,
          thighs: progress.thighs,
        }
      }))
    })) as UserWithDetails[];
  },

};


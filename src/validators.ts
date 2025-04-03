import { z } from "zod";
import { userRoleEnum, fitnessGoalEnum, experienceLevelEnum, workoutTypeEnum, activityLevelEnum, ticketStatusEnum } from "./drizzle/schema";

export const userSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  dateOfBirth: z.string().transform((str) => new Date(str)),
  gender: z.string().min(1, "Gender is required"),
  height: z.number().positive("Height must be positive"),
  weight: z.number().positive("Weight must be positive"),
  role: z.enum(["user", "admin"]).default("user"),
  fitnessGoal: z.enum(["weight_loss", "muscle_gain", "maintenance"]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  preferredWorkoutType: z.enum(["home", "gym"]),
  activityLevel: z.string().min(1, "Activity level is required"),
  medicalConditions: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  dateOfBirth: z.string().transform((str) => new Date(str)).optional(),
  gender: z.string().min(1, "Gender is required").optional(),
  height: z.number().positive("Height must be positive").optional(),
  weight: z.number().positive("Weight must be positive").optional(),
  role: z.enum(["user", "admin"]).optional(),
  fitnessGoal: z.enum(["weight_loss", "muscle_gain", "maintenance"]).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  preferredWorkoutType: z.enum(["home", "gym"]).optional(),
  activityLevel: z.string().min(1, "Activity level is required").optional(),
  medicalConditions: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

export const exerciseLibrarySchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  description: z.string().min(1, "Description is required"),
  targetMuscleGroup: z.string().min(1, "Target muscle group is required"),
  equipment: z.string().nullable(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  workoutType: z.enum(["home", "gym"]),
  videoUrl: z.string().url().nullable(),
  imageUrl: z.string().url().nullable(),
  caloriesBurnRate: z.number().positive().nullable(),
  instructions: z.string().min(1, "Instructions are required"),
});

export const workoutPlanSchema = z.object({
  userId: z.number().positive("User ID must be a positive number"),
  name: z.string().min(1, "Workout plan name is required"),
  description: z.string().optional(),
  goal: z.enum(["weight_loss", "muscle_gain", "maintenance"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  durationWeeks: z.number().positive("Duration must be a positive number of weeks"),
  isAiGenerated: z.boolean().default(false),
  workoutType: z.enum(["home", "gym"]),
});

export const workoutSessionSchema = z.object({
  planId: z.number().positive("Plan ID is required"),
  dayNumber: z.number().min(1).max(7, "Day number must be between 1 and 7"),
  name: z.string().min(1, "Session name is required"),
  description: z.string().optional(),
  targetMuscleGroups: z.string().min(1, "Target muscle groups are required"),
  duration: z.number().positive("Duration must be positive"),
});

export const workoutExerciseSchema = z.object({
  sessionId: z.number().positive("Session ID is required"),
  exerciseId: z.number().positive("Exercise ID is required"),
  sets: z.number().positive("Sets must be positive"),
  reps: z.number().positive("Reps must be positive"),
  restPeriod: z.number().positive("Rest period must be positive"),
  order: z.number().positive("Order must be positive")
});

export const nutritionPlanSchema = z.object({
  userId: z.number().optional(), // Optional as it might be set dynamically
  goal: z.enum(["weight_loss", "muscle_gain", "maintenance"]),
  dailyCalories: z.number().positive("Daily calories must be a positive number"),
  proteinGrams: z.number().positive("Protein grams must be a positive number"),
  carbsGrams: z.number().positive("Carbs grams must be a positive number"),
  fatGrams: z.number().positive("Fat grams must be a positive number"),
  mealsPerDay: z.number().min(1, "Meals per day must be at least 1"),
  isAiGenerated: z.boolean().optional().default(false),
  restrictions: z.string().optional(),
});

export const mealPlanSchema = z.object({
  nutritionPlanId: z.number().int().positive("Nutrition Plan ID is required"),
  dayNumber: z.number().int().min(1).max(7, "Day number must be between 1 and 7"),
  mealTime: z.string().min(1, "Meal time is required").max(50, "Meal time too long"),
  name: z.string().min(1, "Meal name is required").max(100, "Meal name too long"),
  description: z.string().min(1, "Description is required"),
  calories: z.number().int().positive("Calories must be a positive number"),
  protein: z.number().int().nonnegative("Protein must be a non-negative number"),
  carbs: z.number().int().nonnegative("Carbs must be a non-negative number"),
  fat: z.number().int().nonnegative("Fat must be a non-negative number"),
  recipe: z.string().optional(),
});

export const progressTrackingSchema = z.object({
  userId: z.number().positive("User ID must be positive"),
  date: z.string().transform((str) => new Date(str)),
  weight: z.number().positive("Weight must be positive").optional(),
  bodyFatPercentage: z.number().min(0).max(100).optional(),
  chest: z.number().positive("Chest measurement must be positive").optional(),
  waist: z.number().positive("Waist measurement must be positive").optional(),
  hips: z.number().positive("Hips measurement must be positive").optional(),
  arms: z.number().positive("Arms measurement must be positive").optional(),
  thighs: z.number().positive("Thighs measurement must be positive").optional(),
  notes: z.string().optional(),
});

export const workoutLogSchema = z.object({
  userId: z.number().positive("User ID is required"),
  sessionId: z.number().positive("Session ID is required"),
  date: z.string()
    .datetime({ message: "Invalid date format. Must be ISO 8601 format" })
    .transform((str) => new Date(str)),
  duration: z.number().positive("Duration must be positive"),
  caloriesBurned: z.number().optional(),
  completed: z.boolean().default(true),
  notes: z.string().optional(),
});

export const exerciseLogSchema = z.object({
  logId: z.number().int().positive(),
  exerciseId: z.number().int().positive(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().positive().nullable(),
  notes: z.string().optional()
});

export const aiPlansHistorySchema = z.object({
  userId: z.number().positive("User ID is required"),
  workoutPlanId: z.number().optional(),
  nutritionPlanId: z.number().optional(),
  userInputs: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
    message: "User inputs cannot be empty",
  }),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
});

export const aiConfigurationSchema = z.object({
  fitnessGoal: z.enum(["weight_loss", "muscle_gain", "maintenance"]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  workoutType: z.enum(["home", "gym"]),
  muscleGroupSplit: z.record(z.string()),
  exerciseCountRange: z.object({
    min: z.number().positive(),
    max: z.number().positive()
  }),
  restPeriodRange: z.object({
    min: z.number().positive(),
    max: z.number().positive()
  }),
  setRanges: z.record(z.object({
    min: z.number().positive(),
    max: z.number().positive()
  })),
  repRanges: z.record(z.object({
    min: z.number().positive(),
    max: z.number().positive()
  }))
});

export const oauthTokenSchema = z.object({
  email: z.string().email("Invalid email address"),
  oauthProvider: z.string().min(1, "OAuth provider is required"),
  oauthId: z.string().min(1, "OAuth ID is required"),
});


export const registrationSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  dateOfBirth: z.string().refine((date) => !isNaN(new Date(date).getTime()), {
    message: "Invalid date format",
  }),
  gender: z.string().min(1, "Gender is required"),
  height: z.number().positive("Height must be a positive number"),
  weight: z.number().positive("Weight must be a positive number"),
  role: z.enum(["user", "admin"]).default("user"),
  fitnessGoal: z.enum(["weight_loss", "muscle_gain", "maintenance"]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  preferredWorkoutType: z.enum(["home", "gym"]),
  activityLevel: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active"]),
  medicalConditions: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const supportTicketSchema = z.object({
  userId: z.number().positive("User ID is required"),
  subject: z.string().min(1, "Subject is required").max(255, "Subject is too long"),
  message: z.string().min(1, "Message is required"),
  status: z.enum(["new", "open", "in_progress", "resolved", "closed"]).default("new"),
  adminResponse: z.string().optional(),
  category: z.string().default("general"),
});

export const updateTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(255, "Subject is too long").optional(),
  message: z.string().min(1, "Message is required").optional(),
  status: z.enum(["new", "open", "in_progress", "resolved", "closed"]).optional(),
  adminResponse: z.string().optional(),
  category: z.string().optional(),
});
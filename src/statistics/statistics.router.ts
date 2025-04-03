import { Hono } from "hono";
import { getNutritionGoalsStats, getWorkoutCompletionStats } from "./statistics.controller";

export const statsRouter = new Hono();

statsRouter.get("/stats/workouts", getWorkoutCompletionStats);
statsRouter.get("/stats/nutrition", getNutritionGoalsStats);
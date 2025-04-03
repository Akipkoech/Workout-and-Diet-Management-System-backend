import { Context } from "hono";
import { statsService } from "./statistics.service";

export const getWorkoutCompletionStats = async (c: Context) => {
  try {
    // Get date range from query parameters
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    
    if (!fromDate || !toDate) {
      return c.json({ error: "Both 'from' and 'to' date parameters are required" }, 400);
    }
    
    // Parse dates and validate
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return c.json({ error: "Invalid date format. Use YYYY-MM-DD" }, 400);
    }
    
    const stats = await statsService.getWorkoutCompletionStats(from, to);
    return c.json(stats, 200);
  } catch (error: any) {
    return c.json({ error: error?.message || "Failed to fetch workout stats" }, 500);
  }
};

export const getNutritionGoalsStats = async (c: Context) => {
    try {
      // Get date range from query parameters
      const fromDate = c.req.query("from");
      const toDate = c.req.query("to");
      
      if (!fromDate || !toDate) {
        return c.json({ error: "Both 'from' and 'to' date parameters are required" }, 400);
      }
      
      // Parse dates and validate
      const from = new Date(fromDate);
      const to = new Date(toDate);
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return c.json({ error: "Invalid date format. Use YYYY-MM-DD" }, 400);
      }
      
      const stats = await statsService.getNutritionGoalsStats(from, to);
      return c.json(stats, 200);
    } catch (error: any) {
      console.error("Error fetching nutrition stats:", error);
      return c.json({ error: error?.message || "Failed to fetch nutrition stats" }, 500);
    }
  };
import { and, between, count, eq, sql } from "drizzle-orm";
import db from "../drizzle/db";
import { MealConsumptionLogsTable, WorkoutLogsTable } from "../drizzle/schema";

export const statsService = {
    getWorkoutCompletionStats: async (fromDate: Date, toDate: Date) => {
        // Set time to start of day for fromDate and end of day for toDate
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        
        // Get count of all workouts in the date range
        const totalWorkoutsResult = await db
            .query.WorkoutLogsTable
            .findMany({
                where: between(WorkoutLogsTable.date, from, to),
                columns: {
                    logId: true
                }
            });
        
        const totalWorkouts = totalWorkoutsResult.length;
        
        // Get count of completed workouts in the date range
        const completedWorkoutsResult = await db
            .query.WorkoutLogsTable
            .findMany({
                where: and(
                    between(WorkoutLogsTable.date, from, to),
                    eq(WorkoutLogsTable.completed, true)
                ),
                columns: {
                    logId: true
                }
            });
        
        const completedWorkouts = completedWorkoutsResult.length;
        
        // Calculate completion rate
        const completionRate = totalWorkouts > 0 
            ? (completedWorkouts / totalWorkouts) * 100 
            : 0;
        
        // For change calculation, get stats from previous period of same length
        const periodLength = to.getTime() - from.getTime();
        const previousPeriodTo = new Date(from);
        previousPeriodTo.setHours(0, 0, 0, 0);
        previousPeriodTo.setMilliseconds(-1);
        
        const previousPeriodFrom = new Date(previousPeriodTo.getTime() - periodLength);
        
        // Get previous period stats
        const previousTotalWorkoutsResult = await db
            .query.WorkoutLogsTable
            .findMany({
                where: between(WorkoutLogsTable.date, previousPeriodFrom, previousPeriodTo),
                columns: {
                    logId: true
                }
            });
        
        const previousCompletedWorkoutsResult = await db
            .query.WorkoutLogsTable
            .findMany({
                where: and(
                    between(WorkoutLogsTable.date, previousPeriodFrom, previousPeriodTo),
                    eq(WorkoutLogsTable.completed, true)
                ),
                columns: {
                    logId: true
                }
            });
        
        const previousTotalWorkouts = previousTotalWorkoutsResult.length;
        const previousCompletedWorkouts = previousCompletedWorkoutsResult.length;
        
        const previousCompletionRate = previousTotalWorkouts > 0 
            ? (previousCompletedWorkouts / previousTotalWorkouts) * 100 
            : 0;
        
        // Calculate change
        const change = previousCompletionRate > 0 
            ? completionRate - previousCompletionRate
            : 0;
        
        return {
            period: {
                from: from.toISOString().split('T')[0],
                to: to.toISOString().split('T')[0]
            },
            totalWorkouts,
            completedWorkouts,
            completionRate: parseFloat(completionRate.toFixed(1)),
            change: parseFloat(change.toFixed(1)),
            previousPeriod: {
                from: previousPeriodFrom.toISOString().split('T')[0],
                to: previousPeriodTo.toISOString().split('T')[0],
                completionRate: parseFloat(previousCompletionRate.toFixed(1))
            }
        };
    },
    // Add this new function to the existing statsService object
getNutritionGoalsStats: async (fromDate: Date, toDate: Date) => {
    // Set time to start of day for fromDate and end of day for toDate
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    
    // Get meal consumption data within the date range
    const mealConsumptions = await db
        .query.MealConsumptionLogsTable
        .findMany({
            where: between(MealConsumptionLogsTable.consumedAt, from, to),
            with: {
                user: {
                    with: {
                        nutritionPlans: true
                    }
                }
            }
        });
    
    // Group consumptions by user and day
    const userDayConsumptions = new Map();
    
    for (const consumption of mealConsumptions) {
        const userId = consumption.userId;
        const day = consumption.consumedAt.toISOString().split('T')[0];
        const key = `${userId}-${day}`;
        
        if (!userDayConsumptions.has(key)) {
            userDayConsumptions.set(key, {
                userId,
                day,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
            });
        }
        
        const dailyTotal = userDayConsumptions.get(key);
        dailyTotal.calories += consumption.calories;
        dailyTotal.protein += consumption.protein;
        dailyTotal.carbs += consumption.carbs;
        dailyTotal.fat += consumption.fat;
    }
    
    // Calculate goal achievement for each user-day
    let achievedGoalDays = 0;
    let totalUserDays = userDayConsumptions.size;
    
    for (const [_, dailyTotal] of userDayConsumptions.entries()) {
        const user = mealConsumptions.find(c => c.userId === dailyTotal.userId)?.user;
        
        // Find the most recent nutrition plan for this user
        const nutritionPlan = user?.nutritionPlans?.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        if (nutritionPlan) {
            // Check if user stayed within 10% of their calorie goal
            const calorieTarget = nutritionPlan.dailyCalories;
            const lowerBound = calorieTarget * 0.9;
            const upperBound = calorieTarget * 1.1;
            
            // Check if macros are within reasonable range (±15% of targets)
            const proteinTarget = nutritionPlan.proteinGrams;
            const carbsTarget = nutritionPlan.carbsGrams;
            const fatTarget = nutritionPlan.fatGrams;
            
            const proteinInRange = dailyTotal.protein >= proteinTarget * 0.85 && 
                                  dailyTotal.protein <= proteinTarget * 1.15;
            const carbsInRange = dailyTotal.carbs >= carbsTarget * 0.85 && 
                                dailyTotal.carbs <= carbsTarget * 1.15;
            const fatInRange = dailyTotal.fat >= fatTarget * 0.85 && 
                              dailyTotal.fat <= fatTarget * 1.15;
            
            // Consider goal achieved if calories are in range and at least 2 of 3 macros are in range
            const macrosInRange = [proteinInRange, carbsInRange, fatInRange]
                                 .filter(Boolean).length >= 2;
            const caloriesInRange = dailyTotal.calories >= lowerBound && 
                                   dailyTotal.calories <= upperBound;
            
            if (caloriesInRange && macrosInRange) {
                achievedGoalDays++;
            }
        }
    }
    
    // Calculate completion rate
    const completionRate = totalUserDays > 0 
        ? (achievedGoalDays / totalUserDays) * 100 
        : 0;
    
    // For change calculation, get stats from previous period of same length
    const periodLength = to.getTime() - from.getTime();
    const previousPeriodTo = new Date(from);
    previousPeriodTo.setHours(0, 0, 0, 0);
    previousPeriodTo.setMilliseconds(-1);
    
    const previousPeriodFrom = new Date(previousPeriodTo.getTime() - periodLength);
    
    // Get previous period stats
    const previousMealConsumptions = await db
        .query.MealConsumptionLogsTable
        .findMany({
            where: between(MealConsumptionLogsTable.consumedAt, previousPeriodFrom, previousPeriodTo),
            with: {
                user: {
                    with: {
                        nutritionPlans: true
                    }
                }
            }
        });
    
    // Process previous period data
    const previousUserDayConsumptions = new Map();
    
    for (const consumption of previousMealConsumptions) {
        const userId = consumption.userId;
        const day = consumption.consumedAt.toISOString().split('T')[0];
        const key = `${userId}-${day}`;
        
        if (!previousUserDayConsumptions.has(key)) {
            previousUserDayConsumptions.set(key, {
                userId,
                day,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
            });
        }
        
        const dailyTotal = previousUserDayConsumptions.get(key);
        dailyTotal.calories += consumption.calories;
        dailyTotal.protein += consumption.protein;
        dailyTotal.carbs += consumption.carbs;
        dailyTotal.fat += consumption.fat;
    }
    
    // Calculate previous goal achievement
    let previousAchievedGoalDays = 0;
    let previousTotalUserDays = previousUserDayConsumptions.size;
    
    for (const [_, dailyTotal] of previousUserDayConsumptions.entries()) {
        const user = previousMealConsumptions.find(c => c.userId === dailyTotal.userId)?.user;
        
        const nutritionPlan = user?.nutritionPlans?.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        if (nutritionPlan) {
            const calorieTarget = nutritionPlan.dailyCalories;
            const lowerBound = calorieTarget * 0.9;
            const upperBound = calorieTarget * 1.1;
            
            const proteinTarget = nutritionPlan.proteinGrams;
            const carbsTarget = nutritionPlan.carbsGrams;
            const fatTarget = nutritionPlan.fatGrams;
            
            const proteinInRange = dailyTotal.protein >= proteinTarget * 0.85 && 
                                  dailyTotal.protein <= proteinTarget * 1.15;
            const carbsInRange = dailyTotal.carbs >= carbsTarget * 0.85 && 
                                dailyTotal.carbs <= carbsTarget * 1.15;
            const fatInRange = dailyTotal.fat >= fatTarget * 0.85 && 
                              dailyTotal.fat <= fatTarget * 1.15;
            
            const macrosInRange = [proteinInRange, carbsInRange, fatInRange]
                                 .filter(Boolean).length >= 2;
            const caloriesInRange = dailyTotal.calories >= lowerBound && 
                                   dailyTotal.calories <= upperBound;
            
            if (caloriesInRange && macrosInRange) {
                previousAchievedGoalDays++;
            }
        }
    }
    
    const previousCompletionRate = previousTotalUserDays > 0 
        ? (previousAchievedGoalDays / previousTotalUserDays) * 100 
        : 0;
    
    // Calculate change
    const change = previousCompletionRate > 0 
        ? completionRate - previousCompletionRate
        : 0;
    
    return {
        period: {
            from: from.toISOString().split('T')[0],
            to: to.toISOString().split('T')[0]
        },
        totalDays: totalUserDays,
        achievedGoalDays,
        completionRate: parseFloat(completionRate.toFixed(1)),
        change: parseFloat(change.toFixed(1)),
        previousPeriod: {
            from: previousPeriodFrom.toISOString().split('T')[0],
            to: previousPeriodTo.toISOString().split('T')[0],
            completionRate: parseFloat(previousCompletionRate.toFixed(1))
        }
    };
}
};
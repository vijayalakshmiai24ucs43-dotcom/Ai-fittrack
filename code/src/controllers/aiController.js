const geminiService = require('../services/geminiService');

const FALLBACK_RECOMMENDATION =
  "Our AI service is a bit busy right now. In the meantime: start with 30 minutes of brisk walking or light cardio, add 15-20 minutes of bodyweight exercises (squats, push-ups, planks), and finish with 5-10 minutes of stretching, 4-5 days a week. Please try again in a moment for a fully personalized plan.";

const FALLBACK_INSIGHT =
  "Our AI insight service is temporarily unavailable. Keep up your current routine and try to stay consistent with your workout frequency and duration - please try again shortly for a personalized insight.";

// @desc    Get AI workout recommendation
// @route   POST /api/ai/workout-recommendation
// @access  Private
const getWorkoutRecommendation = async (req, res, next) => {
  try {
    const { age, fitnessGoal, experience } = req.body;

    // Validate inputs
    if (age === undefined || !fitnessGoal || !experience) {
      return res.status(400).json({
        success: false,
        error: 'Please provide age, fitnessGoal, and experience',
      });
    }

    // Call service to get recommendation from Gemini AI
    const recommendation = await geminiService.generateWorkoutRecommendation(
      age,
      fitnessGoal,
      experience
    );

    res.status(200).json({
      recommendation,
    });
  } catch (error) {
    // Gemini overloaded / unavailable -> don't crash the client with a raw 500
    const status = error?.status || error?.error?.status;
    const code = error?.code || error?.error?.code;

    if (status === 'UNAVAILABLE' || code === 503) {
      return res.status(200).json({
        recommendation: FALLBACK_RECOMMENDATION,
        fallback: true,
      });
    }

    next(error);
  }
};

// @desc    Get AI fitness insights
// @route   POST /api/ai/fitness-insights
// @access  Private
const getFitnessInsights = async (req, res, next) => {
  try {
    const { totalWorkouts, averageDuration, totalCaloriesBurned } = req.body;

    // Validate inputs
    if (
      totalWorkouts === undefined ||
      averageDuration === undefined ||
      totalCaloriesBurned === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please provide totalWorkouts, averageDuration, and totalCaloriesBurned',
      });
    }

    // Call service to get insights from Gemini AI
    const insight = await geminiService.generateFitnessInsights(
      totalWorkouts,
      averageDuration,
      totalCaloriesBurned
    );

    res.status(200).json({
      insight,
    });
  } catch (error) {
    const status = error?.status || error?.error?.status;
    const code = error?.code || error?.error?.code;

    if (status === 'UNAVAILABLE' || code === 503) {
      return res.status(200).json({
        insight: FALLBACK_INSIGHT,
        fallback: true,
      });
    }

    next(error);
  }
};

module.exports = {
  getWorkoutRecommendation,
  getFitnessInsights,
};

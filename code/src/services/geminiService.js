const { GoogleGenAI } = require('@google/genai');

console.log("Gemini API Key Loaded:", !!process.env.GEMINI_API_KEY);

// Initialize the Gemini client using the environment variable
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Primary model from .env (falls back to a sensible default if not set)
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// If the primary model is overloaded (503), fall back to this one
const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

const isOverloaded = (error) => {
  const status = error?.status || error?.error?.status;
  const code = error?.code || error?.error?.code;
  return status === 'UNAVAILABLE' || code === 503;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Calls Gemini with automatic retry (for transient 503 overload) and
// a fallback model if the primary model stays overloaded.
const callGeminiWithRetry = async (prompt, { retries = 2, delayMs = 1000 } = {}) => {
  let lastError;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        return response.text ? response.text.trim() : null;
      } catch (error) {
        lastError = error;

        if (isOverloaded(error) && attempt < retries) {
          console.warn(`Gemini model "${model}" overloaded, retrying (attempt ${attempt + 1}/${retries})...`);
          await sleep(delayMs * (attempt + 1)); // simple backoff
          continue;
        }

        if (isOverloaded(error)) {
          console.warn(`Gemini model "${model}" still overloaded after retries, trying fallback model...`);
          break; // move to fallback model
        }

        // Non-overload error (bad key, bad request, etc.) - no point retrying
        throw error;
      }
    }
  }

  throw lastError;
};

// Generates a personalized workout recommendation using Google Gemini
const generateWorkoutRecommendation = async (age, fitnessGoal, experience) => {
  const prompt = `Generate a personalized workout recommendation for a person with the following details:
- Age: ${age}
- Fitness Goal: ${fitnessGoal}
- Experience Level: ${experience}

Please keep the recommendation extremely direct, practical, and concise (within 2-3 paragraph). Do not include any greeting, markdown bold stars (*), bullet points, or introductory phrases. Speak directly and provide a clear step-by-step execution plan also.`;

  try {
    const text = await callGeminiWithRetry(prompt);
    return text || 'No recommendation could be generated.';
  } catch (error) {
    console.error("========== GEMINI ERROR ==========");
    console.error(error);
    console.error("=================================");
    throw error;
  }
};

// Generates personalized fitness insights using Google Gemini
const generateFitnessInsights = async (totalWorkouts, averageDuration, totalCaloriesBurned) => {
  const prompt = `Analyze this user's fitness progress and generate a highly personalized, encouraging fitness insight:
- Total Workouts Logged: ${totalWorkouts}
- Average Workout Duration: ${averageDuration} minutes
- Total Calories Burned: ${totalCaloriesBurned} kcal

Please keep the insight extremely direct, actionable, and concise (within 2-3 sentences). Do not include any greeting, markdown bold stars (*), bullet points, or introductory phrases. Provide guidance on what to adjust or continue.`;

  try {
    const text = await callGeminiWithRetry(prompt);
    return text || 'No insight could be generated.';
  } catch (error) {
    console.error('Gemini Insights Error:', error.message);
    throw error;
  }
};

module.exports = {
  generateWorkoutRecommendation,
  generateFitnessInsights,
};

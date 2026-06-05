import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Please set it in your .env file.');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Analyze body photo for personalized calorie/macro recommendations
app.post('/api/analyze-body', async (req, res) => {
  try {
    const client = getClient();
    const { imageBase64, imageType, weight, height, age, gender, activityLevel, goal } = req.body;

    if (!imageBase64 || !weight || !height || !age || !gender) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const activityLabels = {
      sedentary: 'sedentary (desk job, no regular exercise)',
      light: 'lightly active (exercise 1-3 days/week)',
      moderate: 'moderately active (exercise 3-5 days/week)',
      active: 'very active (exercise 6-7 days/week)',
      very_active: 'extra active (athlete or physical labor job)',
    };

    const goalLabels = {
      lose: 'lose body fat',
      maintain: 'maintain current weight and body composition',
      gain: 'build muscle and gain weight',
    };

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 },
            },
            {
              type: 'text',
              text: `You are a certified fitness and nutrition coach analyzing a client's body composition photo for a health tracking app.

Client metrics:
- Weight: ${weight} kg
- Height: ${height} cm
- Age: ${age} years
- Sex: ${gender}
- Activity level: ${activityLabels[activityLevel] || activityLevel}
- Goal: ${goalLabels[goal] || goal}

Based on the photo and metrics, provide a professional body composition assessment and personalized nutrition targets.

Respond ONLY with a valid JSON object, no other text:
{
  "estimatedBodyFat": <integer 5-50>,
  "fitnessLevel": "<beginner|intermediate|advanced>",
  "adjustedCalories": <recommended daily calories as integer>,
  "proteinTarget": <grams per day as integer>,
  "carbTarget": <grams per day as integer>,
  "fatTarget": <grams per day as integer>,
  "recommendations": "<2-3 sentences of specific, actionable advice>",
  "bodyCompositionNotes": "<brief professional assessment, 1 sentence>"
}`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Unexpected response format from AI');

    const analysis = JSON.parse(jsonMatch[0]);
    res.json({ success: true, analysis });
  } catch (err) {
    console.error('Body analysis error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Analyze food photo for calorie and macro estimates
app.post('/api/analyze-food', async (req, res) => {
  try {
    const client = getClient();
    const { imageBase64, imageType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 },
            },
            {
              type: 'text',
              text: `You are a registered dietitian analyzing a food photo for a nutrition tracking app. Identify all visible food items and estimate nutritional content based on the visible portion sizes.

Respond ONLY with a valid JSON object, no other text:
{
  "name": "<concise food name/description>",
  "servingSize": "<e.g. '1 cup', '200g', '1 medium plate', '2 slices'>",
  "calories": <total estimated calories as integer>,
  "protein": <grams of protein as number, 1 decimal>,
  "carbs": <grams of total carbohydrates as number, 1 decimal>,
  "fat": <grams of fat as number, 1 decimal>,
  "fiber": <grams of dietary fiber as number, 1 decimal>,
  "confidence": "<low|medium|high>",
  "breakdown": "<brief explanation of main ingredients and how you estimated>"
}`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Unexpected response format from AI');

    const foodData = JSON.parse(jsonMatch[0]);
    res.json({ success: true, foodData });
  } catch (err) {
    console.error('Food analysis error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
});

// Serve built React app in production
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY not set. AI features will not work.');
  }
});

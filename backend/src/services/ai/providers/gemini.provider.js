import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const getSdkClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('GEMINI_API_KEY is not set');
    err.code = 'GEMINI_KEY_MISSING';
    throw err;
  }
  return new GoogleGenerativeAI(key);
};

const toCandidates = ({ model, modelFallbacks }) => {
  const fromEnv = Array.isArray(modelFallbacks) && modelFallbacks.length > 0 ? modelFallbacks : [];
  const candidates = [model, ...fromEnv, ...DEFAULT_MODEL_FALLBACKS].filter(Boolean);
  // preserve order but de-dupe
  return [...new Set(candidates)];
};

const getFirstWorkingModel = async (genAI, candidates) => {
  let lastErr;

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      // Tiny warm-up call to validate availability/support.
      await model.generateContent('ping');
      return { model, modelName };
    } catch (err) {
      console.error(`[GEMINI] Model not usable: ${modelName}`, err?.message || err);
      lastErr = err;
    }
  }

  const e = lastErr || new Error('No working Gemini model found');
  e.code = e.code || 'NO_WORKING_MODEL';
  throw e;
};

export const createGeminiProvider = ({ model, modelFallbacks } = {}) => {
  const genAI = getSdkClient();
  const candidates = toCandidates({ model, modelFallbacks });

  return {
    name: 'gemini',
    async generateText(prompt) {
      const { model: sdkModel } = await getFirstWorkingModel(genAI, candidates);
      const result = await sdkModel.generateContent(prompt);
      return result.response.text();
    },

    // List available models for the current key.
    // Uses REST because @google/generative-ai v0.2.x does not support listModels.
    async listModels() {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        const err = new Error('GEMINI_API_KEY is not set');
        err.code = 'GEMINI_KEY_MISSING';
        throw err;
      }

      const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        const err = new Error(`Failed to fetch models from Google: ${text}`);
        err.code = 'MODEL_LIST_FETCH_FAILED';
        err.details = text;
        throw err;
      }

      const data = await response.json();
      const models = (data?.models || []).map((m) => ({
        name: m.name,
        displayName: m.displayName,
        description: m.description,
        supportedGenerationMethods: m.supportedGenerationMethods,
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
      }));

      return models;
    },
  };
};

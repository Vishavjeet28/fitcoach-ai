import dotenv from 'dotenv';

dotenv.config();

// Central place for AI-related env configuration.
//
// Supported today:
//   AI_PROVIDER=gemini   (default)
//   GEMINI_API_KEY=...   (required for gemini)
//
// Optional:
//   AI_MODEL=gemini-2.5-flash
//   AI_MODEL_FALLBACKS=gemini-2.5-flash,gemini-2.0-flash,gemini-2.0-flash-lite
//
// Future providers (e.g. grok) can be plugged in without touching controllers.

const normalizeProvider = (value) => String(value || 'gemini').trim().toLowerCase();

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const aiConfig = {
  provider: normalizeProvider(process.env.AI_PROVIDER),
  model: process.env.AI_MODEL ? String(process.env.AI_MODEL).trim() : null,
  modelFallbacks: parseCsv(process.env.AI_MODEL_FALLBACKS),
};

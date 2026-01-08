import { aiConfig } from '../../config/ai.config.js';
import { createGeminiProvider } from './providers/gemini.provider.js';

export const getAIProvider = () => {
  switch (aiConfig.provider) {
    case 'gemini':
    default:
      return createGeminiProvider({ model: aiConfig.model, modelFallbacks: aiConfig.modelFallbacks });
  }
};

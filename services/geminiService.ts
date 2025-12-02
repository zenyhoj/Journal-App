import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Note: Initialization is handled lazily to prevent runtime errors during app load if env vars are missing.

export const GeminiService = {
  analyzeEntry: async (text: string): Promise<AIAnalysisResult> => {
    if (!text || text.length < 10) {
      throw new Error("Entry too short for analysis.");
    }

    try {
      // Initialize the API client lazily
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze the following journal entry. Provide a brief summary (max 20 words), a sentiment analysis (positive, neutral, or negative), and up to 3 relevant tags.
        
        Journal Entry: "${text}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentiment: {
                type: Type.STRING,
                enum: ["positive", "neutral", "negative"],
                description: "The overall emotional tone of the entry."
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Up to 3 keywords describing the topics."
              },
              summary: {
                type: Type.STRING,
                description: "A very concise summary of the entry."
              }
            },
            required: ["sentiment", "tags", "summary"]
          }
        }
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("No data returned from AI");
      
      return JSON.parse(jsonText) as AIAnalysisResult;
    } catch (error) {
      console.error("Gemini Analysis Failed:", error);
      throw error;
    }
  }
};
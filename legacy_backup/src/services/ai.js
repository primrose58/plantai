import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { CONFIG } from "../config.js";

/**
 * Service to interact with Google Gemini API
 */
export class GeminiService {
    constructor() {
        if (!CONFIG.GEMINI_API_KEY) {
            console.error("Gemini API Key is missing!");
        }
        this.genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    /**
     * Checks if the content is safe to post.
     * @param {string} text - User text to check
     * @param {string} base64Image - Optional image
     * @returns {Promise<boolean>} - True if safe, False if unsafe
     */
    async checkSafety(text, base64Image) {
        try {
            const prompt = `
                You are a content moderator. Analyze the following text and image.
                Text: "${text}"
                
                Is this content SAFE and APPROPRIATE for a general audience (farmers, students)?
                It must NOT contain hate speech, explicit violence, sexual content (+18), or illegal acts.
                
                Return JSON: {"safe": true} or {"safe": false, "reason": "reason"}
            `;

            const parts = [prompt];
            if (base64Image) {
                parts.push({
                    inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" }
                });
            }

            const result = await this.model.generateContent(parts);
            const responseTxt = result.response.text();

            // Parse JSON
            const cleanJson = responseTxt.replace(/```json/g, '').replace(/```/g, '').trim();
            const decision = JSON.parse(cleanJson);

            if (!decision.safe) console.warn("Blocked Content:", decision.reason);
            return decision.safe;

        } catch (e) {
            console.error("Moderation Check Failed:", e);
            // Fail safe: If AI is down, maybe allow? Or block? 
            // For safety, let's block if we can't verify.
            return false;
        }
    }

    /**
     * Analyzes a plant image to detect diseases.
     * @param {string} base64Image - Base64 encoded image string (including data:image/...)
     * @param {string} lang - Language code ('tr' or 'en')
     * @returns {Promise<Object>} - The diagnosis result
     */
    async analyzePlant(base64Image, lang = 'tr') {
        try {
            // formatting the base64 string to just the data
            const base64Data = base64Image.split(',')[1];

            const prompt = this._getPrompt(lang);

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg",
                },
            };

            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            return this._parseResponse(text);
        } catch (error) {
            console.error("Gemini Analysis Error:", error);
            throw error;
        }
    }

    _getPrompt(lang) {
        // Structured prompt to force JSON output
        const langInstruction = lang === 'tr' ? "OUTPUT MUST BE IN TURKISH." : "OUTPUT MUST BE IN ENGLISH.";

        return `
            You are an expert Phytopathologist (Plant Doctor). Analyze the provided image of a plant.
            ${langInstruction}
            
            Identify if the plant is healthy or has a disease/pest.
            
            Return ONLY a valid raw JSON object (no markdown formatting, no code blocks) with this specific structure:
            {
                "disease_name": "Name of the disease or 'Healthy'",
                "latin_name": "Scientific name or 'Plantae sanus'",
                "confidence": 85, (number between 0-100 representing confidence)
                "urgency": 50, (number between 0-100 representing how urgent the treatment is. 0 if healthy)
                "spread_risk": 40, (number between 0-100. 0 if healthy)
                "description": "Short explanation of the condition (max 2 sentences).",
                "treatment_steps": [
                    "Step 1...",
                    "Step 2...",
                    "Step 3..."
                ] (Array of strings. Return tips for care if healthy)
            }
            
            If the image is NOT a plant, return:
            {
                "error": "NOT_PLANT"
            }
        `;
    }

    _parseResponse(text) {
        try {
            // Clean up markdown code blocks if Gemini adds them
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            console.log("Raw Text:", text);
            throw new Error("Failed to parse AI response");
        }
    }
}

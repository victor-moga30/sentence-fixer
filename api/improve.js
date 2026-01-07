// Vercel Serverless Function for AI Sentence Fixer
// This file handles API requests and communicates with Google Gemini

async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        // Parse JSON body
        const body = req.body;

        // Validate sentence exists and is not empty
        if (!body.sentence || typeof body.sentence !== 'string' || body.sentence.trim() === '') {
            return res.status(400).json({
                error: "Sentence is required"
            });
        }

        const { sentence, language, tone } = body;

        // Get API key from environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: 'API key not configured. Please set GEMINI_API_KEY environment variable.'
            });
        }

        // Build the prompt for Gemini - STRONGLY force raw JSON with NO markdown
        const prompt = `You are a helpful language tutor.

Task: Correct the following sentence naturally in ${language} with a ${tone} tone.

Sentence: "${sentence}"

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. First, determine if the sentence appears to be in ${language}.
2. If the sentence does NOT look like ${language} (e.g., it's in English when it should be in Spanish, or vice versa), you MUST respond with ONLY this JSON:
{
  "corrected": "",
  "explanation": "Your sentence doesn't look like ${language}. Please try again.",
  "alternatives": []
}
3. If the sentence IS in ${language}, correct it and provide the response in this exact JSON format:
{
  "corrected": "the fixed sentence",
  "explanation": "explanation of changes made",
  "alternatives": ["alternative 1", "alternative 2"]
}

OUTPUT REQUIREMENTS:
- OUTPUT ONLY RAW JSON - NO MARKDOWN, NO BACKTICKS, NO EXPLANATIONS
- Return the JSON object directly without any formatting
- Do NOT wrap the JSON in triple backticks (\`\`\`json or any other format)
- Do NOT add any text before or after the JSON
- The response must be valid JSON that can be parsed directly`;

        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
        }

        const data = await response.json();

        // Parse the AI response
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            throw new Error('No response from AI');
        }

        // Trim the text
        const trimmedContent = content.trim();

        // Parse JSON safely
        let parsed;
        try {
            parsed = JSON.parse(trimmedContent);
        } catch (parseError) {
            console.error('Failed to parse AI response:', trimmedContent);
            return res.status(500).json({
                error: "Invalid AI response"
            });
        }

        // Return parsed JSON directly to frontend
        return res.status(200).json(parsed);

    } catch (error) {
        console.error('Error in improve API:', error);
        return res.status(500).json({
            error: "Invalid AI response"
        });
    }
}

// Export for Vercel
module.exports = handler;

// For local testing with Vercel CLI
if (process.env.VERCEL || process.env.NODE_ENV === 'development') {
    module.exports = handler;
}

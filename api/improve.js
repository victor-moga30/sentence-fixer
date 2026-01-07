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

        // Build the prompt for Gemini
        const prompt = `You are a helpful language tutor. 

Task 1: Correct the following sentence naturally in ${language} with a ${tone} tone.
Sentence: "${sentence}"

Task 2: Briefly explain the mistake in 1-3 sentences.

Task 3: Provide exactly 2 alternative rewrites.

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "corrected": "the fixed sentence",
  "explanation": "explanation of changes made",
  "alternatives": ["alternative 1", "alternative 2"]
}`;

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

        // Parse JSON safely
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (parseError) {
            throw new Error('Invalid AI response');
        }

        // Validate required fields
        if (!parsed.corrected || !parsed.explanation || !Array.isArray(parsed.alternatives)) {
            throw new Error('Invalid AI response');
        }

        // Check if sentence appears to be in selected language
        const sentenceLower = sentence.toLowerCase();
        const isSpanish = /[áéíóúñ¿¡ü]/i.test(sentence) || 
                         /\b(el|la|los|las|un|una|unos|unas|es|son|está|están)\b/i.test(sentence);
        const isEnglish = /\b(the|is|are|was|were|a|an|this|that|these|those)\b/i.test(sentence);

        const looksLikeCorrectLanguage = (language === 'Spanish' && isSpanish) || 
                                         (language === 'English' && isEnglish) ||
                                         (!isSpanish && !isEnglish); // Short or unclear sentences

        if (!looksLikeCorrectLanguage && sentence.length > 10) {
            return res.status(200).json({
                corrected: "",
                explanation: "Your sentence doesn't look like <language>. Please try again.",
                alternatives: []
            });
        }

        // Return the result
        return res.status(200).json({
            corrected: parsed.corrected,
            explanation: parsed.explanation,
            alternatives: parsed.alternatives
        });

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

// Vercel Serverless Function for AI Sentence Fixer
// This file handles API requests and communicates with OpenAI

async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed. Use POST.'
        });
    }

    try {
        // Parse JSON body
        const body = req.body;

        // Validate sentence exists
        if (!body.sentence || typeof body.sentence !== 'string') {
            return res.status(400).json({
                error: 'Sentence is required and must be a string.'
            });
        }

        const { sentence, language, tone } = body;

        // Language detection/validation
        const sentenceLower = sentence.toLowerCase();
        const isSpanish = /[áéíóúñ¿¡ü]/i.test(sentence) || 
                         /\b(el|la|los|las|un|una|unos|unas|es|son|está|están)\b/i.test(sentence);
        const isEnglish = /\b(the|is|are|was|were|a|an|this|that|these|those)\b/i.test(sentence);

        if (language === 'Spanish' && !isSpanish && !isEnglish) {
            // If it's a short sentence or unclear, proceed anyway
            // This prevents false positives for short sentences
        } else if (language === 'English' && isSpanish && !isEnglish && sentence.length > 20) {
            return res.status(400).json({
                error: 'The sentence appears to be in Spanish, but English was selected. Please select the correct language.'
            });
        }

        // Get API key from environment variables
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: 'API key not configured. Please set OPENAI_API_KEY environment variable.'
            });
        }

        // Determine which model to use
        const model = 'gpt-4o-mini';

        // Build the system prompt
        const systemPrompt = `You are a helpful language tutor. Your task is to:
1. Fix and improve sentences in the specified language
2. Provide clear explanations of the corrections
3. Suggest alternative ways to express the same idea

Always respond with valid JSON in the exact format specified.`;

        // Build the user prompt
        const userPrompt = `Fix the following sentence in ${language} with a ${tone} tone.

Sentence: "${sentence}"

Required JSON response format:
{
  "corrected": "the fixed sentence",
  "explanation": "explanation of changes made",
  "alternatives": ["alternative 1", "alternative 2", "alternative 3"]
}`;

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.3,
                response_format: {
                    type: 'json_object'
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
        }

        const data = await response.json();

        // Parse the AI response
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No response from AI');
        }

        // Parse JSON safely
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (parseError) {
            // Try to extract JSON from response if it contains extra text
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch (innerError) {
                    throw new Error('Failed to parse AI response as JSON');
                }
            } else {
                throw new Error('Failed to parse AI response as JSON');
            }
        }

        // Validate required fields
        if (!parsed.corrected || !parsed.explanation || !Array.isArray(parsed.alternatives)) {
            throw new Error('Invalid response format from AI');
        }

        // Return the result
        return res.status(200).json({
            corrected: parsed.corrected,
            explanation: parsed.explanation,
            alternatives: parsed.alternatives.slice(0, 5) // Limit to 5 alternatives
        });

    } catch (error) {
        console.error('Error in improve API:', error);
        return res.status(500).json({
            error: error.message || 'An internal error occurred'
        });
    }
}

// Export for Vercel
module.exports = handler;

// For local testing with Vercel CLI
if (process.env.VERCEL || process.env.NODE_ENV === 'development') {
    module.exports = handler;
}

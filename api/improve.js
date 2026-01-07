// Vercel Serverless Function for AI Sentence Fixer
// This file handles API requests and communicates with Groq API (Llama)

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
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: 'API key not configured. Please set GROQ_API_KEY environment variable.'
            });
        }

        // Build the prompt for Groq - STRONGLY force raw JSON with NO markdown
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
- The response must be valid JSON that can be parsed directly
- You must provide exactly 2 alternatives when the sentence is valid`;

        // Call Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.3,
                max_tokens: 512
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const groqErrorMessage = errorData.error?.message || `Groq API error: ${response.status}`;
            console.error('Groq API error:', groqErrorMessage);
            return res.status(500).json({ error: groqErrorMessage });
        }

        const data = await response.json();

        // Parse the AI response
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            console.error('Empty AI response:', data);
            return res.status(500).json({ error: "No response from AI" });
        }

        // Trim the text
        const trimmedText = content.trim();

        // Try JSON.parse on the returned text
        let parsed;
        try {
            parsed = JSON.parse(trimmedText);
        } catch (e) {
            // Attempt to extract the first JSON object between first '{' and last '}'
            const firstBrace = trimmedText.indexOf('{');
            const lastBrace = trimmedText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const jsonStr = trimmedText.substring(firstBrace, lastBrace + 1);
                try {
                    parsed = JSON.parse(jsonStr);
                } catch (e2) {
                    console.error('Raw Groq response:', trimmedText);
                    return res.status(500).json({ error: "Invalid AI response" });
                }
            } else {
                console.error('Raw Groq response:', trimmedText);
                return res.status(500).json({ error: "Invalid AI response" });
            }
        }

        // Validate the response has the expected structure
        if (parsed && typeof parsed === 'object') {
            // Ensure alternatives is an array
            if (!Array.isArray(parsed.alternatives)) {
                parsed.alternatives = [];
            }
            // Ensure corrected and explanation are strings
            if (typeof parsed.corrected !== 'string') {
                parsed.corrected = '';
            }
            if (typeof parsed.explanation !== 'string') {
                parsed.explanation = '';
            }
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

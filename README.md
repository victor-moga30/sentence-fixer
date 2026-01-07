# AI Sentence Fixer

Improve your sentences with AI-powered language correction.

![AI Sentence Fixer Screenshot](screenshot.png)

## Features

- **AI-Powered Correction**: Uses OpenAI's GPT models to fix grammar and improve sentences
- **Multiple Languages**: Support for English and Spanish
- **Tone Selection**: Choose between neutral, formal, or casual tone
- **Alternative Suggestions**: Get multiple ways to express the same idea
- **Clear Explanations**: Learn why corrections were made
- **Serverless API**: Secure API calls that hide your OpenAI API key

## How It Works

1. Enter a sentence you want to improve
2. Select the language (English or Spanish)
3. Choose a tone (neutral, formal, or casual)
4. Click "Improve" to get:
   - A corrected version of your sentence
   - An explanation of the changes
   - Alternative ways to express the same idea

## Local Development

### Prerequisites

- Node.js installed (v18 or later)
- npm or yarn
- OpenAI API key

### Setup

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm init -y
   npm install vercel
   ```
3. Create a `.env.local` file with your API key:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```
4. Start the development server:
   ```bash
   npx vercel dev
   ```
5. Open http://localhost:3000 in your browser

### Project Structure

```
/
  index.html       # Main HTML page
  style.css        # Styling
  app.js           # Frontend JavaScript
  api/
    improve.js     # Serverless function
  README.md        # This file
  .env.local       # Local environment variables (not committed)
```

## Vercel Deployment

### Step 1: Create a Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub, GitLab, or email
3. Complete the onboarding process

### Step 2: Prepare Your Project

1. Initialize a git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a `.gitignore` file:
   ```
   node_modules/
   .env.local
   .vercel/
   *.log
   ```

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

   Follow the prompts:
   - Set up and deploy? Yes
   - Which scope? Your username
   - Link to existing project? No
   - Project name? ai-sentence-fixer (or your preferred name)
   - Directory? ./
   - Want to modify settings? No (or Yes to configure environment variables)

4. Add your OpenAI API key as an environment variable:
   ```bash
   vercel env add OPENAI_API_KEY
   ```
   Enter your API key when prompted.

5. Redeploy to apply the environment variable:
   ```bash
   vercel --prod
   ```

#### Option B: Using Git Integration

1. Push your code to GitHub, GitLab, or Bitbucket
2. Go to [vercel.com](https://vercel.com) and click "Add New Project"
3. Import your repository
4. In the "Environment Variables" section, add:
   - Name: `OPENAI_API_KEY`
   - Value: your OpenAI API key
5. Click "Deploy"
6. Vercel will automatically build and deploy your project

### Step 4: Configure API Route

Vercel automatically recognizes the `api/` folder and deploys it as serverless functions. Make sure your project includes the `api/improve.js` file.

### Step 5: Access Your App

After deployment, Vercel will provide a URL like:
- Production: `https://ai-sentence-fixer.vercel.app`
- Preview deployments for each commit

## Tips and Tricks

### 1. Using Serverless Functions to Hide API Keys

Never expose your OpenAI API key in frontend code. Always keep it on the server:

**Frontend (INSECURE - Don't do this):**
```javascript
// ❌ NEVER put API keys in frontend code
const apiKey = 'sk-...'; // Exposed to everyone!
```

**Backend (api/improve.js - SECURE):**
```javascript
// ✅ API key stays on the server
const apiKey = process.env.OPENAI_API_KEY;
```

The frontend makes a request to `/api/improve`, which:
1. Reads the API key from environment variables
2. Calls OpenAI API on your server
3. Returns the result to the frontend

### 2. Calling OpenAI API

Use the Chat Completions API for best results:

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: userInput }
        ],
        temperature: 0.3
    })
});
```

**Key parameters:**
- `model`: Use "gpt-4o-mini" for best quality/cost ratio
- `temperature`: Lower (0.1-0.3) for more consistent outputs
- `messages`: Array of conversation messages

### 3. Prompt Formatting to Force JSON

Get structured JSON responses from GPT models:

```javascript
// Use JSON mode or json_object response format
body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [...],
    response_format: {
        type: 'json_object'
    }
})

// Or include JSON structure in your prompt
const userPrompt = `Fix this sentence: "${sentence}"

Respond with this exact JSON format:
{
  "corrected": "fixed sentence",
  "explanation": "why changes were made",
  "alternatives": ["alt1", "alt2"]
}`;
```

### 4. Handling Errors and Loading States

Provide a good user experience with proper error handling:

```javascript
// Frontend loading state
button.disabled = true;
button.textContent = 'Generating...';

// Handle errors gracefully
try {
    const response = await fetch('/api/improve', { ... });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }
    
    // Display results
    displayResults(data);
} catch (error) {
    showError(error.message);
} finally {
    button.disabled = false;
    button.textContent = 'Improve';
}
```

**Common error types to handle:**
- 400: Bad request (invalid input)
- 401: Invalid API key
- 429: Rate limited (too many requests)
- 500: Server error

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key (sk-...) |

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI**: OpenAI API (GPT-4o-mini)
- **Deployment**: Vercel

## License

MIT License - feel free to use this project for learning or as a starting point for your own projects.

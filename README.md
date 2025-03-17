# AI Platform

A powerful AI chat platform that integrates multiple AI providers including OpenAI, Google, Anthropic, and Mistral.

## Features

- Multi-provider support (OpenAI, Google, Anthropic, Mistral)
- Smart model selection based on user input
- Interactive chat interface
- Model capabilities detection
- API key management
- Error handling with user-friendly messages
- Dark/light mode
- Responsive design for all devices

## Technologies Used

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Server-Side Rendering (SSR)
- Server Actions
- API Routes
- Server-Sent Events (SSE) for streaming responses

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ai-platform.git
   ```

2. Install dependencies:
   ```
   cd ai-platform
   npm install
   ```

3. Configure API keys:
   - Create a `.env.local` file in the root directory
   - Add your API keys:
     ```
     OPENAI_API_KEY=your_openai_key
     GOOGLE_API_KEY=your_google_key
     ANTHROPIC_API_KEY=your_anthropic_key
     MISTRAL_API_KEY=your_mistral_key
     ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Recent Enhancements

- Improved error handling with detailed error messages
- Enhanced model selection to prioritize available providers
- Added API keys configuration section in settings
- Fixed routing issues in the API Access page
- Better UI for error messages with direct links to fix issues

## License

MIT 
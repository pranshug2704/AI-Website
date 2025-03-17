# AI Platform

A production-ready AI platform that intelligently routes user requests to the most appropriate AI model based on the task type, complexity, and user subscription tier.

## Features

- **Multi-Model AI Access**: Connect to various AI models (OpenAI, Anthropic, Google, Mistral) through a single interface
- **Intelligent Model Selection**: Our AI router automatically selects the best model for each request
- **Real-time Streaming Responses**: Experience AI responses as they're generated
- **Chat Interface**: Intuitive chat-like interface with history tracking and export options
- **Subscription Tiers**: Free, Pro, and Enterprise plans to meet different needs
- **Responsive Design**: Works flawlessly on desktop, tablet, and mobile devices
- **Dark Mode Support**: Choose between light and dark themes
- **Real Authentication**: Secure user authentication with NextAuth.js
- **Chat Storage**: Persistent chat history across sessions with database integration
- **Subscription Management**: Tiered subscription system with Stripe integration
- **Developer API**: API key management and endpoints for developers
- **Usage Tracking**: Token usage monitoring and limits

## Technology Stack

- **Frontend**: React with Next.js
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State Management**: React Hooks and Context
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Payment Processing**: Stripe
- **API Communication**: Server-Sent Events (SSE) for real-time response streaming

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- API keys for AI providers (OpenAI, Anthropic, Google, Mistral)
- Stripe account for payment processing

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd ai-platform
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` to add your API keys and configuration

4. Set up the database
   ```bash
   npm run prisma:migrate
   ```

5. Generate Prisma client
   ```bash
   npm run prisma:generate
   ```

6. Run the development server
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

### Environment Variables

- `NEXTAUTH_URL`: Your application URL (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET`: Secret for JWT encryption
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `GOOGLE_API_KEY`: Google Gemini API key
- `MISTRAL_API_KEY`: Mistral AI API key
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `STRIPE_PRICE_PRO`: Stripe price ID for Pro subscription
- `STRIPE_PRICE_ENTERPRISE`: Stripe price ID for Enterprise subscription

## Subscription Tiers

- **Free Tier**: Basic model access with limited tokens (100,000)
- **Pro Tier**: Access to most models with higher token limits (1,000,000)
- **Enterprise Tier**: Full access to all models with maximum token limits (10,000,000)

## AI Router Implementation

The core of the platform is the AI Router system that intelligently distributes requests to the appropriate AI model:

1. **Request Analysis**: The router analyzes the user's input to detect the type of task (general, coding, creative writing, etc.)
2. **Model Selection**: Based on the task type, user subscription, and other factors, the router selects the best model
3. **Workload Distribution**: For large requests, the router can break them down and distribute segments to different models
4. **Response Aggregation**: Results are combined and streamed back to the user in real-time

## API Usage

The platform provides a REST API for developers to integrate AI capabilities into their applications.

### Authentication

```
Authorization: Bearer YOUR_API_KEY
```

### Endpoints

#### POST /api/v1/chat

Send a message to the AI model.

```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "modelId": "gpt-4o", // Optional, will auto-select if not specified
  "temperature": 0.7 // Optional, defaults to 0.7
}
```

## Development

### Database Management

- View and edit data: `npm run prisma:studio`
- Update schema: Edit `prisma/schema.prisma` then run `npm run prisma:migrate`

### Stripe Webhook Testing

For local development, you can use the Stripe CLI to forward webhook events:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Project Structure

- `/app`: Main application code (Next.js App Router)
- `/app/components`: React components 
- `/app/components/chat`: Chat interface components
- `/app/lib`: Utility functions and libraries
- `/app/api`: API route handlers
- `/prisma`: Database schema and migrations
- `/public`: Static assets

## License

[MIT](https://choosealicense.com/licenses/mit/)
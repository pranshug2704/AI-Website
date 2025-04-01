# Local LLM Integration with Ollama

This document outlines how to use locally hosted Large Language Models (LLMs) like Llama, DeepSeek, and Mistral through Ollama in the AI Platform.

## Overview

The AI Platform now supports running AI models locally on your machine through [Ollama](https://ollama.com/), providing several benefits:

- **Privacy**: Your data never leaves your machine
- **Cost**: No API usage costs
- **Speed**: Reduced latency for many operations
- **Offline Use**: Work without an internet connection

## Setup Instructions

### 1. Install Ollama

Follow the installation instructions for your platform:

**macOS**:
```bash
brew install ollama
```

**Linux**:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows**:
Download the Windows installer from [ollama.com/download/windows](https://ollama.com/download/windows).

### 2. Start Ollama

Once installed, start the Ollama service:

```bash
ollama serve
```

### 3. Download the Models

Pull the models you want to use:

```bash
# Download Llama 3 (recommended)
ollama pull llama3

# Download DeepSeek Coder (great for programming tasks)
ollama pull deepseek-coder

# Download Mistral (good all-around model)
ollama pull mistral
```

### 4. Configure the AI Platform

Ensure your `.env.local` file contains:

```
OLLAMA_URL=http://localhost:11434
ENABLE_OLLAMA=true
```

### 5. Run the Ollama Status Check

The AI Platform includes a utility to verify your Ollama setup:

```bash
npm run ollama-check
```

This will verify that Ollama is running and show which models are available.

## Using Local Models

1. Start your AI Platform application with `npm run dev`
2. When creating a new chat, select one of the local models (Llama 3, DeepSeek, or Mistral)
3. The interface will display status information about the local model
4. Start chatting with your locally hosted model!

## Troubleshooting

### Model Not Available

If you see "Model not found" error:
- Make sure you've pulled the model using `ollama pull <model-name>`
- Check that Ollama is running with `ollama serve`
- Restart the AI Platform application

### Performance Issues

Local models run on your machine's hardware. For better performance:
- Use a computer with a good GPU
- Adjust model settings if available
- Consider using smaller models for faster responses

### API Connection Error

If the AI Platform can't connect to Ollama:
- Verify Ollama is running
- Check that the `OLLAMA_URL` is set correctly
- Ensure no firewall is blocking the connection
- Try restarting Ollama and the AI Platform

## Advanced Configuration

### Custom Ollama Server

You can run Ollama on a different machine on your network by changing the `OLLAMA_URL` in your `.env.local`:

```
OLLAMA_URL=http://your-server-ip:11434
```

This allows you to use a more powerful machine on your network as your LLM server.

## Security Considerations

- Local LLMs process all data on your machine
- No data is sent to external servers
- Secure your network if exposing Ollama beyond localhost
- Keep Ollama updated for security patches 
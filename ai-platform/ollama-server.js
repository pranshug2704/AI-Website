#!/usr/bin/env node

/**
 * Ollama Server Checker
 * 
 * This script checks if Ollama is running locally and provides setup instructions if not.
 * Run this before using local models in the AI Platform.
 */

const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}=== AI Platform Local LLM Setup ===${colors.reset}`);
console.log(`${colors.cyan}Checking if Ollama is installed and running...${colors.reset}\n`);

// Check if Ollama is running by making a request to the API
function checkOllamaRunning() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/tags',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const models = JSON.parse(data);
          if (models && models.models) {
            resolve({ running: true, models: models.models });
          } else {
            resolve({ running: true, models: [] });
          }
        } catch (e) {
          resolve({ running: true, models: [] });
        }
      });
    });

    req.on('error', () => {
      resolve({ running: false });
    });

    req.end();
  });
}

// Get installation instructions for the current OS
function getInstallInstructions() {
  const platform = os.platform();
  
  switch (platform) {
    case 'darwin':
      return `
${colors.yellow}macOS Installation Instructions:${colors.reset}
1. Install with Homebrew:
   ${colors.green}brew install ollama${colors.reset}

2. Start Ollama:
   ${colors.green}ollama serve${colors.reset}

3. In a new terminal, pull the models:
   ${colors.green}ollama pull llama3${colors.reset}
   ${colors.green}ollama pull deepseek-coder${colors.reset}
   ${colors.green}ollama pull mistral${colors.reset}
`;

    case 'linux':
      return `
${colors.yellow}Linux Installation Instructions:${colors.reset}
1. Install Ollama:
   ${colors.green}curl -fsSL https://ollama.com/install.sh | sh${colors.reset}

2. Start Ollama:
   ${colors.green}ollama serve${colors.reset}

3. In a new terminal, pull the models:
   ${colors.green}ollama pull llama3${colors.reset}
   ${colors.green}ollama pull deepseek-coder${colors.reset}
   ${colors.green}ollama pull mistral${colors.reset}
`;

    case 'win32':
      return `
${colors.yellow}Windows Installation Instructions:${colors.reset}
1. Download the Windows installer from:
   ${colors.green}https://ollama.com/download/windows${colors.reset}

2. Run the installer and follow the instructions.

3. Open Command Prompt and pull the models:
   ${colors.green}ollama pull llama3${colors.reset}
   ${colors.green}ollama pull deepseek-coder${colors.reset}
   ${colors.green}ollama pull mistral${colors.reset}
`;

    default:
      return `
${colors.yellow}Installation Instructions:${colors.reset}
Please visit ${colors.green}https://ollama.com/download${colors.reset} for instructions on how to install Ollama on your platform.
`;
  }
}

async function main() {
  const ollamaStatus = await checkOllamaRunning();
  
  if (ollamaStatus.running) {
    console.log(`${colors.green}✓ Ollama is running!${colors.reset}`);
    
    if (ollamaStatus.models && ollamaStatus.models.length > 0) {
      console.log(`\n${colors.cyan}Available models:${colors.reset}`);
      ollamaStatus.models.forEach(model => {
        console.log(`- ${model.name}`);
      });
      
      // Check if our preferred models are available
      const neededModels = ['llama3', 'deepseek-coder', 'mistral'];
      const missingModels = neededModels.filter(model => 
        !ollamaStatus.models.some(m => m.name.includes(model))
      );
      
      if (missingModels.length > 0) {
        console.log(`\n${colors.yellow}Some recommended models are not installed:${colors.reset}`);
        missingModels.forEach(model => {
          console.log(`- Run ${colors.green}ollama pull ${model}${colors.reset} to install`);
        });
      }
    } else {
      console.log(`\n${colors.yellow}No models found. You need to pull the models:${colors.reset}`);
      console.log(`${colors.green}ollama pull llama3${colors.reset}`);
      console.log(`${colors.green}ollama pull deepseek-coder${colors.reset}`);
      console.log(`${colors.green}ollama pull mistral${colors.reset}`);
    }
    
    console.log(`\n${colors.blue}You can now use local models in the AI Platform.${colors.reset}`);
    console.log(`Make sure the OLLAMA_URL and ENABLE_OLLAMA are set in your .env.local file.`);
  } else {
    console.log(`${colors.red}✗ Ollama is not running.${colors.reset}`);
    console.log(getInstallInstructions());
    console.log(`${colors.yellow}Once installed, make sure to set up your environment:${colors.reset}`);
    console.log(`1. Add these lines to your .env.local file:`);
    console.log(`   ${colors.green}OLLAMA_URL=http://localhost:11434${colors.reset}`);
    console.log(`   ${colors.green}ENABLE_OLLAMA=true${colors.reset}`);
    console.log(`\n2. Restart your AI Platform server.`);
  }
}

main().catch(console.error); 
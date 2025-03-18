// Test script to verify the Google API key
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('❌ ERROR: Google API key not found in .env.local file');
  process.exit(1);
}

console.log(`✅ Google API key found: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);

// Make a simple test request to the Gemini API
async function testGoogleGeminiAPI() {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error (Status ${response.status}): ${errorText}`);
      process.exit(1);
    }
    
    const data = await response.json();
    console.log('✅ Google API request successful!');
    console.log('Available models:');
    data.models.forEach(model => {
      console.log(`- ${model.name}`);
    });
  } catch (error) {
    console.error('❌ Error testing Google API:', error.message);
    process.exit(1);
  }
}

testGoogleGeminiAPI(); 
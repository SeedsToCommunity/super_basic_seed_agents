import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testClaudeAPI() {
  try {
    console.log('Testing Claude API connection...\n');
    
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello! Please respond with a brief greeting to confirm the API is working.'
        }
      ],
    });

    console.log('✓ API call successful!\n');
    console.log('Response:');
    console.log(message.content[0].text);
    console.log('\nMessage ID:', message.id);
    console.log('Model:', message.model);
    
  } catch (error) {
    console.error('✗ API call failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testClaudeAPI();

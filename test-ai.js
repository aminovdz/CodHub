require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function run() {
  try {
    const res = await fetch('http://localhost:3001/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', type: 'text', provider: 'gemini', apiKey: process.env.GEMINI_API_KEY })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
  }
}
run();

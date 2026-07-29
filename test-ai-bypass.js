require('dotenv').config({ path: '.env' });

async function run() {
  try {
    const promptObj = {
      prompt: "Generate a short JSON test",
      type: "json",
      provider: "gemini",
      apiKey: process.env.GEMINI_API_KEY
    };

    console.log("Sending prompt:", promptObj);
    const res = await fetch('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptObj)
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
  }
}
run();

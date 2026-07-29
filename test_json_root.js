const fs = require('fs');

const cases = [
  // Case 1: Trailing markdown
  `\`\`\`json
{
  "a": 1,
  "b": { "c": 2 }
}
\`\`\``,
  // Case 2: Truncated JSON
  `{
  "a": 1,
  "b": { "c": 2`,
  // Case 3: Physical newlines
  `{
  "a": "hello
world"
}`,
  // Case 4: Normal JSON
  `{ "a": 1 }`
];

function fixJson(text) {
  let jsonString = text;
  const firstBrace = jsonString.indexOf('{');
  if (firstBrace !== -1) {
    jsonString = jsonString.slice(firstBrace);
  }

  let inString = false;
  let escapedJson = "";
  let openBraces = 0;
  let openBrackets = 0;
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    if (char === '"' && (i === 0 || jsonString[i - 1] !== '\\')) {
      inString = !inString;
    }
    
    if (inString) {
      if (char === '\n') escapedJson += '\\n';
      else if (char === '\r') escapedJson += '\\r';
      else if (char === '\t') escapedJson += '\\t';
      else escapedJson += char;
    } else {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
      
      escapedJson += char;

      // If we just closed the root object, we can stop!
      if (openBraces === 0 && openBrackets === 0) {
        break;
      }
    }
  }

  if (inString) {
    escapedJson += '"';
  }

  while (openBrackets > 0) {
    escapedJson += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    escapedJson += '}';
    openBraces--;
  }

  escapedJson = escapedJson.replace(/,(\s*[}\]])/g, '$1');
  return escapedJson;
}

cases.forEach((c, idx) => {
  console.log(`\n--- Case ${idx + 1} ---`);
  try {
    const fixed = fixJson(c);
    console.log("Fixed:", fixed);
    JSON.parse(fixed);
    console.log("SUCCESS");
  } catch(e) {
    console.log("FAILED:", e.message);
  }
});

const fs = require('fs');
const file = 'src/components/RichHtmlContent.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const regex = \/\\\[\(\?:product_checkout id="\(\[\^"\]\+\)"\|CHECKOUT_FORM\(\?::\(\[\^\\\]\]\+\)\)\?\)\\\]\/g;/,
  'const regex = /(?:\\[|&#91;|%5B)(?:product_checkout\\s+id="([^"]+)"|CHECKOUT_FORM(?:\\s*:\\s*([a-zA-Z0-9-]+))?)(?:\\]|&#93;|%5D)/g;'
);

fs.writeFileSync(file, content);

const fs = require('fs');

// Patch admin/agents/page.tsx
let file = 'src/app/admin/agents/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /\\\[CHECKOUT_FORM\(\?::\(\[\^\\\]\]\+\)\)\?\\\]/g,
  '(?:\\\\[|&#91;|%5B)CHECKOUT_FORM(?:\\\\s*:\\\\s*([a-zA-Z0-9-]+))?(?:\\\\]|&#93;|%5D)'
);
fs.writeFileSync(file, content);

// Patch admin/promo/page.tsx
file = 'src/app/admin/promo/page.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /\\\[CHECKOUT_FORM\(\?::\[\^\\\]\]\+\)\?\\\]/g,
  '(?:\\\\[|&#91;|%5B)CHECKOUT_FORM(?:\\\\s*:\\\\s*[a-zA-Z0-9-]+)?(?:\\\\]|&#93;|%5D)'
);
fs.writeFileSync(file, content);

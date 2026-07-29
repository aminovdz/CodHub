const fs = require('fs');
const file = 'src/app/[store]/(storefront)/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  /import \{ Store \} from '@\/lib\/store\/useAdminStore';/,
  `import { Store } from '@/lib/store/useAdminStore';\nimport RichHtmlContent from '@/components/RichHtmlContent';`
);

// Replace dangerouslySetInnerHTML with RichHtmlContent
content = content.replace(
  /<div dangerouslySetInnerHTML=\{\{ __html: block\.content \}\} \/>/g,
  `<RichHtmlContent html={block.content} region={region} />`
);

fs.writeFileSync(file, content);

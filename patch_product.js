const fs = require('fs');
const file = 'src/app/[store]/(storefront)/products/[slug]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  /import \{ Store \} from '@\/lib\/store\/useAdminStore';/,
  `import { Store } from '@/lib/store/useAdminStore';\nimport RichHtmlContent from '@/components/RichHtmlContent';`
);

// Replace dangerouslySetInnerHTML with RichHtmlContent
content = content.replace(
  /<div dangerouslySetInnerHTML=\{\{ __html: \(product as any\)\.mainDesc \|\| \(product as any\)\.description \}\} \/>/g,
  `<RichHtmlContent html={(product as any).mainDesc || (product as any).description} region={region} />`
);

content = content.replace(
  /<div key=\{block\.id\} className="w-full" dangerouslySetInnerHTML=\{\{ __html: block\.content \}\} \/>/g,
  `<RichHtmlContent key={block.id} html={block.content} region={region} />`
);

fs.writeFileSync(file, content);

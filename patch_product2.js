const fs = require('fs');
const file = 'src/app/[store]/(storefront)/products/[slug]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /import \{ useAdminStore, resolveStore \} from '@\/lib\/store\/useAdminStore';/,
  `import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';\nimport RichHtmlContent from '@/components/RichHtmlContent';`
);

fs.writeFileSync(file, content);

const file2 = 'src/app/[store]/(storefront)/page.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(
  /import \{ useAdminStore, resolveStore \} from '@\/lib\/store\/useAdminStore';/,
  `import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';\nimport RichHtmlContent from '@/components/RichHtmlContent';`
);

fs.writeFileSync(file2, content2);

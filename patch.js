const fs = require('fs');
const file = 'src/app/[store]/(funnel)/promo/[slug]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace everything between const [processedHtml... and return with just using RichHtmlContent
content = content.replace(
  /const \[processedHtml.*?\n  return \(/s,
  `return (
`
);

content = content.replace(
  /import InlineOrderForm from '@\/components\/InlineOrderForm';/,
  `import RichHtmlContent from '@/components/RichHtmlContent';`
);

content = content.replace(
  /<div \n          ref=\{containerRef\}\n          dangerouslySetInnerHTML=\{\{ __html: processedHtml \}\} \n          className="w-full"\n        \/>\n        \n        \{mountNodes\.map\(\(\{ id, node, productId \}\) => \n          createPortal\(\n            <div key=\{id\} className="px-4 py-8 w-full max-w-lg mx-auto">\n              <InlineOrderForm productId=\{productId\} region=\{region\} utmSource=\{utmSource\} utmCampaign=\{utmCampaign\} \/>\n            <\/div>,\n            node\n          \)\n        \)\}/s,
  `<RichHtmlContent html={activeVariant.htmlContent} region={region} utmSource={utmSource} utmCampaign={utmCampaign} />`
);

fs.writeFileSync(file, content);

const fs = require('fs');
const file = 'src/app/[store]/(funnel)/promo/[slug]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// I need to put the loading states back!
content = content.replace(
  /return \(\n\n    <>\n      <div className="w-full min-h-screen bg-white">/,
  `// Show spinner while data is still loading from Supabase
  if (!_hasHydrated || (matchedPages.length > 0 && !activeVariant)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-slate-500 font-bold">Loading promo...</p>
      </div>
    );
  }

  if (matchedPages.length === 0 || !activeVariant) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-black text-slate-900 mb-4">Promo Page Not Found</h1>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-h-screen bg-white">`
);

fs.writeFileSync(file, content);

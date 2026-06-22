import React, { useEffect, useRef } from 'react';
import 'grapesjs/dist/css/grapes.min.css';

interface Props {
  initialHtml: string;
  onSave: (html: string) => void;
  onClose: () => void;
}

export default function GrapesEditor({ initialHtml, onSave, onClose }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initEditor = async () => {
      if (!editorRef.current) return;

      const grapesjs = (await import('grapesjs')).default;
      const webpagePreset = (await import('grapesjs-preset-webpage')).default;
      const basicBlocks = (await import('grapesjs-blocks-basic')).default;

      if (!isMounted) return;

      editorInstance.current = grapesjs.init({
        container: editorRef.current,
        fromElement: false,
        height: '100vh',
        width: 'auto',
        storageManager: false,
        plugins: [webpagePreset, basicBlocks],
        components: initialHtml,
        canvas: {
          scripts: [
            'https://cdn.tailwindcss.com'
          ]
        }
      });

    // Add a save button to the top panel
    editorInstance.current.Panels.addButton('options', {
      id: 'save-db',
      label: '💾 Save Page',
      className: 'gjs-btn-save font-bold px-2',
      command: 'save-db',
      attributes: { title: 'Save Page' }
    });

    editorInstance.current.Commands.add('save-db', {
      run: (editor: any) => {
        const html = editor.getHtml();
        const css = editor.getCss();
        // Append custom CSS inside a style tag
        const finalHtml = `<style>${css}</style>\n${html}`;
        onSave(finalHtml);
      }
    });

    // Add a close button
    editorInstance.current.Panels.addButton('options', {
      id: 'close',
      label: '❌ Close',
      className: 'gjs-btn-close font-bold px-2',
      command: 'close-editor',
      attributes: { title: 'Close Editor' }
    });

    editorInstance.current.Commands.add('close-editor', {
      run: () => {
        onClose();
      }
    });

    // Add E-Commerce Blocks
    editorInstance.current.BlockManager.add('checkout-form', {
      label: 'Order Form',
      category: 'E-Commerce',
      content: '<div class="p-8 my-4 border-2 border-dashed border-indigo-400 bg-indigo-50 text-indigo-700 font-bold text-center rounded-xl text-xl">🛒 [CHECKOUT_FORM]</div>',
    });

    editorInstance.current.BlockManager.add('checkout-link', {
      label: 'Checkout Button',
      category: 'E-Commerce',
      content: '<div class="text-center my-4"><a href="../checkout" class="inline-block px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors text-xl">Buy Now</a></div>',
    });

    // Add Typography Blocks
    editorInstance.current.BlockManager.add('h1-heading', {
      label: 'Main Headline (H1)',
      category: 'Typography',
      content: '<h1 class="text-4xl md:text-6xl font-extrabold text-center text-gray-900 my-6 tracking-tight leading-tight">Your Main Headline Here</h1>',
    });

    editorInstance.current.BlockManager.add('h2-heading', {
      label: 'Sub Headline (H2)',
      category: 'Typography',
      content: '<h2 class="text-3xl md:text-4xl font-bold text-center text-gray-800 my-4 leading-snug">Your Sub Headline Here</h2>',
    });
    
    editorInstance.current.BlockManager.add('paragraph', {
      label: 'Paragraph',
      category: 'Typography',
      content: '<p class="text-lg md:text-xl text-gray-600 text-center max-w-3xl mx-auto my-4 leading-relaxed">This is a descriptive paragraph. Use this space to explain the benefits of your product, build trust, and persuade the customer.</p>',
    });

    // Add Media Blocks
    editorInstance.current.BlockManager.add('centered-image', {
      label: 'Centered Image',
      category: 'Media',
      content: '<div class="flex justify-center items-center w-full my-8 px-4"><img src="https://via.placeholder.com/800x600" alt="Centered Image" class="rounded-2xl shadow-2xl max-w-full h-auto object-cover" /></div>',
    });

    // Add Layout Blocks
    editorInstance.current.BlockManager.add('hero-section', {
      label: 'Hero Section',
      category: 'Sections',
      content: `
        <section class="w-full bg-slate-50 py-16 md:py-24 px-4 text-center flex flex-col items-center justify-center">
          <span class="text-indigo-600 font-semibold tracking-wider uppercase text-sm mb-4">Limited Time Offer</span>
          <h1 class="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">The Ultimate Product</h1>
          <p class="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">Discover how this amazing product will change your life forever. Order now and get free shipping!</p>
          <a href="../checkout" class="inline-block px-10 py-5 bg-indigo-600 text-white font-bold rounded-full shadow-xl hover:bg-indigo-700 transition-transform hover:scale-105 text-xl">Order Now - 50% OFF</a>
        </section>
      `,
    });

    editorInstance.current.BlockManager.add('feature-grid', {
      label: 'Feature Grid',
      category: 'Sections',
      content: `
        <section class="w-full py-16 px-4 bg-white">
          <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div class="p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
              <div class="text-4xl mb-4">🚀</div>
              <h3 class="text-2xl font-bold text-slate-800 mb-3">Fast Delivery</h3>
              <p class="text-slate-600">Get your product delivered to your doorstep in record time.</p>
            </div>
            <div class="p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
              <div class="text-4xl mb-4">⭐</div>
              <h3 class="text-2xl font-bold text-slate-800 mb-3">Premium Quality</h3>
              <p class="text-slate-600">We use only the highest quality materials for our products.</p>
            </div>
            <div class="p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
              <div class="text-4xl mb-4">🛡️</div>
              <h3 class="text-2xl font-bold text-slate-800 mb-3">Secure Checkout</h3>
              <p class="text-slate-600">Your information is safe and secure with our encrypted checkout.</p>
            </div>
          </div>
        </section>
      `,
    });

    editorInstance.current.BlockManager.add('trust-badges', {
      label: 'Trust Badges',
      category: 'Sections',
      content: `
        <div class="flex flex-wrap justify-center items-center gap-6 py-8 border-y border-slate-200 bg-slate-50 my-8 w-full">
          <div class="flex items-center gap-2 text-slate-700 font-semibold"><span class="text-2xl">🔒</span> Secure Payment</div>
          <div class="flex items-center gap-2 text-slate-700 font-semibold"><span class="text-2xl">🚚</span> Free Shipping</div>
          <div class="flex items-center gap-2 text-slate-700 font-semibold"><span class="text-2xl">⭐</span> Satisfaction Guarantee</div>
        </div>
      `,
    });

    };

    initEditor();

    return () => {
      isMounted = false;
      if (editorInstance.current) {
        editorInstance.current.destroy();
      }
    };
  }, [initialHtml, onClose, onSave]);

  return (
    <div className="fixed inset-0 z-[200] bg-white">
      <div ref={editorRef} />
    </div>
  );
}

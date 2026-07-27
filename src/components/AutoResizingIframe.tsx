'use client';
import { useEffect, useRef, useState } from 'react';

export function AutoResizingIframe({ html, onCheckout }: { html: string, onCheckout?: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
      const handleMessage = (e: MessageEvent) => {
      if (e.data && iframeRef.current?.contentWindow === e.source) {
        if (e.data.type === 'iframeHeight') {
          setHeight(e.data.height);
        } else if (e.data.type === 'scrollToHash') {
          const element = document.querySelector(e.data.hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (e.data.type === 'redirectToCheckout' && onCheckout) {
          onCheckout();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { margin: 0; overflow-y: hidden; }
        </style>
        <script>
          function sendHeight() {
            window.parent.postMessage({ type: 'iframeHeight', height: document.documentElement.scrollHeight }, '*');
          }
          window.addEventListener('load', sendHeight);
          window.addEventListener('resize', sendHeight);
          const observer = new MutationObserver(sendHeight);
          window.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true, attributes: true });
            
            // Intercept anchor clicks
            document.addEventListener('click', (e) => {
              const anchor = e.target.closest('a');
              const btn = e.target.closest('button');
              
              if (anchor) {
                const href = anchor.getAttribute('href') || '';
                if (href.startsWith('#')) {
                  e.preventDefault();
                  window.parent.postMessage({ type: 'scrollToHash', hash: href }, '*');
                  return;
                }
                
                // If the link is trying to go to checkout or is a buy button
                if (href.toLowerCase().includes('checkout') || 
                    anchor.classList.contains('buy-now-btn') ||
                    anchor.textContent?.toLowerCase().includes('buy') ||
                    anchor.textContent?.includes('اطلب') ||
                    anchor.textContent?.includes('شراء')) {
                  e.preventDefault();
                  window.parent.postMessage({ type: 'redirectToCheckout', href }, '*');
                  return;
                }
              }
              
              if (btn) {
                 if (btn.classList.contains('buy-now-btn') ||
                     btn.textContent?.toLowerCase().includes('buy') ||
                     btn.textContent?.includes('اطلب') ||
                     btn.textContent?.includes('شراء')) {
                    e.preventDefault();
                    window.parent.postMessage({ type: 'redirectToCheckout' }, '*');
                    return;
                 }
              }
            });
          });
          // Also check height periodically just in case fonts/images load late
          setInterval(sendHeight, 500);
        </script>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      style={{ width: '100%', height: height > 0 ? `${height}px` : '100px', border: 'none', display: 'block' }}
      scrolling="no"
    />
  );
}

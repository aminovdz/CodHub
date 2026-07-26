'use client';
import { useEffect, useRef, useState } from 'react';

export function AutoResizingIframe({ html }: { html: string }) {
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
              if (anchor && anchor.getAttribute('href')?.startsWith('#')) {
                e.preventDefault();
                window.parent.postMessage({ type: 'scrollToHash', hash: anchor.getAttribute('href') }, '*');
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

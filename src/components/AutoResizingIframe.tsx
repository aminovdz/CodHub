'use client';
import { useEffect, useRef, useState } from 'react';

export function AutoResizingIframe({ html, onCheckout, onExtractSticky, isStickyContainer = false, onHeightChange }: { html: string, onCheckout?: () => void, onExtractSticky?: (html: string) => void, isStickyContainer?: boolean, onHeightChange?: (height: number) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
      const handleMessage = (e: MessageEvent) => {
      if (e.data && iframeRef.current?.contentWindow === e.source) {
        if (e.data.type === 'iframeHeight') {
          setHeight(e.data.height);
          if (onHeightChange) onHeightChange(e.data.height);
        } else if (e.data.type === 'scrollToHash') {
          const element = document.querySelector(e.data.hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (e.data.type === 'redirectToCheckout' && onCheckout) {
          onCheckout();
        } else if (e.data.type === 'extractedSticky' && onExtractSticky) {
          onExtractSticky(e.data.html);
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
            
            ${!isStickyContainer ? `
            // Extract sticky elements to parent
            setTimeout(() => {
              const possibleFixed = document.querySelectorAll('.fixed, .sticky, [style*="fixed"], [style*="sticky"]');
              let extractedHtml = '';
              possibleFixed.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'sticky') {
                  if (style.bottom !== 'auto' || el.classList.contains('bottom-0') || el.classList.contains('bottom-2') || el.classList.contains('bottom-4') || el.classList.contains('bottom-6')) {
                    const clone = el.cloneNode(true);
                    clone.style.position = 'relative';
                    clone.style.bottom = 'auto';
                    clone.classList.remove('fixed', 'sticky', 'bottom-0', 'bottom-2', 'bottom-4', 'bottom-6');
                    extractedHtml += clone.outerHTML;
                    el.style.display = 'none';
                  }
                }
              });
              if (extractedHtml) {
                window.parent.postMessage({ type: 'extractedSticky', html: extractedHtml }, '*');
              }
            }, 100);
            ` : ''}

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
      <body class="${isStickyContainer ? 'bg-transparent' : ''}">
        ${html}
      </body>
    </html>
  `;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      style={{ width: '100%', height: height > 0 ? `${height}px` : (isStickyContainer ? '0px' : '10px'), border: 'none', display: 'block', visibility: height > 0 || !isStickyContainer ? 'visible' : 'hidden' }}
      scrolling="no"
    />
  );
}

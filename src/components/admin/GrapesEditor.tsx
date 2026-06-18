import React, { useEffect, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import webpagePreset from 'grapesjs-preset-webpage';
import basicBlocks from 'grapesjs-blocks-basic';

interface Props {
  initialHtml: string;
  onSave: (html: string) => void;
  onClose: () => void;
}

export default function GrapesEditor({ initialHtml, onSave, onClose }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    editorInstance.current = grapesjs.init({
      container: editorRef.current,
      fromElement: false,
      height: '100vh',
      width: 'auto',
      storageManager: false,
      plugins: [webpagePreset, basicBlocks],
      components: initialHtml,
      canvas: {
        styles: [
          'https://cdn.tailwindcss.com'
        ]
      }
    });

    // We can add a custom tailwind script inside the canvas to parse classes
    editorInstance.current.Canvas.getBody().appendChild(
      document.createElement('script')
    ).src = 'https://cdn.tailwindcss.com';

    // Add a save button to the top panel
    editorInstance.current.Panels.addButton('options', {
      id: 'save-db',
      className: 'fa fa-floppy-o',
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
      className: 'fa fa-times',
      command: 'close-editor',
      attributes: { title: 'Close Editor' }
    });

    editorInstance.current.Commands.add('close-editor', {
      run: () => {
        onClose();
      }
    });

    return () => {
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

import React, { useRef, useEffect, useState } from "react";

interface HtmlBlockProps {
  content: string;
}

const HtmlBlock: React.FC<HtmlBlockProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.1); // Start small

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Calculate scale to fit 1920px into container width
        const newScale = containerWidth / 1920;
        setScale(newScale);
      }
    };

    // Initial calculation
    updateScale();

    // Observe resize
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-video overflow-hidden bg-[var(--vscode-editor-background,#1e1e1e)] rounded-[var(--border-radius)] border border-[var(--vscode-widget-border)] relative"
    >
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: "1920px",
          height: "1080px",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { margin: 0; overflow: hidden; background-color: var(--vscode-editor-background, #fff); color: var(--vscode-editor-foreground, #000); height: 100vh; width: 100vw; }
                  /* Basic Reset */
                  * { box-sizing: border-box; }
                </style>
              </head>
              <body>
                ${content}
              </body>
            </html>
          `}
          className="w-full h-full border-none pointer-events-auto"
        />
      </div>
    </div>
  );
};

export default HtmlBlock;
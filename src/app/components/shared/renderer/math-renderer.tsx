"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  content: string;
}

export default function MathRenderer({ content }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof content !== "string") return;

    let processedContent = content;

    // Handle block math ($$...$$)
    processedContent = processedContent.replace(
      /\$\$(.*?)\$\$/g,
      (match, p1) => {
        return `
  
  ${katex.renderToString(p1, { displayMode: true })}
  
  `;
      }
    );

    // Handle inline math ($...$)
    processedContent = processedContent.replace(/\$(.*?)\$/g, (match, p1) => {
      return katex.renderToString(p1, { displayMode: false });
    });

    containerRef.current.innerHTML = processedContent;
  }, [content]);

  return <div ref={containerRef} className="math-renderer"></div>;
}

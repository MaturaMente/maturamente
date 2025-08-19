"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import Image from "next/image";

interface MarkdownRendererProps {
  content: string | string[];
  className?: string;
}

export default function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  // Process the content based on its type
  const processContent = () => {
    // If content is an array, join it with newlines
    if (Array.isArray(content)) {
      return content.join("\n\n");
    }

    // If content is a string but looks like a stringified array, parse and join it
    if (
      typeof content === "string" &&
      content.trim().startsWith("[") &&
      content.trim().endsWith("]")
    ) {
      try {
        const parsedContent = JSON.parse(content);
        if (Array.isArray(parsedContent)) {
          return parsedContent.join("\n\n");
        }
      } catch {
        // If parsing fails, just use the string as is
      }
    }

    // Otherwise, return the content as is
    return content as string;
  };

  const formattedContent = processContent();

  return (
    <div
      className={`markdown-content w-full ${className}`}
      style={{
        display: "block",
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch", // For smoother scrolling on iOS
      }}
    >
      <style jsx global>{`
        /* ==========================================
           BASE CONTAINER STYLES
           ========================================== */
        .markdown-content {
          width: 100%;
          box-sizing: border-box;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        /* ==========================================
           KATEX DISPLAY MATH STYLES
           ========================================== */
        .katex-display {
          font-size: 1.1em;
          display: block;
          box-sizing: border-box;
          overflow-x: auto; /* Allow horizontal scrolling if content is too wide */
          overflow-y: hidden;
          max-width: 100%; /* Do not exceed parent width */
          width: 100%; /* Occupy parent's width, constrained by max-width */
          margin: 1.2em 0; /* Consistent vertical margin */
          /* Smooth scrolling and containment */
          scroll-behavior: smooth;
          isolation: isolate;
          /* Custom scrollbar styling */
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground)) transparent;
        }

        /* Webkit scrollbar styling for KaTeX displays */
        .katex-display::-webkit-scrollbar {
          height: 4px;
        }

        .katex-display::-webkit-scrollbar-track {
          background: transparent;
        }

        .katex-display::-webkit-scrollbar-thumb {
          background-color: hsl(var(--muted-foreground) / 0.3);
          border-radius: 2px;
        }

        .katex-display::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--muted-foreground) / 0.5);
        }

        /* Inner KaTeX content within display blocks */
        .katex-display > .katex {
          display: block;
          box-sizing: border-box;
          max-width: 100%;
          text-align: center;
          width: fit-content;
          margin: 0 auto; /* Center the content */
        }

        /* Visual scroll indicator for display math */
        .katex-display {
          position: relative;
        }

        .katex-display::after {
          content: "";
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 20px;
          background: linear-gradient(
            to right,
            transparent,
            hsl(var(--background)) 70%
          );
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        /* Show indicator when content overflows */
        .katex-display:has(.katex:hover)::after,
        .katex-display.scrollable::after {
          opacity: 1;
        }

        /* Container query support for future use */
        @supports (container-type: inline-size) {
          .katex-display {
            container-type: inline-size;
          }
        }

        /* ==========================================
           KATEX INLINE MATH STYLES
           ========================================== */
        .katex {
          box-sizing: border-box;
          max-width: 100%;
        }

        .katex:not(.katex-display .katex) {
          display: inline-block;
          max-width: 100%;
          vertical-align: baseline;
        }

        /* ==========================================
           RESPONSIVE / MOBILE STYLES
           ========================================== */

        /* Mobile devices (≤640px) */
        @media (max-width: 640px) {
          .markdown-content {
            font-size: 1em;
          }

          .katex {
            font-size: 1.1em; /* Larger and readable size on mobile */
          }

          .katex-display {
            font-size: 1.1em; /* Large readable size for display math on mobile */
            padding: 1em 0.5em;
            -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
          }

          /* Always show subtle indicator on mobile when content might overflow */
          .katex-display::after {
            opacity: 0.3;
          }
        }

        /* Very small screens (≤480px) */
        @media (max-width: 480px) {
          .katex {
            font-size: 1.1em;
          }

          .katex-display {
            padding-left: 1em;
            padding-right: 1em;
            padding-top: 0.5em;
            padding-bottom: 0.5em;
          }

          /* Scale down inline math slightly to prevent overflow */
          .katex:not(.katex-display .katex) {
            max-width: calc(100vw - 2rem); /* Account for padding */
            transform: scale(0.95);
          }
        }

        /* Extra small screens (≤320px) */
        @media (max-width: 320px) {
          .katex:not(.katex-display .katex) {
            transform: scale(0.9);
          }
        }

        /* ==========================================
           CONTENT ELEMENTS STYLES
           ========================================== */

        /* Paragraphs, headings, and lists */
        .markdown-content p,
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6,
        .markdown-content ul,
        .markdown-content ol {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* ==========================================
           TABLE STYLES
           ========================================== */
        .markdown-content table {
          display: table;
          width: 100%;
          max-width: 100%;
          margin-bottom: 1rem;
          border-collapse: collapse;
          table-layout: fixed; /* Fixed layout for equal column widths */
        }

        .markdown-content table th,
        .markdown-content table td {
          width: auto;
          text-align: center;
          padding: 0.75rem 1rem;
          border: 1px solid hsl(var(--border));
          word-wrap: break-word; /* Allow text to wrap */
          min-width: 100px;
        }

        .markdown-content thead {
          background-color: hsl(var(--muted) / 0.5);
        }

        .markdown-content tbody tr:hover {
          background-color: hsl(var(--muted) / 0.3);
        }

        /* ==========================================
           CODE BLOCK STYLES
           ========================================== */
        .markdown-content pre {
          overflow-x: auto;
          padding: 0.75rem;
          margin-bottom: 1rem;
          border-radius: var(--radius);
          background-color: hsl(var(--muted));
          width: 100%;
          max-width: 100%;
        }

        /* ==========================================
           IMAGE STYLES
           ========================================== */
        .markdown-content img {
          max-width: 100%;
          height: auto;
          margin: 1em auto;
          display: block;
          max-height: 600px;
        }

        @media (min-width: 768px) {
          .markdown-content img {
            max-width: 85%;
          }
        }

        @media (min-width: 1024px) {
          .markdown-content img {
            max-width: 80%;
          }
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          // When using markdown, the p tag is the default container for text
          p: ({ node, ...props }) => {
            // Check if paragraph contains only an image
            const hasOnlyImage =
              node?.children?.length === 1 &&
              node.children[0].type === "element" &&
              node.children[0].tagName === "img";

            // If it contains only an image, render a div instead of a p to avoid nesting issues
            if (hasOnlyImage) {
              return <div {...props} className="my-8" />;
            }

            // Otherwise render a normal paragraph
            return <p {...props} className="mb-2 last:mb-0 w-full" />;
          },
          h1: (props) => (
            <h2
              {...props}
              className="text-3xl font-semibold mt-8 first:mt-0 mb-4 w-full"
            />
          ),
          h2: (props) => (
            <h3
              {...props}
              className="text-2xl font-semibold mt-8 first:mt-0 mb-3 w-full"
            />
          ),
          h3: (props) => (
            <h4
              {...props}
              className="text-xl font-semibold mt-8 first:mt-0 mb-2 w-full"
            />
          ),
          ul: (props) => (
            <ul {...props} className="list-disc pl-5 mb-2 last:mb-0 w-full" />
          ),
          ol: (props) => (
            <ol
              {...props}
              className="list-decimal pl-5 mb-2 last:mb-0 w-full"
            />
          ),
          li: (props) => <li {...props} className="mb-2 last:mb-0" />,
          code: (props) => (
            <code {...props} className="bg-muted rounded px-1 py-0.5" />
          ),
          pre: (props) => (
            <pre
              {...props}
              className="bg-muted rounded p-3 mb-4 overflow-x-auto w-full"
            />
          ),
          blockquote: (props) => (
            <blockquote
              {...props}
              className="border-l-4 border-muted pl-4 italic mb-4 w-full"
            />
          ),
          img: ({ src, alt, ...props }) => {
            if (!src || typeof src !== "string") return null;

            return (
              <div className="my-8 w-full flex justify-center">
                <div className="relative max-w-full max-h-[600px] w-auto h-auto">
                  <Image
                    src={src}
                    alt={alt || "image"}
                    width={800}
                    height={600}
                    className="rounded-lg border border-muted object-contain"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "600px",
                      width: "auto",
                      height: "auto",
                    }}
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                    unoptimized={
                      src.startsWith("data:") || src.endsWith(".svg")
                    }
                  />
                </div>
              </div>
            );
          },
          // Table components
          table: ({ node, ...props }) => {
            return (
              <div className="overflow-x-auto w-full my-6">
                <table
                  {...props}
                  className="w-full border-collapse border border-border rounded-md"
                />
              </div>
            );
          },
          thead: (props) => <thead {...props} className="bg-muted/50" />,
          tbody: (props) => <tbody {...props} />,
          tr: (props) => (
            <tr
              {...props}
              className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            />
          ),
          th: (props) => (
            <th
              {...props}
              className="px-4 py-3 font-semibold text-foreground"
              style={{ textAlign: "center" }}
            />
          ),
          td: (props) => (
            <td
              {...props}
              className="px-4 py-3 text-foreground"
              style={{ textAlign: "center" }}
            />
          ),
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
}

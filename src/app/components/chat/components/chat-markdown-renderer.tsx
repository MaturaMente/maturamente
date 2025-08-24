"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type Props = {
  content: string;
  className?: string;
};

export default function ChatMarkdownRenderer({
  content,
  className = "",
}: Props) {
  return (
    <div className={`w-full leading-7 text-sm sm:text-base ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          p: (props) => <p {...props} />,
          h1: (props) => (
            <h2
              {...props}
              className="text-xl sm:text-2xl font-semibold mt-6 mb-3"
            />
          ),
          h2: (props) => (
            <h3
              {...props}
              className="text-lg sm:text-xl font-semibold mt-6 mb-2"
            />
          ),
          h3: (props) => (
            <h4
              {...props}
              className="text-base sm:text-lg font-semibold mt-6 mb-2"
            />
          ),
          ul: (props) => (
            <ul {...props} className="list-disc pl-5 space-y-2 mb-3" />
          ),
          ol: (props) => (
            <ol {...props} className="list-decimal pl-5 space-y-2 mb-3" />
          ),
          li: (props) => <li {...props} className="break-words" />,
          code: (props) => (
            <code
              {...props}
              className="bg-muted/60 rounded px-1 py-0.5 text-[0.9em]"
            />
          ),
          pre: (props) => (
            <pre
              {...props}
              className="bg-muted rounded-lg p-4 mb-4 overflow-x-auto"
            />
          ),
          blockquote: (props) => (
            <blockquote
              {...props}
              className="border-l-2 border-border pl-3 italic text-muted-foreground"
            />
          ),
          table: (props) => (
            <div className="overflow-x-auto my-4">
              <table {...props} className="w-full text-sm" />
            </div>
          ),
          th: (props) => (
            <th {...props} className="px-3 py-2 bg-muted/50 font-medium" />
          ),
          td: (props) => <td {...props} className="px-3 py-2 border-t" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

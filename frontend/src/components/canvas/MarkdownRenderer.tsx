import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ── Error Boundary ──────────────────────────────────────────────────────
class MarkdownErrorBoundary extends Component<
  { children: ReactNode; fallbackContent: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallbackContent: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[MarkdownRenderer] Render error caught:", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
          {this.props.fallbackContent}
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Content Sanitiser ───────────────────────────────────────────────────
function sanitizeMarkdown(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let text = raw;

  // Fix escaped newlines from JSON (\\n → \n)
  text = text.replace(/\\n/g, "\n");

  // Remove null / undefined literal strings
  text = text.replace(/\bnull\b|\bundefined\b/g, "");

  // Fix broken table rows – ensure pipes at start/end
  text = text.replace(/^(\|.*[^|])\s*$/gm, "$1|");

  // Normalise blockquotes: ensure space after >
  text = text.replace(/^>((?!\s))/gm, "> $1");

  // Remove stray HTML-like tags that might crash the renderer
  text = text.replace(/<(?!\/?(br|hr|img|a|em|strong|code|del|sub|sup|table|thead|tbody|tr|th|td|ul|ol|li|p|h[1-6]|blockquote|pre|div|span)\b)[^>]+>/gi, "");

  // Trim excessive blank lines (more than 2 consecutive)
  text = text.replace(/\n{4,}/g, "\n\n\n");

  return text.trim();
}

// ── YouTube Embed ───────────────────────────────────────────────────────
function YouTubeEmbed({ url }: { url: string }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)?.[1];
  if (!videoId) return null;

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border/40 shadow-sm">
      {showPlayer ? (
        <iframe
          width="100%"
          height="200"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="border-0"
        />
      ) : (
        <div className="relative cursor-pointer group" onClick={() => setShowPlayer(true)}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
            alt="YouTube thumbnail"
            className="w-full h-auto"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mermaid Diagram ─────────────────────────────────────────────────────
function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
          securityLevel: "loose",
        });
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code.trim());
        if (!cancelled) setSvg(renderedSvg);
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <pre className="rounded-lg p-3 mb-3 overflow-x-auto text-xs font-mono border border-destructive/30 bg-destructive/5 text-destructive">
        <code>{code}</code>
        <div className="mt-2 text-[10px] text-destructive/60">Mermaid rendering error</div>
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg p-4 mb-3 border border-border/40 bg-muted/20 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 rounded-lg overflow-x-auto border border-border/40 bg-background/50 p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ── Syntax-Highlighted Code Block ───────────────────────────────────────
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="relative group rounded-lg overflow-hidden mb-3 border border-border/40">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/30">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          color: "rgba(255,255,255,0.25)",
          fontSize: "0.7rem",
          userSelect: "none",
        }}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.8rem",
          background: "rgba(0, 0, 0, 0.6)",
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// ── Main Renderer ───────────────────────────────────────────────────────
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const sanitized = sanitizeMarkdown(content);

  // If content is empty after sanitisation, show nothing
  if (!sanitized) return null;

  return (
    <MarkdownErrorBoundary fallbackContent={sanitized}>
      <div className={cn("markdown-content", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-foreground border-b border-border/30 pb-1">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0 text-foreground border-b border-border/20 pb-0.5">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mb-1.5 mt-2 first:mt-0 text-foreground/90">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-sm font-medium mb-1 mt-2 first:mt-0 text-foreground/85">
                {children}
              </h4>
            ),
            h5: ({ children }) => (
              <h5 className="text-xs font-medium mb-1 mt-1.5 first:mt-0 text-foreground/80">
                {children}
              </h5>
            ),
            h6: ({ children }) => (
              <h6 className="text-xs font-medium mb-1 mt-1 first:mt-0 text-foreground/75">
                {children}
              </h6>
            ),
            p: ({ children }) => {
              const childArray = Array.isArray(children) ? children : [children];
              const processed = childArray.map((child, i) => {
                if (typeof child === "string") {
                  const ytMatch = child.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+[^\s]*)/);
                  if (ytMatch) {
                    return <YouTubeEmbed key={i} url={ytMatch[1]} />;
                  }
                }
                return child;
              });
              return (
                <p className="mb-2.5 last:mb-0 text-[0.95rem] leading-relaxed text-foreground/85">
                  {processed}
                </p>
              );
            },
            ul: ({ children }) => (
              <ul className="mb-3 pl-5 space-y-1.5 list-disc" style={{ color: "#30A65B" }}>
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 pl-5 space-y-1.5 list-decimal text-[0.95rem]" style={{ color: "#D2BF7B" }}>
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-[0.95rem] text-foreground/85 leading-relaxed">
                {children}
              </li>
            ),
            code: ({ children, className: codeClassName }) => {
              const isMermaid = codeClassName === "language-mermaid";
              if (isMermaid) {
                return <MermaidDiagram code={String(children)} />;
              }

              const isInline = !codeClassName;
              if (isInline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded-md text-[0.85em] font-mono font-medium border"
                    style={{
                      backgroundColor: "rgba(141, 172, 223, 0.15)",
                      color: "#8DACDF",
                      borderColor: "rgba(141, 172, 223, 0.25)",
                    }}
                  >
                    {children}
                  </code>
                );
              }

              const language = codeClassName?.replace("language-", "") || "text";
              const codeString = String(children).replace(/\n$/, "");
              return <CodeBlock language={language} code={codeString} />;
            },
            pre: ({ children }) => {
              const child = Array.isArray(children) ? children[0] : children;
              if (child && typeof child === "object" && "props" in child) {
                const childProps = child.props as any;
                if (childProps?.className === "language-mermaid") {
                  return <MermaidDiagram code={String(childProps.children)} />;
                }
                // If it's a code block, the <code> component already handles rendering
                if (childProps?.className?.startsWith("language-")) {
                  return <>{children}</>;
                }
              }
              return (
                <pre
                  className="rounded-lg p-3 mb-3 overflow-x-auto text-sm font-mono border"
                  style={{
                    backgroundColor: "rgba(141, 172, 223, 0.08)",
                    borderColor: "rgba(141, 172, 223, 0.2)",
                  }}
                >
                  {children}
                </pre>
              );
            },
            blockquote: ({ children }) => (
              <blockquote
                className="border-l-3 pl-4 pr-3 py-2 my-3 rounded-r-lg"
                style={{ borderColor: "#B48EAD", backgroundColor: "rgba(210, 191, 123, 0.1)" }}
              >
                <div className="text-[0.95rem] text-foreground/80 italic">
                  {children}
                </div>
              </blockquote>
            ),
            a: ({ href, children }) => {
              if (href && /youtube\.com\/watch|youtu\.be\//.test(href)) {
                return <YouTubeEmbed url={href} />;
              }
              return (
                <a
                  href={href}
                  className="underline underline-offset-2 transition-colors font-medium"
                  style={{ color: "#8DACDF" }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              );
            },
            strong: ({ children }) => (
              <strong className="font-semibold" style={{ color: "#30A65B" }}>
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic font-medium" style={{ color: "#D2BF7B" }}>
                {children}
              </em>
            ),
            del: ({ children }) => (
              <del className="text-muted-foreground/50 line-through">
                {children}
              </del>
            ),
            hr: () => <hr className="my-4 border-t border-border/40" />,
            img: ({ src, alt }) => (
              <img
                src={src ?? ""}
                alt={alt ?? ""}
                className="my-3 max-h-60 w-auto rounded-lg border border-border/40 shadow-sm"
                loading="lazy"
              />
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto mb-3 rounded-lg border border-border/40">
                <table className="w-full border-collapse text-[0.95rem]">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead style={{ backgroundColor: "rgba(250, 120, 107, 0.08)" }}>{children}</thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-border/20 last:border-b-0">{children}</tr>
            ),
            th: ({ children }) => (
              <th
                className="border-b px-3 py-2 text-left font-semibold text-sm"
                style={{ borderColor: "rgba(250, 120, 107, 0.2)", color: "#FA786B" }}
              >
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-b border-border/20 px-3 py-2 text-foreground/80 text-sm">
                {children}
              </td>
            ),
            // Catch-all for any element that might cause issues
            input: ({ type, checked, ...rest }) => {
              if (type === "checkbox") {
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mr-2 accent-primary"
                    {...rest}
                  />
                );
              }
              return null;
            },
            // Task list items (GFM)
            section: ({ children, ...props }) => <section {...props}>{children}</section>,
          }}
        >
          {sanitized}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
}

import type { ReactNode } from "react";

function inline(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function MarkdownView({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let inCode = false;
  let code: string[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCode) { nodes.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>); code = []; }
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    if (!line.trim()) { nodes.push(<div className="md-gap" key={index} />); return; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) nodes.push(<h1 key={index}>{inline(heading[2])}</h1>);
      else if (level === 2) nodes.push(<h2 key={index}>{inline(heading[2])}</h2>);
      else if (level === 3) nodes.push(<h3 key={index}>{inline(heading[2])}</h3>);
      else nodes.push(<h4 key={index}>{inline(heading[2])}</h4>);
      return;
    }
    if (/^[-*]\s+/.test(line)) { nodes.push(<div className="md-li" key={index}>{inline(line.replace(/^[-*]\s+/, ""))}</div>); return; }
    if (/^>\s?/.test(line)) { nodes.push(<blockquote key={index}>{inline(line.replace(/^>\s?/, ""))}</blockquote>); return; }
    nodes.push(<p key={index}>{inline(line)}</p>);
  });
  if (code.length) nodes.push(<pre key="code-last"><code>{code.join("\n")}</code></pre>);
  return <article className="markdown-view">{nodes}</article>;
}

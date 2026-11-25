export default function OpinionText({ content }: { content: string }) {
  const inline = (text: string) =>
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={index}>{part.slice(1, -1)}</code>;
      return part;
    });
  const blocks = content
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^---+$/.test(block));
  return (
    <div className="opinion-formatted">
      {blocks.map((block, index) => {
        const lines = block
          .split("\n")
          .filter((line) => !/^\s*---+\s*$/.test(line));
        return (
          <section className="opinion-section" key={index}>
            {lines.map((line, lineIndex) => {
              const heading =
                /^\*\*(.+)\*\*$/.exec(line.trim())?.[1] ??
                /^(#{1,4})\s+(.+)$/.exec(line.trim())?.[2];
              if (heading) return <h4 key={lineIndex}>{inline(heading)}</h4>;
              const listItem = /^\s*(?:[-*]|\d+[.)])\s+(.+)$/.exec(line);
              return listItem ? (
                <div className="opinion-list-line" key={lineIndex}>
                  <i aria-hidden="true" />
                  <span>{inline(listItem[1])}</span>
                </div>
              ) : (
                line.trim() && <p key={lineIndex}>{inline(line)}</p>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

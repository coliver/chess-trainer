import { useEffect, useState } from "react";

export function RandomQuote() {
  const [quote, setQuote] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/quotes.txt");
        const text = await res.text();
        const lines = text
          .split("\n")
          .map(l => l.trim())
          .filter(Boolean);

        if (!lines.length) return;

        const pick = lines[Math.floor(Math.random() * lines.length)];
        if (!cancelled) setQuote(pick);
      } catch {
        if (!cancelled) setQuote("Could not load quote.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!quote) return null;

  return <div>{quote}</div>;
}

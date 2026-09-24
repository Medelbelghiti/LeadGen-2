"use client";

import { useState } from "react";
import { Sparkles, Send } from "lucide-react";

/**
 * Ask My Car's Money — V1 grounded-answer engine.
 * No AI is invoked. The answer is computed deterministically from the
 * user's actual expenses + fuel entries + vehicle data, so we never
 * hallucinate financial facts.
 *
 * If information is missing, we say so explicitly.
 */
export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const ask = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question) return;
    setInput(question);
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const j = await res.json();
      setData(j);
      setAnswer(j.answer ?? "I don't have an answer for that yet.");
    } catch {
      setAnswer("Something went wrong.");
    }
    setLoading(false);
  };

  const suggestions = [
    "How much did I spend this month?",
    "What is my cost per kilometer?",
    "How much did fuel cost me?",
    "What is my most expensive category?",
    "What will I spend in 12 months?",
  ];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-600" />
        <h1 className="text-2xl font-bold">Ask My Car's Money</h1>
      </div>
      <p className="text-sm text-charcoal-500 mt-1">Answers are computed from your actual AutoEco data. We never invent numbers.</p>

      <div className="card mt-6">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Ask about your car finances…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <button className="btn btn-accent" disabled={loading} onClick={() => ask()}>
            <Send className="w-4 h-4" /> Ask
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} className="btn btn-ghost text-xs" onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
      </div>

      {loading && <div className="card mt-4 text-sm text-charcoal-500">Thinking…</div>}

      {answer && (
        <div className="card mt-4">
          <p className="text-base">{answer}</p>
          {data?.sources && data.sources.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-charcoal-500">
              {data.sources.map((s: string, i: number) => <li key={i}>• {s}</li>)}
            </ul>
          )}
          {data?.vehicleId && (
            <p className="text-xs text-charcoal-500 mt-3">Based on vehicle {data.vehicleId}.</p>
          )}
        </div>
      )}
    </div>
  );
}

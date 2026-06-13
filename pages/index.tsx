import { useState, useEffect } from "react";
import type { BiasResult } from "../lib/biasEngine";

export default function Home() {
  const [result, setResult] = useState<BiasResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const analyzeMarket = async () => {
    try {
      setLoading(true);
      setResult(null);
      const res = await fetch("/api/analyze");
      const data: BiasResult = await res.json();
      setResult(data);
    } catch {
      setResult({
        usd: "BEARISH",
        gold: "BULLISH",
        strength: "WEAK",
        event: "Unavailable",
        upcomingEvents: [],
        newsHeadlines: [],
        explanation: "Market data unavailable at this moment.",
        sources: [],
        timestamp: new Date().toUTCString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (bias: string) => {
    if (bias === "BULLISH") return "📈";
    if (bias === "BEARISH") return "📉";
    return "➖";
  };

  const getBadgeClasses = (bias: string) => {
    if (bias === "BULLISH")
      return "bg-emerald-950 border border-emerald-800 text-emerald-400";
    if (bias === "BEARISH")
      return "bg-red-950 border border-red-800 text-red-400";
    return "dark:bg-slate-800 bg-slate-200 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-500";
  };

  const getStrengthClasses = (strength: string) => {
    if (strength === "STRONG") return "text-emerald-400 bg-emerald-950 border-emerald-800";
    if (strength === "MODERATE") return "text-yellow-400 bg-yellow-950 border-yellow-800";
    return "text-slate-400 bg-slate-800 border-slate-700";
  };

  const getExplanationColor = (bias: string) => {
    if (bias === "BULLISH") return "text-emerald-400";
    if (bias === "BEARISH") return "text-red-400";
    return "dark:text-slate-400 text-slate-500";
  };

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2">
              XAUUSD Analysis
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Quick Bias Tool
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              Forex Factory · News Sentiment · Multi-source
            </p>
          </div>

          <button
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
            className="mt-1 w-10 h-10 rounded-xl flex items-center justify-center border transition-colors
              dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700
              border-slate-200 bg-slate-100 hover:bg-slate-200"
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9H21M3 12H2m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14A7 7 0 0012 5z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Card */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-colors duration-300">

          <button
            onClick={analyzeMarket}
            disabled={loading}
            className="w-full font-semibold font-mono text-sm tracking-widest uppercase transition-colors rounded-xl py-3.5
              bg-slate-900 hover:bg-slate-700 text-white
              dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950
              disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {loading ? "Scanning Sources..." : "Analyze Market"}
          </button>

          {loading && (
            <div className="mt-4 space-y-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              <p>⏳ Scraping Forex Factory...</p>
              <p>📰 Fetching news from Axios, Reuters, MarketWatch...</p>
              <p>🧠 Computing bias...</p>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-3">

              {/* Timestamp */}
              <p className="text-xs font-mono text-slate-400 dark:text-slate-500 text-right">
                {result.timestamp}
              </p>

              {/* USD / Gold bias */}
              <div className="grid grid-cols-2 gap-3">
                {(["usd", "gold"] as const).map((asset) => (
                  <div
                    key={asset}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors"
                  >
                    <p className="text-xs font-mono text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-2">
                      {asset === "usd" ? "US Dollar" : "Gold"}
                    </p>
                    <p className="text-2xl font-semibold mb-2">
                      {asset === "usd" ? "USD" : "XAU"}
                    </p>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-md ${getBadgeClasses(result[asset])}`}>
                      {getIcon(result[asset])} {result[asset]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Strength */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Signal Strength
                </p>
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${getStrengthClasses(result.strength)}`}>
                  {result.strength}
                </span>
              </div>

              {/* FF Event stats */}
              {result.actual && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Actual", value: result.actual },
                    { label: "Forecast", value: result.forecast ?? "—" },
                    { label: "Surprise", value: String(result.surprise ?? "—") },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center transition-colors">
                      <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-sm font-semibold font-mono">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Key event */}
              <div className="bg-white dark:bg-slate-950 border-l-2 border-slate-400 dark:border-slate-500 border-y border-r border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Key Event</p>
                <p className="font-medium text-sm">{result.event}</p>
              </div>

              {/* Upcoming events */}
              {result.upcomingEvents.length > 0 && (
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Upcoming Events
                  </p>
                  <ul className="space-y-1">
                    {result.upcomingEvents.map((e, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">⏳</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* News headlines */}
              {result.newsHeadlines.length > 0 && (
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    News Driving Bias
                  </p>
                  <ul className="space-y-2">
                    {result.newsHeadlines.map((n, i) => (
                      <li key={i} className="text-sm">
                        <p className="font-medium leading-snug">{n.headline}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {n.source} · {n.time}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Analysis */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Analysis</p>
                <p className={`text-sm font-medium leading-relaxed ${getExplanationColor(result.gold)}`}>
                  {result.explanation}
                </p>
              </div>

              {/* Sources */}
              <div className="flex flex-wrap gap-2">
                {result.sources.map((s, i) => (
                  <span key={i} className="text-xs font-mono px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {s}
                  </span>
                ))}
              </div>

            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-4">
          For informational use only — not financial advice.
        </p>
      </div>
    </main>
  );
}
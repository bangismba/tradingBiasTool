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
        gold: "BULLISH", usd: "BEARISH",
        goldConfidence: 50, usdConfidence: 50,
        strength: "WEAK",
        event: "Unavailable",
        drivers: [], upcomingEvents: [], newsHeadlines: [],
        explanation: "Market data unavailable at this moment.",
        sources: [], timestamp: new Date().toUTCString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const biasIcon = (bias: string) => bias === "BULLISH" ? "📈" : "📉";

  const biasColor = (bias: string) =>
    bias === "BULLISH"
      ? "text-emerald-400"
      : "text-red-400";

  const badgeClasses = (bias: string) =>
    bias === "BULLISH"
      ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
      : "bg-red-950 border border-red-800 text-red-400";

  const strengthColor = (s: string) =>
    s === "STRONG"   ? "text-emerald-400 bg-emerald-950 border-emerald-800" :
    s === "MODERATE" ? "text-yellow-400 bg-yellow-950 border-yellow-800" :
                       "text-slate-400 bg-slate-800 border-slate-700";

  const confidenceBar = (pct: number, bias: string) => (
    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          bias === "BULLISH" ? "bg-emerald-500" : "bg-red-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-1">
              XAUUSD · Multi-Source Analysis
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Quick Bias Tool</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Forex Factory · DXY · Yields · VIX · Oil · News
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

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl transition-colors duration-300 space-y-4">

          {/* Analyze button */}
          <button
            onClick={analyzeMarket}
            disabled={loading}
            className="w-full font-semibold font-mono text-sm tracking-widest uppercase transition-colors rounded-xl py-4
              bg-slate-900 hover:bg-slate-700 text-white
              dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Scanning All Sources..." : "⚡ Analyze Now"}
          </button>

          {loading && (
            <div className="space-y-1 text-xs font-mono text-slate-400 px-1">
              <p>📊 Scraping Forex Factory calendar...</p>
              <p>📈 Fetching DXY, 10Y Yield, 2Y Yield, VIX, Oil...</p>
              <p>📰 Pulling Axios, Reuters, MarketWatch headlines...</p>
              <p>🧠 Running scoring engine...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">

              {/* Timestamp */}
              <p className="text-xs font-mono text-slate-400 dark:text-slate-500 text-right">
                {result.timestamp}
              </p>

              {/* Gold + USD bias cards */}
              <div className="grid grid-cols-2 gap-3">
                {(["gold", "usd"] as const).map((asset) => {
                  const bias = result[asset];
                  const conf = asset === "gold" ? result.goldConfidence : result.usdConfidence;
                  return (
                    <div key={asset} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                      <p className="text-xs font-mono text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-1">
                        {asset === "gold" ? "Gold (XAU)" : "US Dollar"}
                      </p>
                      <p className="text-2xl font-semibold mb-2">
                        {asset === "gold" ? "XAU" : "USD"}
                      </p>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-md ${badgeClasses(bias)}`}>
                        {biasIcon(bias)} {bias}
                      </span>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                          <span>Confidence</span>
                          <span className={biasColor(bias)}>{conf}%</span>
                        </div>
                        {confidenceBar(conf, bias)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Signal strength */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Signal Strength
                </p>
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${strengthColor(result.strength)}`}>
                  {result.strength}
                </span>
              </div>

              {/* Key drivers checklist */}
              {result.drivers.length > 0 && (
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                    Scoring Drivers
                  </p>
                  <ul className="space-y-2">
                    {result.drivers.map((d, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={d.goldPoints < 0 ? "text-red-400" : "text-emerald-400"}>
                            {d.goldPoints < 0 ? "🔴" : "🟢"}
                          </span>
                          <span className="font-medium">{d.label}</span>
                        </div>
                        <div className="flex gap-2 text-xs font-mono shrink-0">
                          <span className={d.goldPoints < 0 ? "text-red-400" : "text-emerald-400"}>
                            XAU {d.goldPoints > 0 ? "+" : ""}{d.goldPoints}
                          </span>
                          <span className={d.usdPoints > 0 ? "text-emerald-400" : "text-red-400"}>
                            USD {d.usdPoints > 0 ? "+" : ""}{d.usdPoints}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key event */}
              {result.event && (
                <div className="bg-white dark:bg-slate-950 border-l-2 border-slate-400 dark:border-slate-500 border-y border-r border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Key Event
                  </p>
                  <p className="font-medium text-sm">{result.event}</p>
                  {result.actual && (
                    <p className="text-xs font-mono text-slate-400 mt-1">
                      Actual: {result.actual} · Forecast: {result.forecast}
                    </p>
                  )}
                </div>
              )}

              {/* Upcoming events */}
              {result.upcomingEvents.length > 0 && (
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Upcoming Events
                  </p>
                  <ul className="space-y-1">
                    {result.upcomingEvents.map((e, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <span className="text-yellow-500">⏳</span> {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* News headlines */}
              {result.newsHeadlines.length > 0 && (
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    News Driving Bias
                  </p>
                  <ul className="space-y-2.5">
                    {result.newsHeadlines.map((n, i) => (
                      <li key={i} className="text-sm">
                        <p className="font-medium leading-snug">{n.headline}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                          {n.source} · {n.time}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full explanation */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                  Full Analysis
                </p>
                <pre className={`text-xs leading-relaxed whitespace-pre-wrap font-mono ${biasColor(result.gold)}`}>
                  {result.explanation}
                </pre>
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
export interface ForexEvent {
  currency: string;
  event: string;
  impact: string;
  actual: string;
  forecast: string;
  previous: string;
  time: string;
  status: "released" | "upcoming" | "in_progress";
}

export interface NewsItem {
  headline: string;
  source: string;
  time: string;
  url: string;
  relevanceScore: number;
}

export interface BiasResult {
  usd: "BULLISH" | "BEARISH" | "NEUTRAL";
  gold: "BULLISH" | "BEARISH" | "NEUTRAL";
  strength: "STRONG" | "MODERATE" | "WEAK";
  event: string;
  actual?: string;
  forecast?: string;
  surprise?: number;
  upcomingEvents: string[];
  newsHeadlines: { headline: string; source: string; time: string }[];
  explanation: string;
  sources: string[];
  timestamp: string;
}

function parseValue(value: string): number | null {
  if (!value || value === "-" || value === "N/A") return null;

  let cleaned = value.replace(/,/g, "").replace("%", "").trim().toUpperCase();
  let multiplier = 1;

  if (cleaned.endsWith("K")) { multiplier = 1_000; cleaned = cleaned.slice(0, -1); }
  else if (cleaned.endsWith("M")) { multiplier = 1_000_000; cleaned = cleaned.slice(0, -1); }
  else if (cleaned.endsWith("B")) { multiplier = 1_000_000_000; cleaned = cleaned.slice(0, -1); }

  const num = Number(cleaned);
  if (Number.isNaN(num)) return null;
  return num * multiplier;
}

function scoreNewsForBias(news: NewsItem[]): number {
  let score = 0;

  const bullishUsdKeywords = [
    "strong jobs", "beats forecast", "above forecast", "hawkish",
    "rate hike", "strong dollar", "risk on", "risk-on", "economy grows",
    "gdp beats", "inflation rises", "hot cpi", "strong payroll",
    "ceasefire", "peace deal", "agreement reached", "tensions ease",
    "deal signed", "resolved",
  ];

  const bearishUsdKeywords = [
    "war", "conflict", "geopolit", "safe haven", "risk off", "risk-off",
    "rate cut", "dovish", "recession", "weak jobs", "misses forecast",
    "below forecast", "inflation falls", "gold surges", "gold rallies",
    "gold hits", "gold climbs", "gold rises", "tensions", "attack",
    "crisis", "uncertainty", "debt", "default", "invasion", "strike",
    "sanctions", "iran", "russia", "ukraine", "israel", "gaza",
  ];

  for (const item of news) {
    const lower = item.headline.toLowerCase();
    const weight = item.relevanceScore;

    for (const kw of bullishUsdKeywords) {
      if (lower.includes(kw)) score += weight;
    }
    for (const kw of bearishUsdKeywords) {
      if (lower.includes(kw)) score -= weight;
    }
  }

  return score;
}

function buildNewsReason(
  item: { headline: string; source: string; time: string },
  gold: "BULLISH" | "BEARISH" | "NEUTRAL"
): string {
  const lower = item.headline.toLowerCase();
  const cite = `[${item.source} · ${item.time}]`;

  // Ceasefire / peace — gold bearish
  if (/ceasefire|peace deal|agreement reached|tensions ease|deal signed|resolved/.test(lower)) {
    return `${cite} "${item.headline}" — easing geopolitical risk reduces safe-haven demand, bearish for Gold.`;
  }

  // Geopolitical escalation — gold bullish
  if (/war|conflict|attack|strike|invasion|tension|sanctions|iran|russia|ukraine|israel|gaza|middle east/.test(lower)) {
    return `${cite} "${item.headline}" — escalating geopolitical risk drives safe-haven flows into Gold.`;
  }

  // Fed hawkish — USD bullish, gold bearish
  if (/rate hike|hawkish|higher for longer|tighten/.test(lower)) {
    return `${cite} "${item.headline}" — hawkish Fed signals higher rates, strengthening USD and pressuring Gold.`;
  }

  // Fed dovish — USD bearish, gold bullish
  if (/rate cut|dovish|easing|pivot|pause/.test(lower)) {
    return `${cite} "${item.headline}" — dovish Fed expectations weaken the USD and lift Gold.`;
  }

  // Fed general
  if (/federal reserve|fed |powell|fomc/.test(lower)) {
    return `${cite} "${item.headline}" — Fed commentary adding uncertainty, Gold reacting to rate outlook shifts.`;
  }

  // Hot inflation — USD bullish
  if (/inflation|cpi|pce|price index/.test(lower) && /rises|hot|above|surges|jumps|accelerat/.test(lower)) {
    return `${cite} "${item.headline}" — rising inflation raises rate-hike expectations, bullish USD and bearish Gold.`;
  }

  // Cooling inflation — gold bullish
  if (/inflation|cpi|pce|price index/.test(lower) && /falls|cools|below|slows|eases/.test(lower)) {
    return `${cite} "${item.headline}" — cooling inflation reduces rate pressure, weakening USD and supporting Gold.`;
  }

  // Strong jobs / economy — USD bullish
  if (/jobs|payroll|employment|gdp|economy/.test(lower) && /strong|beats|above|surges|grows|solid/.test(lower)) {
    return `${cite} "${item.headline}" — strong economic data signals USD strength, bearish for Gold.`;
  }

  // Weak jobs / recession — gold bullish
  if (/jobs|payroll|employment|gdp|recession|economy/.test(lower) && /weak|misses|below|contracts|shrinks|fears/.test(lower)) {
    return `${cite} "${item.headline}" — weak economic data raises recession fears, supporting safe-haven Gold.`;
  }

  // Gold price action — bullish
  if (/gold surges|gold rallies|gold climbs|gold hits|gold rises/.test(lower)) {
    return `${cite} "${item.headline}" — price action confirms bullish momentum in Gold.`;
  }

  // Gold price action — bearish
  if (/gold falls|gold drops|gold retreats|gold slides/.test(lower)) {
    return `${cite} "${item.headline}" — price action confirms selling pressure in Gold.`;
  }

  // Dollar strength
  if (/dollar|dxy|usd/.test(lower) && /rises|strengthens|rallies|gains|surges/.test(lower)) {
    return `${cite} "${item.headline}" — a stronger Dollar exerts downward pressure on Gold.`;
  }

  // Dollar weakness
  if (/dollar|dxy|usd/.test(lower) && /falls|weakens|drops|slides|loses/.test(lower)) {
    return `${cite} "${item.headline}" — a weaker Dollar provides tailwind support for Gold.`;
  }

  // Debt / default / fiscal
  if (/debt|default|deficit|fiscal|budget/.test(lower)) {
    return `${cite} "${item.headline}" — fiscal concerns erode confidence in the USD, supporting Gold as a store of value.`;
  }

  // Oil / energy
  if (/oil|crude|opec|energy/.test(lower)) {
    return `${cite} "${item.headline}" — energy market moves influencing inflation expectations and indirectly affecting Gold.`;
  }

  // Treasury yields
  if (/yield|treasury|bond/.test(lower)) {
    const direction = /rises|climbs|jumps|surges/.test(lower)
      ? "rising yields increase the opportunity cost of holding Gold, bearish pressure"
      : "falling yields reduce the opportunity cost of holding Gold, providing support";
    return `${cite} "${item.headline}" — ${direction}.`;
  }

  // Fallback — still explain directionally
  return `${cite} "${item.headline}" — contributing to ${gold === "BULLISH" ? "bullish Gold sentiment as risk appetite remains subdued" : "bearish Gold sentiment as risk appetite improves"}.`;
}

export function computeBias(
  releasedEvents: ForexEvent[],
  upcomingEvents: ForexEvent[],
  latestEvent: ForexEvent | null,
  news: NewsItem[]
): BiasResult {
  const now = new Date();
  const timestamp = now.toUTCString();
  const sources: string[] = ["Forex Factory"];

  // --- Step 1: Score from FF released events ---
  let ffScore = 0;
  let totalSurprise = 0;

  for (const event of releasedEvents) {
    const actualNum = parseValue(event.actual);
    const forecastNum = parseValue(event.forecast);
    if (actualNum === null || forecastNum === null) continue;

    const surprise = actualNum - forecastNum;
    const relSurprise =
      forecastNum !== 0 ? surprise / Math.abs(forecastNum) : surprise;

    const weight = event.impact.toLowerCase().includes("high") ? 2 : 1;
    ffScore += relSurprise * weight;
    totalSurprise += surprise;
  }

  // --- Step 2: Score from news sentiment ---
  const newsScore = scoreNewsForBias(news);
  if (news.length > 0) {
    const newsSources = [...new Set(news.map((n) => n.source))];
    sources.push(...newsSources);
  }

  // --- Step 3: Combine scores ---
  const normNewsScore = news.length > 0 ? newsScore / news.length : 0;
  const combinedScore = ffScore * 3 + normNewsScore;

  // --- Step 4: Determine bias — never neutral ---
  let usd: BiasResult["usd"];
  let gold: BiasResult["gold"];
  let strength: BiasResult["strength"];

  if (combinedScore > 0) {
    usd = "BULLISH";
    gold = "BEARISH";
  } else {
    usd = "BEARISH";
    gold = "BULLISH";
  }

  const absScore = Math.abs(combinedScore);
  if (absScore > 1.5) strength = "STRONG";
  else if (absScore > 0.5) strength = "MODERATE";
  else strength = "WEAK";

  // --- Step 5: Build explanation ---
  const upcomingNames = upcomingEvents
    .slice(0, 3)
    .map((e) => `${e.event} (${e.time || "time TBD"})`);

  const topNews = news.slice(0, 5).map((n) => ({
    headline: n.headline,
    source: n.source,
    time: new Date(n.time).toUTCString(),
  }));

  // FF summary
  let ffSummary = "";
  if (latestEvent) {
    const actualNum = parseValue(latestEvent.actual);
    const forecastNum = parseValue(latestEvent.forecast);
    const surprise =
      actualNum !== null && forecastNum !== null
        ? actualNum - forecastNum
        : null;

    if (surprise !== null) {
      const direction = surprise > 0 ? "beat" : "missed";
      const usdImpact =
        surprise > 0 ? "strengthening the USD" : "weakening the USD";
      const goldImpact =
        surprise > 0 ? "putting pressure on Gold" : "supporting Gold";
      ffSummary = `[Forex Factory · ${latestEvent.time}] ${latestEvent.event} ${direction} expectations — Actual: ${latestEvent.actual} vs Forecast: ${latestEvent.forecast} — ${usdImpact} and ${goldImpact}.`;
    } else {
      ffSummary = `[Forex Factory · ${latestEvent.time}] ${latestEvent.event} was released but figures are pending confirmation.`;
    }
  } else if (upcomingEvents.length > 0) {
    ffSummary = `[Forex Factory] No data released yet today. Next key event: ${upcomingEvents[0].event} at ${upcomingEvents[0].time} — markets are positioning ahead of the release.`;
  } else {
    ffSummary = `[Forex Factory] No high-impact USD events scheduled today — bias driven entirely by news and market sentiment.`;
  }

  // News reasons — each headline cited and explained
  const newsReasons = topNews.map((item) => buildNewsReason(item, gold));

  // Verdict
  const verdictMap: Record<string, string> = {
    BULLISH_STRONG:   "Gold is strongly bullish. Buy-side bias favoured on XAUUSD.",
    BULLISH_MODERATE: "Gold has a moderate bullish bias. Lean long on XAUUSD.",
    BULLISH_WEAK:     "Gold has a weak bullish tilt. Cautious long bias on XAUUSD.",
    BEARISH_STRONG:   "Gold is strongly bearish. Sell-side bias favoured on XAUUSD.",
    BEARISH_MODERATE: "Gold has a moderate bearish bias. Lean short on XAUUSD.",
    BEARISH_WEAK:     "Gold has a weak bearish tilt. Cautious short bias on XAUUSD.",
  };

  const verdictKey = `${gold}_${strength}`;
  const verdict = verdictMap[verdictKey] ?? `Gold is ${gold} (${strength}) on XAUUSD.`;

  // Assemble
  const ffLine = `📊 Forex Factory [${latestEvent?.time ?? "—"}]: ${ffSummary.replace(/^\[Forex Factory[^\]]*\]\s*/, "")}`;

  const newsBySource: Record<string, string[]> = {};
  topNews.forEach((item, i) => {
    const reason = newsReasons[i];
    if (!newsBySource[item.source]) newsBySource[item.source] = [];
    newsBySource[item.source].push(reason.replace(/^\[[^\]]*\]\s*/, "")); // strip cite prefix, already grouped by source label
  });

  const parts: string[] = [];

  // Forex Factory block
  parts.push(ffLine);

  // One block per news source
  Object.entries(newsBySource).forEach(([source, reasons]) => {
    parts.push(`\n📰 ${source}:`);
    reasons.forEach((r) => parts.push(`  • ${r}`));
  });

  // Upcoming events note
  if (upcomingNames.length > 0) {
    parts.push(`\n⏳ Upcoming events to watch: ${upcomingNames.join(" | ")}`);
  }

  // Therefore block — always present, always decisive
  parts.push(`\n⚡ Therefore: ${verdict}`);

  // Breakdown of what each source contributed
  const ffContrib =
    ffScore > 0
      ? "Forex Factory data is USD-positive"
      : ffScore < 0
      ? "Forex Factory data is USD-negative"
      : "Forex Factory data is neutral";

  const newsContrib =
    newsScore > 0
      ? "news sentiment is USD-supportive"
      : newsScore < 0
      ? "news sentiment is Gold-supportive"
      : "news sentiment is mixed";

  parts.push(
    `   (${ffContrib}; ${newsContrib} — combined signal is ${strength.toLowerCase()} ${gold === "BULLISH" ? "Gold bullish" : "Gold bearish"}.)`
  );

  const explanation = parts.join("\n");

  return {
    usd,
    gold,
    strength,
    event:
      latestEvent?.event ??
      upcomingEvents[0]?.event ??
      "No key events today",
    actual: latestEvent?.actual,
    forecast: latestEvent?.forecast,
    surprise: totalSurprise || undefined,
    upcomingEvents: upcomingNames,
    newsHeadlines: topNews,
    explanation,
    sources,
    timestamp,
  };
} 
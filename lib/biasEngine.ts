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

export interface MarketData {
  dxy?: { value: string; trend: "bullish" | "bearish" | "neutral"; change: string };
  yield10y?: { value: string; trend: "bullish" | "bearish" | "neutral" };
  yield2y?: { value: string; trend: "bullish" | "bearish" | "neutral" };
  wti?: { value: string; trend: "bullish" | "bearish" | "neutral" };
  vix?: { value: string; level: "high" | "moderate" | "low" };
}

export interface ScoredDriver {
  label: string;
  goldPoints: number;
  usdPoints: number;
  source: string;
  cite: string;
}

export interface BiasResult {
  gold: "BULLISH" | "BEARISH";
  usd: "BULLISH" | "BEARISH";
  goldConfidence: number;
  usdConfidence: number;
  strength: "STRONG" | "MODERATE" | "WEAK";
  event: string;
  actual?: string;
  forecast?: string;
  drivers: ScoredDriver[];
  upcomingEvents: string[];
  newsHeadlines: { headline: string; source: string; time: string }[];
  explanation: string;
  sources: string[];
  timestamp: string;
}

// ─── Value parser ───────────────────────────────────────────────
function parseValue(value: string): number | null {
  if (!value || value === "-" || value === "N/A") return null;
  let cleaned = value.replace(/,/g, "").replace("%", "").trim().toUpperCase();
  let multiplier = 1;
  if (cleaned.endsWith("K")) { multiplier = 1_000; cleaned = cleaned.slice(0, -1); }
  else if (cleaned.endsWith("M")) { multiplier = 1_000_000; cleaned = cleaned.slice(0, -1); }
  else if (cleaned.endsWith("B")) { multiplier = 1_000_000_000; cleaned = cleaned.slice(0, -1); }
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num * multiplier;
}

// ─── Score from FF economic events ──────────────────────────────
function scoreEconomicEvent(event: ForexEvent): ScoredDriver | null {
  const actualNum   = parseValue(event.actual);
  const forecastNum = parseValue(event.forecast);
  if (actualNum === null || forecastNum === null) return null;

  const surprise = actualNum - forecastNum;
  const isStrong = surprise > 0;
  const name = event.event.toLowerCase();
  const cite = `[Forex Factory · ${event.time}] ${event.event} — Actual: ${event.actual} vs Forecast: ${event.forecast}`;

  // NFP / Payrolls
  if (/non.farm|payroll|nfp/.test(name)) {
    return isStrong
      ? { label: "Strong NFP", goldPoints: -10, usdPoints: 10, source: "Forex Factory", cite }
      : { label: "Weak NFP",   goldPoints:  10, usdPoints: -10, source: "Forex Factory", cite };
  }

  // CPI / Inflation
  if (/cpi|consumer price|inflation/.test(name)) {
    return isStrong
      ? { label: "Hot CPI",     goldPoints: -10, usdPoints: 10, source: "Forex Factory", cite }
      : { label: "Cooling CPI", goldPoints:  10, usdPoints: -10, source: "Forex Factory", cite };
  }

  // PPI
  if (/ppi|producer price/.test(name)) {
    return isStrong
      ? { label: "Hot PPI",     goldPoints: -8, usdPoints: 8, source: "Forex Factory", cite }
      : { label: "Cooling PPI", goldPoints:  8, usdPoints: -8, source: "Forex Factory", cite };
  }

  // Claims
  if (/claim|jobless/.test(name)) {
    // Claims: lower = stronger economy = USD bullish
    return isStrong
      ? { label: "Claims Lower Than Forecast", goldPoints: -6, usdPoints: 6, source: "Forex Factory", cite }
      : { label: "Claims Higher Than Forecast", goldPoints: 6, usdPoints: -6, source: "Forex Factory", cite };
  }

  // GDP
  if (/gdp|gross domestic/.test(name)) {
    return isStrong
      ? { label: "Strong GDP", goldPoints: -9, usdPoints: 9, source: "Forex Factory", cite }
      : { label: "Weak GDP",   goldPoints:  9, usdPoints: -9, source: "Forex Factory", cite };
  }

  // Retail Sales
  if (/retail/.test(name)) {
    return isStrong
      ? { label: "Strong Retail Sales", goldPoints: -7, usdPoints: 7, source: "Forex Factory", cite }
      : { label: "Weak Retail Sales",   goldPoints:  7, usdPoints: -7, source: "Forex Factory", cite };
  }

  // PCE
  if (/pce|personal consumption/.test(name)) {
    return isStrong
      ? { label: "Hot PCE",     goldPoints: -8, usdPoints: 8, source: "Forex Factory", cite }
      : { label: "Cooling PCE", goldPoints:  8, usdPoints: -8, source: "Forex Factory", cite };
  }

  // ISM
  if (/ism|manufacturing|services pmi/.test(name)) {
    return isStrong
      ? { label: "Strong ISM / PMI", goldPoints: -6, usdPoints: 6, source: "Forex Factory", cite }
      : { label: "Weak ISM / PMI",   goldPoints:  6, usdPoints: -6, source: "Forex Factory", cite };
  }

  // FOMC
  if (/fomc|federal open|interest rate/.test(name)) {
    return isStrong
      ? { label: "Hawkish FOMC", goldPoints: -10, usdPoints: 10, source: "Forex Factory", cite }
      : { label: "Dovish FOMC",  goldPoints:  10, usdPoints: -10, source: "Forex Factory", cite };
  }

  // Generic high-impact fallback
  if (event.impact.toLowerCase().includes("high")) {
    return isStrong
      ? { label: `Strong ${event.event}`, goldPoints: -6, usdPoints: 6, source: "Forex Factory", cite }
      : { label: `Weak ${event.event}`,   goldPoints:  6, usdPoints: -6, source: "Forex Factory", cite };
  }

  return null;
}

// ─── Score from market data (DXY, yields, VIX, oil) ─────────────
function scoreMarketData(market: MarketData): ScoredDriver[] {
  const drivers: ScoredDriver[] = [];

  if (market.dxy) {
    const { trend, value, change } = market.dxy;
    const cite = `[DXY · Live] DXY at ${value} (${change}) — trend: ${trend}`;
    if (trend === "bullish") {
      drivers.push({ label: "DXY Rising", goldPoints: -10, usdPoints: 10, source: "DXY", cite });
    } else if (trend === "bearish") {
      drivers.push({ label: "DXY Falling", goldPoints: 10, usdPoints: -10, source: "DXY", cite });
    }
  }

  if (market.yield10y) {
    const { trend, value } = market.yield10y;
    const cite = `[US 10Y Yield · Live] 10Y at ${value}% — trend: ${trend}`;
    if (trend === "bullish") {
      drivers.push({ label: "10Y Yield Rising", goldPoints: -10, usdPoints: 10, source: "Treasury", cite });
    } else if (trend === "bearish") {
      drivers.push({ label: "10Y Yield Falling", goldPoints: 10, usdPoints: -10, source: "Treasury", cite });
    }
  }

  if (market.yield2y) {
    const { trend, value } = market.yield2y;
    const cite = `[US 2Y Yield · Live] 2Y at ${value}% — trend: ${trend}`;
    if (trend === "bullish") {
      drivers.push({ label: "2Y Yield Rising", goldPoints: -7, usdPoints: 7, source: "Treasury", cite });
    } else if (trend === "bearish") {
      drivers.push({ label: "2Y Yield Falling", goldPoints: 7, usdPoints: -7, source: "Treasury", cite });
    }
  }

  if (market.vix) {
    const { level, value } = market.vix;
    const cite = `[VIX · Live] Fear index at ${value} — level: ${level}`;
    if (level === "high") {
      drivers.push({ label: "VIX Elevated (Risk-Off)", goldPoints: 8, usdPoints: 3, source: "VIX", cite });
    } else if (level === "low") {
      drivers.push({ label: "VIX Low (Risk-On)", goldPoints: -5, usdPoints: 5, source: "VIX", cite });
    }
  }

  if (market.wti) {
    const { trend, value } = market.wti;
    const cite = `[WTI Crude · Live] Oil at $${value} — trend: ${trend}`;
    if (trend === "bullish") {
      drivers.push({ label: "Oil Rising (Inflation Risk)", goldPoints: 5, usdPoints: -3, source: "WTI", cite });
    } else if (trend === "bearish") {
      drivers.push({ label: "Oil Falling (Deflation Risk)", goldPoints: -3, usdPoints: 4, source: "WTI", cite });
    }
  }

  return drivers;
}

// ─── Score from news headlines ───────────────────────────────────
function scoreNewsHeadline(item: NewsItem): ScoredDriver | null {
  const lower = item.headline.toLowerCase();
  const cite  = `[${item.source} · ${new Date(item.time).toUTCString()}] "${item.headline}"`;

  // Ceasefire / peace — risk-on, gold bearish
  if (/ceasefire|peace deal|agreement reached|tensions ease|deal signed|truce/.test(lower)) {
    return { label: "Geopolitical Risk Easing", goldPoints: -5, usdPoints: 3, source: item.source, cite };
  }

  // War / conflict / escalation — safe haven gold
  if (/war|invasion|attack|strike|escalat|sanctions|missile|troops/.test(lower)) {
    return { label: "Geopolitical Escalation", goldPoints: 5, usdPoints: 3, source: item.source, cite };
  }

  // Tension without escalation — mild safe haven
  if (/iran|russia|ukraine|israel|gaza|north korea|taiwan|conflict|tension/.test(lower)) {
    return { label: "Geopolitical Tension", goldPoints: 4, usdPoints: 2, source: item.source, cite };
  }

  // Fed hawkish
  if (/rate hike|hawkish|higher for longer|tighten|no cut/.test(lower)) {
    return { label: "Hawkish Fed Signals", goldPoints: -8, usdPoints: 8, source: item.source, cite };
  }

  // Fed dovish
  if (/rate cut|dovish|easing|pivot|pause|cut rates/.test(lower)) {
    return { label: "Dovish Fed Signals", goldPoints: 8, usdPoints: -8, source: item.source, cite };
  }

  // Hot inflation
  if (/inflation|cpi|pce/.test(lower) && /surges|rises|hot|above|jumps|accelerat/.test(lower)) {
    return { label: "Rising Inflation Headlines", goldPoints: -6, usdPoints: 7, source: item.source, cite };
  }

  // Cooling inflation
  if (/inflation|cpi|pce/.test(lower) && /falls|cools|below|slows|eases|drops/.test(lower)) {
    return { label: "Cooling Inflation Headlines", goldPoints: 6, usdPoints: -6, source: item.source, cite };
  }

  // Strong jobs / economy
  if (/jobs|payroll|employment|gdp/.test(lower) && /strong|beats|above|surges|solid|record/.test(lower)) {
    return { label: "Strong Economic Data (News)", goldPoints: -6, usdPoints: 7, source: item.source, cite };
  }

  // Recession / weak economy
  if (/recession|slowdown|contraction|layoffs|weak gdp|job cuts/.test(lower)) {
    return { label: "Recession Fears", goldPoints: 7, usdPoints: -6, source: item.source, cite };
  }

  // Tariffs / trade war — gold bullish (uncertainty)
  if (/tariff|trade war|trade deal|sanctions|export ban/.test(lower)) {
    return { label: "Trade War / Tariff Risk", goldPoints: 5, usdPoints: -2, source: item.source, cite };
  }

  // Gold price momentum
  if (/gold surges|gold rallies|gold hits|gold climbs|gold rises/.test(lower)) {
    return { label: "Gold Bullish Momentum (News)", goldPoints: 4, usdPoints: 0, source: item.source, cite };
  }
  if (/gold falls|gold drops|gold retreats|gold slides/.test(lower)) {
    return { label: "Gold Bearish Momentum (News)", goldPoints: -4, usdPoints: 0, source: item.source, cite };
  }

  // Dollar strength
  if (/dollar surges|dollar rallies|dollar strengthens|dxy rises/.test(lower)) {
    return { label: "Dollar Strength (News)", goldPoints: -5, usdPoints: 6, source: item.source, cite };
  }

  // China risk
  if (/china|yuan|pboc|beijing/.test(lower) && /slowdown|crisis|devaluat|stimulus/.test(lower)) {
    return { label: "China Economic Risk", goldPoints: 4, usdPoints: 2, source: item.source, cite };
  }

  // Oil shock
  if (/oil surges|oil spikes|crude jumps|opec cut/.test(lower)) {
    return { label: "Oil Spike (Inflation Risk)", goldPoints: 4, usdPoints: -2, source: item.source, cite };
  }

  return null;
}

// ─── Confidence calculator ───────────────────────────────────────
function calcConfidence(score: number, maxPossible: number): number {
  const raw = Math.min(Math.abs(score) / maxPossible, 1);
  // Scale: 50% minimum, 98% maximum
  return Math.round(50 + raw * 48);
}

// ─── Build explanation from drivers ─────────────────────────────
function buildExplanation(
  drivers: ScoredDriver[],
  gold: "BULLISH" | "BEARISH",
  usd: "BULLISH" | "BEARISH",
  strength: "STRONG" | "MODERATE" | "WEAK",
  upcomingNames: string[]
): string {
  // Group drivers by source
  const bySource: Record<string, ScoredDriver[]> = {};
  for (const d of drivers) {
    if (!bySource[d.source]) bySource[d.source] = [];
    bySource[d.source].push(d);
  }

  const parts: string[] = [];

  for (const [source, items] of Object.entries(bySource)) {
    parts.push(`\n📌 ${source}:`);
    for (const d of items) {
      const goldDir = d.goldPoints > 0 ? "↑ Gold" : "↓ Gold";
      const usdDir  = d.usdPoints  > 0 ? "↑ USD"  : "↓ USD";
      parts.push(`  • ${d.cite}`);
      parts.push(`    → ${goldDir} (${d.goldPoints > 0 ? "+" : ""}${d.goldPoints}) | ${usdDir} (${d.usdPoints > 0 ? "+" : ""}${d.usdPoints})`);
    }
  }

  if (upcomingNames.length > 0) {
    parts.push(`\n⏳ Upcoming: ${upcomingNames.join(" | ")}`);
  }

  const verdictMap: Record<string, string> = {
    BULLISH_STRONG:   "Gold is strongly bullish. Buy-side bias favoured on XAUUSD.",
    BULLISH_MODERATE: "Gold has a moderate bullish bias. Lean long on XAUUSD.",
    BULLISH_WEAK:     "Gold has a weak bullish tilt. Cautious long bias on XAUUSD.",
    BEARISH_STRONG:   "Gold is strongly bearish. Sell-side bias favoured on XAUUSD.",
    BEARISH_MODERATE: "Gold has a moderate bearish bias. Lean short on XAUUSD.",
    BEARISH_WEAK:     "Gold has a weak bearish tilt. Cautious short bias on XAUUSD.",
  };

  parts.push(`\n⚡ Therefore: ${verdictMap[`${gold}_${strength}`] ?? `Gold is ${gold} (${strength}).`}`);

  return parts.join("\n");
}

// ─── Main export ─────────────────────────────────────────────────
export function computeBias(
  releasedEvents: ForexEvent[],
  upcomingEvents: ForexEvent[],
  latestEvent: ForexEvent | null,
  news: NewsItem[],
  market: MarketData = {}
): BiasResult {
  const timestamp = new Date().toUTCString();
  const allDrivers: ScoredDriver[] = [];
  const sources = new Set<string>(["Forex Factory"]);

  // 1. Economic events from FF
  for (const event of releasedEvents) {
    const driver = scoreEconomicEvent(event);
    if (driver) allDrivers.push(driver);
  }

  // 2. Market data (DXY, yields, VIX, oil)
  const marketDrivers = scoreMarketData(market);
  for (const d of marketDrivers) {
    allDrivers.push(d);
    sources.add(d.source);
  }

  // 3. News headlines
  for (const item of news.slice(0, 8)) {
    const driver = scoreNewsHeadline(item);
    if (driver) {
      allDrivers.push(driver);
      sources.add(item.source);
    }
  }

  // 4. Tally scores
  let goldScore = 0;
  let usdScore  = 0;
  for (const d of allDrivers) {
    goldScore += d.goldPoints;
    usdScore  += d.usdPoints;
  }

  // Max possible scores (for confidence calc)
  const maxGold = allDrivers.reduce((s, d) => s + Math.abs(d.goldPoints), 0) || 1;
  const maxUsd  = allDrivers.reduce((s, d) => s + Math.abs(d.usdPoints),  0) || 1;

  // 5. Determine bias — never neutral
  const gold: "BULLISH" | "BEARISH" = goldScore >= 0 ? "BULLISH" : "BEARISH";
  const usd:  "BULLISH" | "BEARISH" = usdScore  >= 0 ? "BULLISH" : "BEARISH";

  const goldConfidence = calcConfidence(goldScore, maxGold);
  const usdConfidence  = calcConfidence(usdScore,  maxUsd);

  const avgConfidence = (goldConfidence + usdConfidence) / 2;
  const strength: "STRONG" | "MODERATE" | "WEAK" =
    avgConfidence >= 78 ? "STRONG" :
    avgConfidence >= 62 ? "MODERATE" : "WEAK";

  // 6. Upcoming events
  const upcomingNames = upcomingEvents
    .slice(0, 3)
    .map((e) => `${e.event} (${e.time || "TBD"})`);

  // 7. Top news for display
  const topNews = news.slice(0, 5).map((n) => ({
    headline: n.headline,
    source: n.source,
    time: new Date(n.time).toUTCString(),
  }));

  // 8. Explanation
  const explanation = buildExplanation(
    allDrivers, gold, usd, strength, upcomingNames
  );

  return {
    gold,
    usd,
    goldConfidence,
    usdConfidence,
    strength,
    event: latestEvent?.event ?? upcomingEvents[0]?.event ?? "No key events today",
    actual: latestEvent?.actual,
    forecast: latestEvent?.forecast,
    drivers: allDrivers,
    upcomingEvents: upcomingNames,
    newsHeadlines: topNews,
    explanation,
    sources: [...sources],
    timestamp,
  };
}
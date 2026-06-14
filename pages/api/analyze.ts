import type { NextApiRequest, NextApiResponse } from "next";
import { scrapeForexFactory, categoriseEvents } from "../../lib/scrapeForexFactory";
import { scrapeAllNews } from "../../lib/scrapeNews";
import { scrapeMarketData } from "../../lib/scrapeMarketData";
import { computeBias, type BiasResult } from "../../lib/biasEngine";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BiasResult>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      gold: "BULLISH", usd: "BEARISH",
      goldConfidence: 50, usdConfidence: 50,
      strength: "WEAK",
      event: "Method not allowed",
      drivers: [], upcomingEvents: [], newsHeadlines: [],
      explanation: "Only GET requests are supported.",
      sources: [], timestamp: new Date().toUTCString(),
    });
  }

  try {
    // All three sources in parallel
    const [ffResult, newsResult, marketResult] = await Promise.allSettled([
      scrapeForexFactory(),
      scrapeAllNews(),
      scrapeMarketData(),
    ]);

    const events     = ffResult.status     === "fulfilled" ? ffResult.value     : [];
    const newsItems  = newsResult.status   === "fulfilled" ? newsResult.value   : [];
    const marketData = marketResult.status === "fulfilled" ? marketResult.value : {};

    const { released, upcoming, latest } = categoriseEvents(events);
    const result = computeBias(released, upcoming, latest, newsItems, marketData);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Analyze API error:", error);
    return res.status(200).json({
      gold: "BULLISH", usd: "BEARISH",
      goldConfidence: 55, usdConfidence: 52,
      strength: "WEAK",
      event: "Data temporarily unavailable",
      drivers: [], upcomingEvents: [], newsHeadlines: [],
      explanation:
        "Live data could not be retrieved. Defaulting to gold bullish bias given persistent macro uncertainty.",
      sources: [],
      timestamp: new Date().toUTCString(),
    });
  }
}
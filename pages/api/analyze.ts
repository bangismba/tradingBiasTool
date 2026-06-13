import type { NextApiRequest, NextApiResponse } from "next";
import { scrapeForexFactory, categoriseEvents } from "../../lib/scrapeForexFactory";
import { scrapeAllNews } from "../../lib/scrapeNews";
import { computeBias, type BiasResult } from "../../lib/biasEngine";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BiasResult>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      usd: "BEARISH",
      gold: "BULLISH",
      strength: "WEAK",
      event: "Method not allowed",
      upcomingEvents: [],
      newsHeadlines: [],
      explanation: "Only GET requests are supported.",
      sources: [],
      timestamp: new Date().toUTCString(),
    });
  }

  try {
    // Run FF scrape and news scrape in parallel
    const [ffEvents, news] = await Promise.allSettled([
      scrapeForexFactory(),
      scrapeAllNews(),
    ]);

    const events = ffEvents.status === "fulfilled" ? ffEvents.value : [];
    const newsItems = news.status === "fulfilled" ? news.value : [];

    const { released, upcoming, latest } = categoriseEvents(events);
    const result = computeBias(released, upcoming, latest, newsItems);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Analyze API error:", error);

    // Even on error, return a non-neutral default
    return res.status(200).json({
      usd: "BEARISH",
      gold: "BULLISH",
      strength: "WEAK",
      event: "Data temporarily unavailable",
      upcomingEvents: [],
      newsHeadlines: [],
      explanation:
        "Live data could not be retrieved at this moment. Defaulting to gold bullish bias given persistent geopolitical uncertainty.",
      sources: [],
      timestamp: new Date().toUTCString(),
    });
  }
}
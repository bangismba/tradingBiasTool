import { chromium } from "playwright";

export interface NewsItem {
  headline: string;
  source: string;
  time: string;
  url: string;
  relevanceScore: number;
}

const GOLD_KEYWORDS = [
  "gold", "xauusd", "xau", "bullion", "precious metal",
  "safe haven", "risk off", "risk-off", "inflation", "cpi",
  "federal reserve", "fed rate", "interest rate", "rate cut", "rate hike",
  "dollar", "usd", "dxy", "treasury", "yield",
  "war", "conflict", "ukraine", "russia", "middle east", "iran", "israel",
  "gaza", "geopolit", "sanctions", "oil", "recession", "debt ceiling",
  "jobs report", "nonfarm", "payroll", "fomc", "powell",
];

function scoreHeadline(headline: string): number {
  const lower = headline.toLowerCase();
  let score = 0;
  for (const kw of GOLD_KEYWORDS) {
    if (lower.includes(kw)) score += 1;
  }
  return score;
}

async function scrapeAxiosMarkets(page: any): Promise<NewsItem[]> {
  try {
    await page.goto("https://www.axios.com/markets", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(2000);

    const items = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll("article, [data-cy='story-card'], h2, h3")
      );
      return cards
        .map((el) => ({
          headline: el.textContent?.trim() ?? "",
          url: (el.querySelector("a") as HTMLAnchorElement)?.href ?? "https://www.axios.com/markets",
        }))
        .filter((i) => i.headline.length > 20);
    });

    return items.map((i: any) => ({
      headline: i.headline,
      source: "Axios Markets",
      time: new Date().toISOString(),
      url: i.url,
      relevanceScore: scoreHeadline(i.headline),
    }));
  } catch {
    return [];
  }
}

async function scrapeReutersGold(page: any): Promise<NewsItem[]> {
  try {
    await page.goto("https://www.reuters.com/markets/commodities/", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(2000);

    const items = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll("a[data-testid='Heading'], h3 a, article a")
      );
      return cards
        .map((el) => ({
          headline: el.textContent?.trim() ?? "",
          url: (el as HTMLAnchorElement).href ?? "",
        }))
        .filter((i) => i.headline.length > 20);
    });

    return items.map((i: any) => ({
      headline: i.headline,
      source: "Reuters Commodities",
      time: new Date().toISOString(),
      url: i.url || "https://www.reuters.com/markets/commodities/",
      relevanceScore: scoreHeadline(i.headline),
    }));
  } catch {
    return [];
  }
}

async function scrapeMarketwatch(page: any): Promise<NewsItem[]> {
  try {
    await page.goto("https://www.marketwatch.com/investing/future/gold", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(2000);

    const items = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll(".article__headline, h3.article__headline a, a.figure__image")
      );
      return cards
        .map((el) => ({
          headline: el.textContent?.trim() ?? "",
          url: (el.querySelector("a") as HTMLAnchorElement)?.href ?? "",
        }))
        .filter((i) => i.headline.length > 20);
    });

    return items.map((i: any) => ({
      headline: i.headline,
      source: "MarketWatch Gold",
      time: new Date().toISOString(),
      url: i.url || "https://www.marketwatch.com/investing/future/gold",
      relevanceScore: scoreHeadline(i.headline),
    }));
  } catch {
    return [];
  }
}

export async function scrapeAllNews(): Promise<NewsItem[]> {
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    });

    const [axios, reuters, marketwatch] = await Promise.allSettled([
      scrapeAxiosMarkets(page),
      scrapeReutersGold(page),
      scrapeMarketwatch(page),
    ]);

    await browser.close();

    const all: NewsItem[] = [
      ...(axios.status === "fulfilled" ? axios.value : []),
      ...(reuters.status === "fulfilled" ? reuters.value : []),
      ...(marketwatch.status === "fulfilled" ? marketwatch.value : []),
    ];

    // Filter relevant, deduplicate, sort by score
    const relevant = all
      .filter((n) => n.relevanceScore > 0 && n.headline.length > 20)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Deduplicate by similar headlines
    const seen = new Set<string>();
    const deduped: NewsItem[] = [];
    for (const item of relevant) {
      const key = item.headline.toLowerCase().slice(0, 40);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    return deduped.slice(0, 10); // top 10 most relevant
  } catch (error) {
    if (browser) await browser.close();
    return [];
  }
}
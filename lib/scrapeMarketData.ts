import { chromium } from "playwright";
import type { MarketData } from "./biasEngine";

function parseTrend(change: string): "bullish" | "bearish" | "neutral" {
  const num = parseFloat(change.replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return "neutral";
  if (num > 0.05) return "bullish";
  if (num < -0.05) return "bearish";
  return "neutral";
}

function parseVixLevel(value: string): "high" | "moderate" | "low" {
  const num = parseFloat(value);
  if (isNaN(num)) return "moderate";
  if (num >= 20) return "high";
  if (num >= 13) return "moderate";
  return "low";
}

export async function scrapeMarketData(): Promise<MarketData> {
  let browser;
  const result: MarketData = {};

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    });

    // ── DXY from Investing.com ──
    try {
      await page.goto("https://www.investing.com/indices/usdollar", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);

      const dxyData = await page.evaluate(() => {
        const price  = document.querySelector('[data-test="instrument-price-last"]')?.textContent?.trim() ?? "";
        const change = document.querySelector('[data-test="instrument-price-change-percent"]')?.textContent?.trim() ?? "";
        return { price, change };
      });

      if (dxyData.price) {
        result.dxy = {
          value:  dxyData.price,
          change: dxyData.change,
          trend:  parseTrend(dxyData.change),
        };
      }
    } catch { /* skip if unavailable */ }

    // ── 10Y Yield from Investing.com ──
    try {
      await page.goto("https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);

      const yieldData = await page.evaluate(() => {
        const price  = document.querySelector('[data-test="instrument-price-last"]')?.textContent?.trim() ?? "";
        const change = document.querySelector('[data-test="instrument-price-change-percent"]')?.textContent?.trim() ?? "";
        return { price, change };
      });

      if (yieldData.price) {
        result.yield10y = {
          value: yieldData.price,
          trend: parseTrend(yieldData.change),
        };
      }
    } catch { /* skip */ }

    // ── 2Y Yield ──
    try {
      await page.goto("https://www.investing.com/rates-bonds/u.s.-2-year-bond-yield", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);

      const yield2Data = await page.evaluate(() => {
        const price  = document.querySelector('[data-test="instrument-price-last"]')?.textContent?.trim() ?? "";
        const change = document.querySelector('[data-test="instrument-price-change-percent"]')?.textContent?.trim() ?? "";
        return { price, change };
      });

      if (yield2Data.price) {
        result.yield2y = {
          value: yield2Data.price,
          trend: parseTrend(yield2Data.change),
        };
      }
    } catch { /* skip */ }

    // ── VIX from Investing.com ──
    try {
      await page.goto("https://www.investing.com/indices/volatility-s-p-500", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);

      const vixData = await page.evaluate(() => {
        const price = document.querySelector('[data-test="instrument-price-last"]')?.textContent?.trim() ?? "";
        return { price };
      });

      if (vixData.price) {
        result.vix = {
          value: vixData.price,
          level: parseVixLevel(vixData.price),
        };
      }
    } catch { /* skip */ }

    // ── WTI Oil from Investing.com ──
    try {
      await page.goto("https://www.investing.com/commodities/crude-oil", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);

      const wtiData = await page.evaluate(() => {
        const price  = document.querySelector('[data-test="instrument-price-last"]')?.textContent?.trim() ?? "";
        const change = document.querySelector('[data-test="instrument-price-change-percent"]')?.textContent?.trim() ?? "";
        return { price, change };
      });

      if (wtiData.price) {
        result.wti = {
          value: wtiData.price,
          trend: parseTrend(wtiData.change),
        };
      }
    } catch { /* skip */ }

    await browser.close();
    return result;
  } catch (error) {
    if (browser) await browser.close();
    return result;
  }
}
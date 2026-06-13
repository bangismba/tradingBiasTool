import { chromium } from "playwright";
import type { ForexEvent } from "./biasEngine";

export async function scrapeForexFactory(): Promise<ForexEvent[]> {
  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    });

    await page.goto("https://www.forexfactory.com/calendar", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    const events: ForexEvent[] = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tr.calendar__row"));
      const results: any[] = [];
      let lastTime = "";

      rows.forEach((row) => {
        const currency =
          row.querySelector(".calendar__currency")?.textContent?.trim() ?? "";
        const event =
          row.querySelector(".calendar__event")?.textContent?.trim() ?? "";

        if (!currency || !event) return;

        const timeText =
          row.querySelector(".calendar__time")?.textContent?.trim() ?? "";
        if (timeText) lastTime = timeText;

        const actual =
          row.querySelector(".calendar__actual")?.textContent?.trim() ?? "";
        const forecast =
          row.querySelector(".calendar__forecast")?.textContent?.trim() ?? "";
        const previous =
          row.querySelector(".calendar__previous")?.textContent?.trim() ?? "";

        const impactEl = row.querySelector(".calendar__impact span");
        const impact = impactEl?.getAttribute("title") ?? "";

        // Determine status
        let status: "released" | "upcoming" | "in_progress" = "upcoming";
        if (actual && actual !== "") {
          status = "released";
        } else if (timeText.toLowerCase().includes("tentative") || timeText === "") {
          status = "upcoming";
        } else {
          status = "upcoming";
        }

        // Only USD and XAU/gold-related events
        const isRelevant =
          currency === "USD" ||
          event.toLowerCase().includes("gold") ||
          event.toLowerCase().includes("xau");

        if (!isRelevant) return;

        const isHighOrMedium =
          impact.toLowerCase().includes("high") ||
          impact.toLowerCase().includes("medium") ||
          impact.toLowerCase().includes("red") ||
          impact.toLowerCase().includes("orange");

        if (!isHighOrMedium) return;

        results.push({
          currency,
          event,
          impact,
          actual,
          forecast,
          previous,
          time: lastTime,
          status,
        });
      });

      return results;
    });

    await browser.close();
    return events;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

export function categoriseEvents(events: ForexEvent[]) {
  const released = events.filter((e) => e.status === "released" && e.actual && e.forecast);
  const upcoming = events.filter((e) => e.status === "upcoming");
  const latest = released[released.length - 1] ?? null; // most recent released

  return { released, upcoming, latest };
}
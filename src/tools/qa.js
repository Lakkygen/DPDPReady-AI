// ============================================================
// DPDPREADY AI — QA TOOL
// ============================================================

import { assertUrl, assertString } from "../utils/validation.js";

export function createQAClient(browser) {
  if (!browser) {
    throw new Error("Browser client is required");
  }

  async function checkPage({ url }) {
    assertUrl(url);

    const result = await browser.inspect({ url });

    return {
      ok: true,
      url,
      result,
    };
  }

  async function screenshot({ url, fullPage = true }) {
    assertUrl(url);

    return browser.screenshot({
      url,
      fullPage,
    });
  }

  async function runJourney({
    url,
    steps = [],
  }) {
    assertUrl(url);

    if (!Array.isArray(steps)) {
      throw new Error("steps must be an array");
    }

    const safeSteps = steps.slice(0, 30);

    const code = `
      async ({ url, steps }) => {
        const browser = await require("playwright");
        const browserInstance = await browser.chromium.launch({
          headless: true
        });

        const page = await browserInstance.newPage();

        const results = [];

        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000
          });

          for (const step of steps) {
            if (step.action === "click") {
              await page.locator(step.selector).click();
            }

            if (step.action === "fill") {
              await page.locator(step.selector).fill(
                String(step.value ?? "")
              );
            }

            if (step.action === "wait") {
              await page.waitForTimeout(
                Math.min(Number(step.ms || 500), 10000)
              );
            }

            results.push({
              action: step.action,
              selector: step.selector || null,
              ok: true
            });
          }

          return {
            ok: true,
            url: page.url(),
            title: await page.title(),
            results
          };
        } finally {
          await browserInstance.close();
        }
      }
    `;

    return browser.run({
      code,
      context: {
        url,
        steps: safeSteps,
      },
    });
  }

  async function smokeTest({ url }) {
    const page = await checkPage({ url });

    return {
      passed: Boolean(page.ok),
      checks: [
        {
          name: "page-load",
          passed: true,
        },
      ],
      page,
    };
  }

  return {
    checkPage,
    screenshot,
    runJourney,
    smokeTest,
  };
}

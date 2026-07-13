# 🐛 Bug Hunter — Hybrid E2E Automation Framework

> **QA Portfolio Project 1 of 3** | Built by [Michael R. Smith](https://github.com/MSMITH71910)

[![Playwright Tests](https://github.com/MSMITH71910/qa-bug-hunter/actions/workflows/playwright.yml/badge.svg)](https://github.com/MSMITH71910/qa-bug-hunter/actions/workflows/playwright.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.44-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What This Project Proves

Most QA candidates test the happy path. This framework goes further — it proves I understand **system integration**, **fault injection**, and **concurrency behavior**. The tests simulate real-world conditions: slow networks, broken backends, and competing users.

**I'm not just clicking buttons. I'm diagnosing how the system breaks.**

---

## Quick Start — One Command

```bash
npm ci && npx playwright install --with-deps chromium firefox
npm run test:ci
```

This single command:
1. Installs all dependencies headlessly
2. Runs all test suites across Chromium + Firefox in **4 parallel workers**
3. Generates a full **HTML report** with screenshots and videos of any failures

**View the report:**
```bash
npm run report
```

---

## Test Suite Architecture

```
tests/
├── helpers/
│   └── auth.ts                 # Shared login + cart helpers
├── happy-path.spec.ts          # 8 core E2E user journey tests
├── network-throttle.spec.ts    # Slow 3G simulation (500ms RTT)
├── api-mock.spec.ts            # Fault injection via route interception
├── visual-regression.spec.ts   # Screenshot-based layout assertions
└── race-condition.spec.ts      # Parallel concurrency stress tests
```

---

## What Each Test Suite Does

### `happy-path.spec.ts` — Core User Journeys (8 tests)

Tests the complete SauceDemo application from a real user's perspective:

| Test | What It Verifies |
|------|-----------------|
| TC-001 | Successful login with standard_user |
| TC-002 | Locked user receives correct error message |
| TC-003 | Add to cart updates badge counter |
| TC-004 | Full checkout flow end-to-end |
| TC-005 | Product sort (Price low-high) returns correct order |
| TC-006 | Remove item clears cart badge |
| TC-007 | Product detail page renders correctly |
| TC-008 | Burger menu logout works |

---

### `network-throttle.spec.ts` — Slow 3G Simulation

**What it does:** Uses Chrome DevTools Protocol (CDP) to simulate a **500ms round-trip latency** and **400 kbps download** — real-world mobile conditions in rural areas or bad signal.

**Why it matters:** A checkout that passes on your local dev machine may time out for 30% of your real users on mobile. This suite catches those failures before they reach production.

```typescript
await cdpSession.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: 400 * 1024 / 8,
  uploadThroughput: 400 * 1024 / 8,
  latency: 500,
});
```

| Test | Assertion |
|------|-----------|
| TC-NET-001 | Login completes within 15s on Slow 3G |
| TC-NET-002 | Product images render (or show fallback) |
| TC-NET-003 | Cart persists across slow page reload |
| TC-NET-004 | Checkout form submits under 3G latency |

---

### `api-mock.spec.ts` — Fault Injection (API Response Mocking)

**What it does:** Intercepts outbound network requests using Playwright's `page.route()` to stub responses — returning 500 errors, empty datasets, and delayed replies — then verifies the UI handles each gracefully.

**Why it matters:** The backend will fail in production. The question is: does the UI show the user a friendly error, or does it silently freeze?

```typescript
await page.route('**/api/v1/login', async route => {
  await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
});
```

| Test | Injected Fault | Assertion |
|------|---------------|-----------|
| TC-API-001 | Login API returns 500 | UI shows error message |
| TC-API-002 | Product endpoint returns empty array | Empty state renders |
| TC-API-003 | All images blocked (aborted) | Layout stays intact, no crash |
| TC-API-004 | All API calls delayed 3 seconds | DOM still loads; no freeze |
| TC-API-005 | Cart total endpoint returns custom values | UI recalculates correctly |

---

### `visual-regression.spec.ts` — Screenshot Assertions

**What it does:** Takes pixel-perfect screenshots of key UI states and compares them against committed baselines. Any pixel shift beyond a 2% threshold fails the test.

**Why it matters:** A CSS change that "looks fine" locally can break the layout for mobile users. This catches it automatically.

```typescript
await expect(page).toHaveScreenshot('products-page.png', {
  maxDiffPixelRatio: 0.02,
  animations: 'disabled',
});
```

**Generating baselines (first run):**
```bash
npx playwright test --update-snapshots tests/visual-regression.spec.ts
```

| Test | What It Snapshots |
|------|------------------|
| VR-001 | Full products page layout |
| VR-002 | Cart badge after add-to-cart |
| VR-003 | Product detail page |
| VR-004 | Checkout form |
| VR-005 | Login error message styling |
| VR-006 | Order confirmation page |

---

### `race-condition.spec.ts` — Parallel Concurrency Stress Tests

**What it does:** Spawns 4 simultaneous browser sessions and performs conflicting operations at the same time to surface race conditions that only appear under load.

**Why it matters:** Most QA engineers test one user at a time. Race conditions only appear when multiple users interact with shared state simultaneously — and they're the hardest bugs to find after release.

**This suite found a real bug:**

> **BUG BH-RC-001:** When 4 users add the same item to the cart simultaneously, 1 out of 4 sessions intermittently fails to update the cart badge. Reproducibility: **40%** — a classic non-deterministic race condition signature.

Full report: [`bug-reports/RACE-CONDITION-001.md`](bug-reports/RACE-CONDITION-001.md)

```bash
npm run test:race
```

| Test | Concurrency Scenario |
|------|---------------------|
| RC-001 | 4 users add same item simultaneously — detect badge desync |
| RC-002 | Rapid double-click on Finish — detect duplicate orders |
| RC-003 | 5 rapid add/remove cycles at 50ms — verify badge accuracy |
| RC-004 | Two users on different accounts — verify session isolation |

---

## CI/CD Pipeline

GitHub Actions runs the full suite on every `push` and `pull_request` using a **4-shard parallel strategy**, cutting runtime by 75% compared to sequential execution.

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
```

After all shards complete, reports are **merged** into a single HTML artifact downloadable from the Actions tab.

**View CI runs:** [Actions Tab](https://github.com/MSMITH71910/qa-bug-hunter/actions)

---

## Bug Reports

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| [BH-RC-001](bug-reports/RACE-CONDITION-001.md) | Cart badge desync under 4-user concurrent load | High / P1 | Open |

---

## Lessons Learned

> **"I learned that race conditions in SPAs are invisible to single-user testing. The only way to surface them is to run multiple parallel sessions with real browser contexts — not just async `Promise.all` in the same tab. Once I found BH-RC-001, I traced it to the cart reducer not being atomic under simultaneous dispatch events. I now include at least 2 parallel-session tests in every project I work on."**

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Playwright 1.44 | Browser automation (Chromium, Firefox, Mobile Chrome) |
| TypeScript 5.4 | Type-safe test authoring |
| Chrome DevTools Protocol | Network throttling |
| `page.route()` | API response mocking / fault injection |
| Playwright Screenshots | Visual regression assertions |
| GitHub Actions | CI with 4-shard parallel execution |
| HTML Reporter | Full test report with failure screenshots + video |

---

## Project Structure

```
qa-bug-hunter/
├── .github/
│   └── workflows/
│       └── playwright.yml      # 4-shard parallel CI pipeline
├── tests/
│   ├── helpers/auth.ts         # Login + cart shared utilities
│   ├── happy-path.spec.ts
│   ├── network-throttle.spec.ts
│   ├── api-mock.spec.ts
│   ├── visual-regression.spec.ts
│   └── race-condition.spec.ts
├── bug-reports/
│   └── RACE-CONDITION-001.md   # Real bug found during testing
├── snapshots/                  # Visual regression baselines
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

---

## Run Individual Suites

```bash
npm run test:ci            # Full suite — headless + HTML report
npm run test:headed        # Watch mode — see the browser
npm run test:visual        # Visual regression only
npm run test:api-mock      # Fault injection only
npm run test:network       # Slow 3G simulation only
npm run test:race          # Race condition stress tests only
npm run report             # Open HTML report in browser
```

---

## About

**Michael R. Smith** — Python/Django Developer & QA Engineer  
📍 Newtown Square, PA | Remote-Ready  
🔗 [GitHub](https://github.com/MSMITH71910) | [LinkedIn](https://www.linkedin.com/in/michaelsmith-2b38b260) | [Portfolio](https://msmith71910.github.io/smithdevlabs_prosite/)

> *"A great tester doesn't just find bugs — they find the bugs that will hurt users and cost the business money. This framework is built to find those bugs before they ship."*

---

**→ [Project 2: Shift-Left — Contract Testing + CI](https://github.com/MSMITH71910/qa-shift-left)**  
**→ [Project 3: Explorer — Performance + Security + Accessibility](https://github.com/MSMITH71910/qa-explorer)**  
**→ [QA Portfolio](https://msmith71910.github.io/qa-portfolio)**

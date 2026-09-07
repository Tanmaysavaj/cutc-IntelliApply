/**
 * Job-posting extractor, injected into the active tab on demand.
 *
 * Injected with `chrome.scripting.executeScript({ func })`, which serialises the
 * function source and runs it in the page. It must therefore be entirely
 * self-contained — no imports and no references to module scope — so every
 * helper lives inside it.
 *
 * It only reads the DOM. It deliberately makes no network calls: content-script
 * requests are subject to page CORS, and keeping the API in the service worker
 * avoids that entirely.
 *
 * It also does not try to parse fields per job board. The backend already turns a
 * pasted description into structured data, so the job here is just to find the
 * right block of text and hand it over. That keeps this resilient to the constant
 * DOM churn on sites like LinkedIn.
 */
export function extractPosting() {
  const MAX_TEXT = 20000;

  const NOISE = "nav,header,footer,aside,script,style,noscript,svg,iframe,form,button";

  // Containers used by common boards, tried before the generic heuristic.
  const KNOWN_SELECTORS = [
    ".jobs-description__content",
    ".jobs-box__html-content",
    "#job-details",
    ".job-view-layout",
    "#jobDescriptionText",
    ".jobsearch-JobComponent",
    "#content .job",
    "[data-testid='jobDescriptionText']",
    ".job-description",
    "#job-description",
    ".posting",
    ".posting-page",
    "[data-qa='job-description']",
    ".ATS_JobDescription",
    ".jobDescription",
    "[class*='jobDescription']",
    "[class*='job-details']",
  ];

  const GENERIC_SELECTORS = ["main", "[role='main']", "article", "#content", ".content", "body"];

  function cleanText(root) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll(NOISE).forEach((el) => el.remove());
    // Hidden elements often hold duplicate or template content.
    clone.querySelectorAll("[aria-hidden='true'],[hidden]").forEach((el) => el.remove());
    return (clone.innerText || clone.textContent || "")
      .replace(/[ \t\u00a0]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim();
  }

  function pick() {
    for (const selector of KNOWN_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el);
        if (text.length > 200) return { text, strategy: `selector:${selector}` };
      }
    }

    // Generic fallback: of the plausible containers, take the one with the most
    // text. A job page's description is almost always the dominant text block.
    let best = null;
    for (const selector of GENERIC_SELECTORS) {
      for (const el of document.querySelectorAll(selector)) {
        const text = cleanText(el);
        if (!best || text.length > best.text.length) best = { text, strategy: `largest:${selector}` };
      }
    }
    return best ?? { text: "", strategy: "none" };
  }

  function metaContent(...names) {
    for (const name of names) {
      const el =
        document.querySelector(`meta[property='${name}']`) ||
        document.querySelector(`meta[name='${name}']`);
      const value = el?.getAttribute("content")?.trim();
      if (value) return value;
    }
    return "";
  }

  function guessTitle() {
    const jsonLd = readJsonLd();
    if (jsonLd?.title) return jsonLd.title;
    const h1 = document.querySelector("h1")?.innerText?.trim();
    if (h1 && h1.length < 160) return h1;
    return metaContent("og:title") || document.title || "";
  }

  function guessCompany() {
    const jsonLd = readJsonLd();
    if (jsonLd?.hiringOrganization?.name) return jsonLd.hiringOrganization.name;
    const candidates = [
      ".jobs-unified-top-card__company-name",
      "[data-testid='inlineHeader-companyName']",
      "[data-company-name]",
      ".topcard__org-name-link",
      ".company",
    ];
    for (const selector of candidates) {
      const value = document.querySelector(selector)?.innerText?.trim();
      if (value) return value;
    }
    return metaContent("og:site_name") || "";
  }

  /** Many boards publish schema.org JobPosting, which is far more reliable than the DOM. */
  function readJsonLd() {
    for (const script of document.querySelectorAll("script[type='application/ld+json']")) {
      try {
        const parsed = JSON.parse(script.textContent || "{}");
        const list = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] ?? [])];
        const posting = list.find((item) => item && item["@type"] === "JobPosting");
        if (posting) return posting;
      } catch {
        // Malformed JSON-LD is common; just move on.
      }
    }
    return null;
  }

  const picked = pick();
  const jsonLd = readJsonLd();

  // Prefer the JSON-LD description when present — it is the posting itself,
  // without surrounding page furniture.
  let text = picked.text;
  let strategy = picked.strategy;
  if (jsonLd?.description) {
    const div = document.createElement("div");
    div.innerHTML = jsonLd.description;
    const ldText = (div.innerText || div.textContent || "").trim();
    if (ldText.length > 200 && ldText.length > text.length * 0.5) {
      text = ldText;
      strategy = "json-ld";
    }
  }

  return {
    url: location.href,
    pageTitle: document.title || "",
    title: guessTitle(),
    company: guessCompany(),
    text: text.slice(0, MAX_TEXT),
    truncated: text.length > MAX_TEXT,
    strategy,
    capturedAt: new Date().toISOString(),
  };
}

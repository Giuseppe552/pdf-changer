/* global URL */
import fs from "node:fs";
import { isConcreteRoute } from "./route-map.mjs";

export const SEVERITY_WEIGHTS = {
  critical: 25,
  bullshit: 8,
  shit: 4,
  "fuck-off": 1,
};

const SEVERITY_RANK = {
  critical: 4,
  bullshit: 3,
  shit: 2,
  "fuck-off": 1,
};

const DEFAULT_LEXICON_PATH = new URL("./lexicon.json", import.meta.url);
const DEFAULT_ALLOWLIST_PATH = new URL("./allowlist.json", import.meta.url);

function lower(value) {
  return value.toLowerCase();
}

function normalizeSentence(value) {
  return value.replace(/\s+/g, " ").trim();
}

function sentenceSplit(text) {
  const out = text
    .split(/(?<=[.!?])\s+/g)
    .map((part) => normalizeSentence(part))
    .filter(Boolean);
  return out.length ? out : [normalizeSentence(text)].filter(Boolean);
}

function wordCount(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function firstMatch(text, terms) {
  return terms.find((term) => text.includes(term)) ?? null;
}

function sentenceActionable(sentence, actionableVerbs) {
  const normalized = lower(sentence);
  return actionableVerbs.some((verb) => {
    if (verb.includes(" ")) return normalized.includes(verb);
    const pattern = new RegExp(`\\b${verb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return pattern.test(normalized);
  });
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function jaccardSimilarity(aText, bText) {
  const a = new Set(tokenize(aText));
  const b = new Set(tokenize(bText));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function loadJsonFile(filePathOrUrl) {
  const filePath =
    typeof filePathOrUrl === "string" ? filePathOrUrl : filePathOrUrl.pathname;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeAllowlist(allowlist) {
  return Object.fromEntries(
    Object.entries(allowlist).map(([key, list]) => [
      key,
      Array.isArray(list) ? list.map((value) => lower(String(value))) : [],
    ]),
  );
}

function buildFinding({ issueType, severity, message, unit, details }) {
  return {
    issueType,
    severity,
    message,
    route: unit.route,
    routeType: unit.routeType,
    file: unit.file,
    line: unit.line,
    column: unit.column,
    unitId: unit.id,
    text: unit.text,
    details,
  };
}

function hasAllowlistMatch(textLower, list) {
  return list.some((item) => textLower.includes(item));
}

function evaluateUnsupportedTrustClaim(unit, config) {
  const textLower = lower(unit.text);
  const hasTrustWord = includesAny(textLower, config.lexicon.trustClaimWords);
  if (!hasTrustWord) {
    return { claimDetected: false, evidenceBacked: false, finding: null };
  }

  if (wordCount(unit.text) < 5) {
    return { claimDetected: false, evidenceBacked: false, finding: null };
  }

  const questionLike =
    textLower.includes("?") ||
    /^(how|what|why|when|can|does|is)\b/i.test(textLower);
  if (questionLike) {
    return { claimDetected: false, evidenceBacked: false, finding: null };
  }

  const claimContext = /\b(pdf changer|this tool|this route|this site|our|we|workflow|processing|feature|service|app)\b/i.test(
    textLower,
  );
  const absoluteClaimHint = includesAny(textLower, config.lexicon.trustAbsoluteWords);
  if (!claimContext && !absoluteClaimHint) {
    return { claimDetected: false, evidenceBacked: false, finding: null };
  }

  const defensiveBoundary =
    /\b(does not|do not|cannot|can't|no tool guarantees|not protect|limits?)\b/i.test(textLower) ||
    /\bnot\s+a?\s*guarantee(d)?\b/i.test(textLower);
  const evidenceBacked =
    defensiveBoundary || includesAny(textLower, config.lexicon.mechanismWords);

  if (
    hasAllowlistMatch(textLower, config.allowlist.unsupportedTrustClaim) ||
    evidenceBacked
  ) {
    return { claimDetected: true, evidenceBacked: true, finding: null };
  }

  const absoluteClaim =
    absoluteClaimHint ||
    /\b(always|never|fully)\b/.test(textLower);
  const severity = absoluteClaim ? "critical" : "bullshit";

  return {
    claimDetected: true,
    evidenceBacked: false,
    finding: buildFinding({
      issueType: "unsupported-trust-claim",
      severity,
      message:
        "Trust/safety claim appears without mechanism or explicit limitation in the same paragraph.",
      unit,
      details: { matchedTrustWord: firstMatch(textLower, config.lexicon.trustClaimWords) },
    }),
  };
}

function extractToolSlugFromRoute(route) {
  const match = route.match(/^\/tools\/([a-z0-9-]+)/);
  return match ? match[1] : null;
}

function evaluateFeatureAvailabilityMismatch(unit, config) {
  const slug = extractToolSlugFromRoute(unit.route);
  if (!slug) return null;
  const status = config.toolStatusBySlug[slug] ?? "ga";
  if (status === "ga") return null;

  const textLower = lower(unit.text);
  const positiveAvailability = [
    "available now",
    "fully functional",
    "production-ready",
    "ready now",
    "works now",
  ];
  const limitedQualifiers = ["beta", "coming", "preview", "limited", "in progress", "not active"];

  if (!includesAny(textLower, positiveAvailability)) return null;
  if (includesAny(textLower, limitedQualifiers)) return null;

  return buildFinding({
    issueType: "feature-availability-mismatch",
    severity: "critical",
    message: `Route maps to ${status} tool status but copy implies GA availability.`,
    unit,
    details: { toolSlug: slug, status },
  });
}

function evaluateFuturePromiseWithoutContract(unit, config) {
  const textLower = lower(unit.text);
  if (!includesAny(textLower, config.lexicon.futurePromiseWords)) return null;
  if (hasAllowlistMatch(textLower, config.allowlist.futurePromiseWithoutContract)) return null;
  if (/\b(not available|preview|beta|coming soon|coming-soon|limited)\b/i.test(textLower)) return null;
  if (/\b20\d{2}\b/.test(textLower)) return null;
  if (includesAny(textLower, config.lexicon.futureContractWords)) return null;

  return buildFinding({
    issueType: "future-promise-without-contract",
    severity: "bullshit",
    message:
      "Future-looking claim appears without concrete contract details (date/status/milestone).",
    unit,
    details: { matchedFutureWord: firstMatch(textLower, config.lexicon.futurePromiseWords) },
  });
}

function evaluatePlaceholderCopy(unit, config) {
  const textLower = lower(unit.text);
  if (includesAny(textLower, config.lexicon.placeholderPatterns)) {
    return buildFinding({
      issueType: "placeholder-scaffold-copy",
      severity: "shit",
      message: "Placeholder or scaffold language appears in user-facing copy.",
      unit,
      details: { matchedPattern: firstMatch(textLower, config.lexicon.placeholderPatterns) },
    });
  }
  if (/£0\.00.*launch/i.test(unit.text)) {
    return buildFinding({
      issueType: "placeholder-scaffold-copy",
      severity: "shit",
      message: "Launch-placeholder values appear in user-facing copy.",
      unit,
      details: {},
    });
  }
  return null;
}

function evaluateNonActionableParagraph(unit, config) {
  const words = wordCount(unit.text);
  if (words <= 70) return null;
  const sentences = sentenceSplit(unit.text);
  const actionable = sentences.filter((sentence) =>
    sentenceActionable(sentence, config.lexicon.actionableVerbs),
  ).length;
  const mechanismPresent = includesAny(lower(unit.text), config.lexicon.mechanismWords);
  const boundaryPresent = /\b(does not|cannot|limit|boundary|not protect)\b/i.test(unit.text);
  if (actionable > 0 || mechanismPresent || boundaryPresent) return null;

  return buildFinding({
    issueType: "non-actionable-paragraph",
    severity: "shit",
    message: "Long paragraph has no concrete action, mechanism, or explicit boundary.",
    unit,
    details: { words, actionableSentences: actionable, sentenceCount: sentences.length },
  });
}

function sentenceIsConcrete(sentence, config) {
  const sentenceLower = lower(sentence);
  if (sentenceActionable(sentence, config.lexicon.actionableVerbs)) return true;
  if (includesAny(sentenceLower, config.lexicon.mechanismWords)) return true;
  if (/\b\d+(\.\d+)?\b/.test(sentenceLower)) return true;
  if (
    /\b(limit|quota|plan|account|status|month|file|files|pdf|page|pages|download|upload|billing|price|tool|available|planned|unlimited|workflow)\b/i.test(
      sentenceLower,
    )
  ) {
    return true;
  }
  if (/\b(does not|cannot|limit|limits|boundary|not protect|warning)\b/i.test(sentenceLower)) {
    return true;
  }
  return false;
}

function evaluateJargonWithoutDefinition(unit, config) {
  if (
    !(
      unit.route === "/" ||
      unit.route.startsWith("/faq") ||
      unit.route.startsWith("/security/non-technical") ||
      unit.route === "/security"
    )
  ) {
    return null;
  }

  const textLower = lower(unit.text);
  const matched = firstMatch(textLower, config.lexicon.jargonTerms);
  if (!matched) return null;
  if (
    new RegExp(`\\b${matched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b\\s*(is|means|\\()`, "i").test(
      textLower,
    )
  ) {
    return null;
  }

  return buildFinding({
    issueType: "jargon-without-definition",
    severity: "fuck-off",
    message: "Jargon appears in non-technical context without a quick plain-language definition.",
    unit,
    details: { term: matched },
  });
}

function evaluateWeakCta(unit, config) {
  const textLower = lower(unit.text);
  if (hasAllowlistMatch(textLower, config.allowlist.weakCta)) return null;
  const words = wordCount(textLower);
  if (words > 5) return null;
  const match = firstMatch(textLower, config.lexicon.weakCtaPhrases);
  if (!match) return null;
  return buildFinding({
    issueType: "weak-cta-utility",
    severity: "fuck-off",
    message: "CTA language is generic and does not describe user outcome.",
    unit,
    details: { phrase: match },
  });
}

function ensurePageScorecard(pageMap, unit) {
  if (pageMap.has(unit.route)) return pageMap.get(unit.route);
  const next = {
    route: unit.route,
    routeType: unit.routeType,
    cluster: unit.cluster,
    unitCount: 0,
    claimCount: 0,
    evidenceBackedClaimCount: 0,
    actionableSentenceRatio: 1,
    repetitionSimilarityMax: 0,
    repetitionPeerRoute: null,
    severityCounts: {
      critical: 0,
      bullshit: 0,
      shit: 0,
      "fuck-off": 0,
    },
    score: 100,
    sentenceCount: 0,
    actionableSentenceCount: 0,
    textParts: [],
  };
  pageMap.set(unit.route, next);
  return next;
}

function findRepetitionFindings(pageList) {
  const findings = [];
  const byCluster = new Map();
  for (const page of pageList) {
    if (!isConcreteRoute(page.route)) continue;
    if (!page.textParts.length) continue;
    const words = wordCount(page.textParts.join(" "));
    if (words < 40) continue;
    const group = byCluster.get(page.cluster) ?? [];
    group.push(page);
    byCluster.set(page.cluster, group);
  }

  for (const pages of byCluster.values()) {
    if (pages.length < 2) continue;
    for (let i = 0; i < pages.length; i += 1) {
      for (let j = i + 1; j < pages.length; j += 1) {
        const a = pages[i];
        const b = pages[j];
        const similarity = jaccardSimilarity(a.textParts.join(" "), b.textParts.join(" "));
        if (similarity <= 0.78) continue;

        a.repetitionSimilarityMax = Math.max(a.repetitionSimilarityMax, similarity);
        b.repetitionSimilarityMax = Math.max(b.repetitionSimilarityMax, similarity);
        if (a.repetitionSimilarityMax === similarity) a.repetitionPeerRoute = b.route;
        if (b.repetitionSimilarityMax === similarity) b.repetitionPeerRoute = a.route;

        const severity = similarity > 0.88 ? "shit" : "fuck-off";
        findings.push({
          issueType: "repetition-template-echo",
          severity,
          message: `Route copy is too similar to ${b.route} (similarity ${similarity.toFixed(2)}).`,
          route: a.route,
          routeType: a.routeType,
          file: null,
          line: 0,
          column: 0,
          unitId: null,
          text: null,
          details: { peerRoute: b.route, similarity },
        });
        findings.push({
          issueType: "repetition-template-echo",
          severity,
          message: `Route copy is too similar to ${a.route} (similarity ${similarity.toFixed(2)}).`,
          route: b.route,
          routeType: b.routeType,
          file: null,
          line: 0,
          column: 0,
          unitId: null,
          text: null,
          details: { peerRoute: a.route, similarity },
        });
      }
    }
  }

  return findings;
}

function finalizeScores(pageList, findings) {
  const findingByRoute = new Map();
  for (const finding of findings) {
    const list = findingByRoute.get(finding.route) ?? [];
    list.push(finding);
    findingByRoute.set(finding.route, list);
  }

  for (const page of pageList) {
    const routeFindings = findingByRoute.get(page.route) ?? [];
    let penalty = 0;
    for (const finding of routeFindings) {
      page.severityCounts[finding.severity] += 1;
      penalty += SEVERITY_WEIGHTS[finding.severity] ?? 0;
    }
    page.score = Math.max(0, 100 - penalty);
    page.actionableSentenceRatio =
      page.sentenceCount > 0 ? page.actionableSentenceCount / page.sentenceCount : 1;
    delete page.sentenceCount;
    delete page.actionableSentenceCount;
    delete page.textParts;
  }
}

function summaryFromFindings(findings, pages) {
  const severityCounts = {
    critical: 0,
    bullshit: 0,
    shit: 0,
    "fuck-off": 0,
  };
  const issueCounts = {};
  for (const finding of findings) {
    severityCounts[finding.severity] += 1;
    issueCounts[finding.issueType] = (issueCounts[finding.issueType] ?? 0) + 1;
  }
  return {
    findingCount: findings.length,
    pageCount: pages.length,
    severityCounts,
    issueCounts,
  };
}

function compareFindings(a, b) {
  const severityDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
  if (severityDiff !== 0) return severityDiff;
  const routeDiff = String(a.route).localeCompare(String(b.route));
  if (routeDiff !== 0) return routeDiff;
  const fileDiff = String(a.file ?? "").localeCompare(String(b.file ?? ""));
  if (fileDiff !== 0) return fileDiff;
  return (a.line ?? 0) - (b.line ?? 0);
}

export function analyzeCopyQuality(extraction, options = {}) {
  const lexicon = loadJsonFile(options.lexiconPath ?? DEFAULT_LEXICON_PATH);
  const allowlist = normalizeAllowlist(
    loadJsonFile(options.allowlistPath ?? DEFAULT_ALLOWLIST_PATH),
  );
  const config = {
    lexicon,
    allowlist,
    toolStatusBySlug: extraction.toolStatusBySlug ?? {},
  };

  const findings = [];
  const pageMap = new Map();

  for (const unit of extraction.units) {
    const page = ensurePageScorecard(pageMap, unit);
    page.unitCount += 1;
    page.textParts.push(unit.text);
    const sentences = sentenceSplit(unit.text);
    for (const sentence of sentences) {
      if (wordCount(sentence) < 5) continue;
      page.sentenceCount += 1;
      if (sentenceIsConcrete(sentence, config)) {
        page.actionableSentenceCount += 1;
      }
    }

    const trustResult = evaluateUnsupportedTrustClaim(unit, config);
    if (trustResult.claimDetected) {
      page.claimCount += 1;
      if (trustResult.evidenceBacked) {
        page.evidenceBackedClaimCount += 1;
      }
    }
    if (trustResult.finding) findings.push(trustResult.finding);

    const featureMismatch = evaluateFeatureAvailabilityMismatch(unit, config);
    if (featureMismatch) findings.push(featureMismatch);

    const futurePromise = evaluateFuturePromiseWithoutContract(unit, config);
    if (futurePromise) findings.push(futurePromise);

    const placeholder = evaluatePlaceholderCopy(unit, config);
    if (placeholder) findings.push(placeholder);

    const nonActionable = evaluateNonActionableParagraph(unit, config);
    if (nonActionable) findings.push(nonActionable);

    const jargon = evaluateJargonWithoutDefinition(unit, config);
    if (jargon) findings.push(jargon);

    const weakCta = evaluateWeakCta(unit, config);
    if (weakCta) findings.push(weakCta);
  }

  const pages = Array.from(pageMap.values()).sort((a, b) => a.route.localeCompare(b.route));
  findings.push(...findRepetitionFindings(pages));
  finalizeScores(pages, findings);
  findings.sort(compareFindings);

  return {
    generatedAt: new Date().toISOString(),
    scannedFiles: extraction.scannedFiles,
    unitCount: extraction.units.length,
    summary: summaryFromFindings(findings, pages),
    pages,
    findings,
  };
}

export function formatSeverityCounts(severityCounts) {
  return `critical=${severityCounts.critical}, bullshit=${severityCounts.bullshit}, shit=${severityCounts.shit}, fuck-off=${severityCounts["fuck-off"]}`;
}

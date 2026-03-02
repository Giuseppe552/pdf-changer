import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { loadRouteContext, resolveRouteContext } from "./route-map.mjs";

const TEXT_FILE_EXTENSIONS = new Set([".ts", ".tsx", ".md", ".json"]);
const SOURCE_ROOTS = ["src/ui/pages", "src/ui/components", "src/content"];
const EXCLUDED_PATTERNS = [
  /\.test\.[cm]?[jt]sx?$/i,
  /\.spec\.[cm]?[jt]sx?$/i,
  /\.d\.ts$/i,
  /\/__tests__\//,
];

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function walkFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const stack = [rootDir];
  const out = [];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile()) out.push(fullPath);
    }
  }
  return out;
}

function shouldIncludeFile(root, filePath) {
  const relPath = toPosix(path.relative(root, filePath));
  if (relPath.startsWith("..")) return false;
  if (!SOURCE_ROOTS.some((prefix) => relPath.startsWith(`${prefix}/`))) return false;
  if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(relPath))) return false;
  const ext = path.extname(relPath).toLowerCase();
  return TEXT_FILE_EXTENSIONS.has(ext);
}

function sourceTypeFor(relPath) {
  if (relPath.startsWith("src/ui/pages/")) return "ui-page";
  if (relPath.startsWith("src/ui/components/")) return "ui-component";
  if (relPath.startsWith("src/content/") && relPath.endsWith(".md")) return "content-markdown";
  if (relPath.startsWith("src/content/") && relPath.endsWith(".json")) return "content-json";
  if (relPath.startsWith("src/content/")) return "content-ts";
  return "unknown";
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isRouteLike(value) {
  return /^\/[a-z0-9:/._-]*$/i.test(value);
}

function looksLikeClassList(value) {
  return (
    /[a-z0-9-]+/.test(value) &&
    value.includes(" ") &&
    value.includes("-") &&
    !/[.!?]/.test(value) &&
    !/[A-Z]/.test(value)
  );
}

function isVisibleText(value) {
  const text = normalizeWhitespace(value);
  if (!text) return null;
  if (text.length < 3) return null;
  if (isRouteLike(text)) return null;
  if (/^[A-Z0-9_]+$/.test(text)) return null;
  if (/^[a-z0-9._-]+$/.test(text) && !text.includes(" ")) return null;
  if (/^\w+\.(ts|tsx|js|mjs|json|md)$/i.test(text)) return null;
  if (looksLikeClassList(text)) return null;
  return text;
}

function lineAndColumn(sourceFile, pos) {
  const lc = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: lc.line + 1, column: lc.character + 1 };
}

function stripMarkdownFormatting(value) {
  return normalizeWhitespace(
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s*/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1"),
  );
}

function markdownUnits(raw) {
  const out = [];
  let body = raw;
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    for (const line of frontmatter.split("\n")) {
      const idx = line.indexOf(":");
      if (idx <= 0) continue;
      const value = normalizeWhitespace(line.slice(idx + 1).trim().replace(/^["']|["']$/g, ""));
      const visible = isVisibleText(value);
      if (visible) out.push({ text: visible, section: "frontmatter", line: 1, column: 1 });
    }
    body = raw.slice(frontmatterMatch[0].length);
  }

  const cleaned = body.replace(/```[\s\S]*?```/g, " ");
  const paragraphs = cleaned
    .split(/\n\s*\n/g)
    .map((part) => stripMarkdownFormatting(part))
    .map((part) => isVisibleText(part))
    .filter(Boolean);

  paragraphs.forEach((text, index) => {
    out.push({
      text,
      section: "markdown-body",
      line: index + 1,
      column: 1,
    });
  });
  return out;
}

function shouldSkipLiteral(text, parentNode) {
  if (!text) return true;
  if (isRouteLike(text)) return true;

  if (
    ts.isImportDeclaration(parentNode) ||
    ts.isExportDeclaration(parentNode) ||
    ts.isExternalModuleReference(parentNode)
  ) {
    return true;
  }

  if (ts.isJsxAttribute(parentNode)) {
    const attrName = parentNode.name.getText();
    if (["className", "to", "href", "src", "id", "key", "path", "download", "type"].includes(attrName)) {
      return true;
    }
  }

  if (ts.isPropertyAssignment(parentNode) || ts.isShorthandPropertyAssignment(parentNode)) {
    const propertyName = parentNode.name?.getText?.() ?? "";
    if (
      [
        "path",
        "slug",
        "to",
        "href",
        "route",
        "id",
        "key",
        "className",
        "file",
        "pattern",
        "keywords",
      ].includes(
        propertyName.replace(/['"]/g, ""),
      )
    ) {
      return true;
    }
  }

  return false;
}

function typeScriptUnits(raw, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const scriptKind = ext === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, raw, ts.ScriptTarget.Latest, true, scriptKind);
  const out = [];

  function addUnit(text, node, section) {
    const visible = isVisibleText(text);
    if (!visible) return;
    const { line, column } = lineAndColumn(sourceFile, node.getStart(sourceFile, false));
    out.push({ text: visible, line, column, section });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      addUnit(node.getText(sourceFile), node, "jsx-text");
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!shouldSkipLiteral(node.text, node.parent)) {
        addUnit(node.text, node, "string-literal");
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return out;
}

function jsonUnits(raw) {
  const out = [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }

  function walk(value, pointer) {
    if (typeof value === "string") {
      const visible = isVisibleText(value);
      if (visible) {
        out.push({
          text: visible,
          section: `json:${pointer}`,
          line: 1,
          column: 1,
        });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${pointer}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        walk(item, pointer ? `${pointer}.${key}` : key);
      }
    }
  }

  walk(parsed, "");
  return out;
}

function unitsForFile(raw, relPath, absPath) {
  if (relPath.endsWith(".md")) return markdownUnits(raw);
  if (relPath.endsWith(".json")) return jsonUnits(raw);
  if (relPath.endsWith(".ts") || relPath.endsWith(".tsx")) return typeScriptUnits(raw, absPath);
  return [];
}

export function extractCopy({ root = process.cwd() } = {}) {
  const files = SOURCE_ROOTS.flatMap((prefix) => walkFiles(path.join(root, prefix)));
  const inScopeFiles = files.filter((filePath) => shouldIncludeFile(root, filePath));
  const routeContext = loadRouteContext(root);
  const units = [];
  let unitIndex = 0;

  for (const absPath of inScopeFiles.sort()) {
    const relPath = toPosix(path.relative(root, absPath));
    const raw = fs.readFileSync(absPath, "utf8");
    const entries = unitsForFile(raw, relPath, absPath);
    if (!entries.length) continue;
    const routeInfo = resolveRouteContext(root, absPath, { toolSlugs: routeContext.toolSlugs });
    const sourceType = sourceTypeFor(relPath);
    for (const entry of entries) {
      unitIndex += 1;
      units.push({
        id: `u${unitIndex}`,
        file: relPath,
        sourceType,
        route: routeInfo.route,
        routeType: routeInfo.routeType,
        cluster: routeInfo.cluster,
        text: entry.text,
        line: entry.line,
        column: entry.column,
        section: entry.section,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    root,
    scannedFiles: inScopeFiles.length,
    units,
    toolStatusBySlug: routeContext.toolStatusBySlug,
  };
}

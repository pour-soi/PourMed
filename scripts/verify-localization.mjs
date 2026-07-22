import { readFileSync } from "node:fs";
import ts from "typescript";

const i18nSource = readFileSync("src/client/i18n.ts", "utf8");
const sourceFile = ts.createSourceFile(
  "i18n.ts",
  i18nSource,
  ts.ScriptTarget.Latest,
  true,
);
let keys = new Set();
function findResources(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText() === "zh" &&
    node.initializer &&
    ts.isAsExpression(node.initializer)
  ) {
    const object = node.initializer.expression;
    if (ts.isObjectLiteralExpression(object))
      keys = new Set(
        object.properties.flatMap((property) =>
          ts.isPropertyAssignment(property) &&
          (ts.isStringLiteral(property.name) || ts.isIdentifier(property.name))
            ? [property.name.text]
            : [],
        ),
      );
  }
  ts.forEachChild(node, findResources);
}
findResources(sourceFile);

const allowed = new Set([
  "PourMed",
  "PourMed — Medication reminder",
  "English",
  "简体中文",
  "IANA time zone",
  "0",
  "10",
  "15",
  "20",
  "30",
  "45",
  "60",
  "○",
  "—",
  "×",
  "✓",
  "◐",
  "↑",
  "↓",
]);
const missing = [];
const html = readFileSync("src/client/index.html", "utf8")
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<style[\s\S]*?<\/style>/g, "");
for (const match of html.matchAll(/>([^<]+)</g)) {
  const value = match[1].replace(/\s+/g, " ").trim().replaceAll("&amp;", "&");
  if (value && !keys.has(value) && !allowed.has(value))
    missing.push(`HTML: ${value}`);
}

const clientSource = readFileSync("src/client/main.ts", "utf8");
const client = ts.createSourceFile(
  "main.ts",
  clientSource,
  ts.ScriptTarget.Latest,
  true,
);
function scanClient(node) {
  if (ts.isCallExpression(node)) {
    const name = node.expression.getText();
    const index =
      name === "el" || name === "note" || name === "confirm"
        ? name === "el"
          ? 1
          : 0
        : -1;
    const argument = index >= 0 ? node.arguments[index] : undefined;
    if (
      argument &&
      ts.isStringLiteral(argument) &&
      !keys.has(argument.text) &&
      !allowed.has(argument.text)
    )
      missing.push(`main.ts: ${argument.text}`);
  }
  if (ts.isNewExpression(node) && node.expression.getText() === "Option") {
    const argument = node.arguments?.[0];
    if (
      argument &&
      ts.isStringLiteral(argument) &&
      !keys.has(argument.text) &&
      !allowed.has(argument.text)
    )
      missing.push(`main.ts: ${argument.text}`);
  }
  ts.forEachChild(node, scanClient);
}
scanClient(client);

if (missing.length) {
  console.error(`Unlocalized user-facing strings:\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(
  `Localization resources and user-facing string scan passed (${keys.size} keys).`,
);

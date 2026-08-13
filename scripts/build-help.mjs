// Renders docs/help.md into src-tauri/resources/help.html, wrapped in the
// app's own dark theme. This is the single source of truth for the bundled
// in-app help doc -- edit docs/help.md, not the generated HTML directly.
//
// Runs locally before `tauri dev`/`tauri build` (see package.json's `dev`/
// `build` scripts) so local development always has an up-to-date help doc
// without needing CI. The release workflow (.github/workflows/publish.yml)
// also renders it via a GitHub Action for the same source file, so both
// paths stay in sync by construction -- there's only one place the actual
// content lives.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const markdown = readFileSync(join(root, "docs/help.md"), "utf-8");
const body = marked.parse(markdown);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Textract — Help</title>
<style>
  :root {
    --dark: #282828;
    --dark-darker: #1e1e1e;
    --light: #faf1c9;
    --muted: #a8a196;
    --border: #3a3a3a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 40px 24px 64px;
    background: var(--dark-darker);
    color: var(--light);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    line-height: 1.5;
  }
  .wrap { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: 0.02em; }
  h1 + p { color: var(--muted); margin: 0 0 36px; font-size: 15px; }
  h2 {
    font-size: 18px;
    margin: 40px 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
    letter-spacing: 0.02em;
  }
  h3 {
    font-size: 14px;
    color: var(--muted);
    margin: 20px 0 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  p { color: #d8d0bd; }
  ol, ul { color: #d8d0bd; padding-left: 22px; }
  li { margin-bottom: 6px; }
  code {
    background: var(--dark);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.92em;
    color: var(--light);
  }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 8px 0 4px; }
  th, td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
    overflow-wrap: break-word;
  }
  th { color: var(--muted); font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  td:first-child { white-space: nowrap; }
  hr { border: none; border-top: 1px solid var(--border); margin: 56px 0 20px; }
  a { color: var(--light); }
  .wrap > hr + p {
    color: var(--muted);
    font-size: 13px;
  }
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>
`;

const filePath = join(root, "src-tauri/resources/help.html");
mkdirSync(dirname(filePath), { recursive: true });
writeFileSync(filePath, html);
console.log("Rendered docs/help.md -> src-tauri/resources/help.html");

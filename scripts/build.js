import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");

const sectionOrder = [
  ["purpose", "Purpose"],
  ["mechanics", "How It Works"],
  ["design", "Design Choices"],
  ["benefits", "Benefits"],
  ["risks", "Risks And Criticisms"],
  ["implementation", "Implementation Issues"],
  ["recommendation", "Recommendation"],
  ["uk", "UK Introduction"],
  ["examples", "Global Examples"],
  ["evidence", "Comparative Evidence"],
  ["sources", "Sources"]
];

async function main() {
  const site = await readJson(path.join(srcDir, "data", "site.json"));
  const policies = await loadPolicies();

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(path.join(distDir, "assets"), { recursive: true });
  await fs.mkdir(path.join(distDir, "policies"), { recursive: true });

  const rawCss = await fs.readFile(path.join(srcDir, "assets", "styles.css"), "utf8");
  await fs.writeFile(path.join(distDir, "assets", "styles.css"), minifyCss(rawCss), "utf8");
  await fs.writeFile(path.join(distDir, ".nojekyll"), "", "utf8");
  await fs.writeFile(path.join(distDir, "index.html"), renderIndex(site, policies), "utf8");

  for (const policy of policies) {
    const outputPath = path.join(distDir, "policies", `${policy.slug}.html`);
    await fs.writeFile(outputPath, renderPolicyPage(site, policies, policy), "utf8");
  }

  await fs.writeFile(path.join(distDir, "sitemap.xml"), renderSitemap(site, policies), "utf8");
  await fs.writeFile(path.join(distDir, "robots.txt"), renderRobots(site), "utf8");

  console.log(`Built ${policies.length} policy pages into ${distDir}`);
}

async function loadPolicies() {
  const site = await readJson(path.join(srcDir, "data", "site.json"));
  const policiesDir = path.join(srcDir, "data", "policies");
  const files = (await fs.readdir(policiesDir)).filter((file) => file.endsWith(".json")).sort();

  const policies = await Promise.all(
    files.map(async (file) => {
      const policy = await readJson(path.join(policiesDir, file));
      const evidence = await readJson(path.join(srcDir, "data", "evidence", `${policy.slug}.json`));
      validatePolicy(policy, evidence);
      return { ...policy, evidence };
    })
  );

  const order = new Map((site.policyOrder ?? []).map((slug, index) => [slug, index]));
  return policies.sort((left, right) => {
    const leftOrder = order.has(left.slug) ? order.get(left.slug) : Number.MAX_SAFE_INTEGER;
    const rightOrder = order.has(right.slug) ? order.get(right.slug) : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.title.localeCompare(right.title);
  });
}

function validatePolicy(policy, evidence) {
  const requiredArrays = ["purpose", "mechanics", "benefits", "risks", "implementation", "recommendation"];

  for (const key of requiredArrays) {
    if (!Array.isArray(policy[key]) || policy[key].length === 0) {
      throw new Error(`Policy '${policy.slug}' is missing required array '${key}'.`);
    }
  }

  if (!Array.isArray(policy.designChoices) || !policy.designChoices.length) {
    throw new Error(`Policy '${policy.slug}' is missing design choices.`);
  }

  if (!policy.ukRelevance || !Array.isArray(policy.ukRelevance.introduction)) {
    throw new Error(`Policy '${policy.slug}' is missing UK relevance content.`);
  }

  if (!evidence || !Array.isArray(evidence.examples) || !Array.isArray(evidence.analysis)) {
    throw new Error(`Policy '${policy.slug}' is missing evidence content.`);
  }
}

function renderIndex(site, policies) {
  const policyCards = policies
    .map(
      (policy) => `
        <article class="card">
          <div>
            <p class="eyebrow">Policy Detail</p>
            <h2>${escapeHtml(policy.title)}</h2>
          </div>
          <p class="card__summary">${escapeHtml(policy.summary)}</p>
          <div class="card__meta">
            <span class="pill">Manual evidence refresh</span>
            <span class="pill">Updated ${escapeHtml(policy.evidence.updatedAt)}</span>
          </div>
          <a class="card__link" href="${joinUrl(site.basePath, `policies/${policy.slug}.html`)}">Read the full analysis</a>
        </article>
      `
    )
    .join("");

  const body = `
    <header class="site-header">
      <div class="page-shell">
        ${renderTopBar(site, policies, "/index.html")}
      </div>
    </header>
    <main id="main" class="page-shell">
      <section class="hero">
        <div class="hero__grid">
          <div class="hero__panel">
            <p class="eyebrow">Government Policy Analysis</p>
            <h1>${escapeHtml(site.name)}</h1>
            <p class="hero__lede">${escapeHtml(site.mission)}</p>
          </div>
          <aside class="hero__aside hero__meta">
            <div class="metric">
              <strong>Current focus</strong>
              <span>Universal Basic Income and Land Value Tax</span>
            </div>
            <div class="metric">
              <strong>Editorial method</strong>
              <span>Authored core analysis with manually refreshed global examples and evidence.</span>
            </div>
            <div class="metric">
              <strong>Geographic frame</strong>
              <span>UK-first analysis with international comparisons.</span>
            </div>
          </aside>
        </div>
      </section>
      <section class="section-block" id="policies">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Index</p>
            <h2>Policy Briefings</h2>
          </div>
          <p>Each policy page pairs a standing recommendation with a separately refreshed evidence layer, so future policy pages can follow the same pattern.</p>
        </div>
        <div class="policy-grid">
          ${policyCards}
        </div>
      </section>
      <section class="section-block">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Approach</p>
            <h2>How The Site Is Structured</h2>
          </div>
        </div>
        <div class="notes-grid">
          <article class="note">
            <h3>Core Analysis</h3>
            <p>Longer-lived policy judgement is written directly into the repository and includes purpose, mechanics, design options, risks, and a recommended path for the UK.</p>
          </article>
          <article class="note">
            <h3>Evidence Refresh</h3>
            <p>Examples and comparative evidence are refreshed from a curated source list through a manual slash command.</p>
          </article>
          <article class="note">
            <h3>Future Policies</h3>
            <p>The build discovers all policy files automatically, so new policy pages can be added without changing the layout code.</p>
          </article>
        </div>
      </section>
    </main>
    ${renderFooter(site)}
  `;

  return renderDocument({
    title: site.name,
    description: site.description,
    basePath: site.basePath,
    assetVersion: site.assetVersion,
    canonicalPath: joinUrl(site.basePath, "index.html"),
    body
  });
}

function renderPolicyPage(site, policies, policy) {
  const sourceMap = buildSourceMap(policy);
  const sections = [
    {
      id: "purpose",
      title: "Purpose",
      body: renderParagraphs(policy.purpose)
    },
    {
      id: "mechanics",
      title: "How It Works",
      body: renderParagraphs(policy.mechanics)
    },
    {
      id: "design",
      title: "Design Choices",
      body: `
        <div class="design-grid">
          ${policy.designChoices
            .map(
              (item) => `
                <article class="design-card">
                  <h3>${escapeHtml(item.title)}</h3>
                  <div class="section__body">
                    ${renderParagraphs(item.paragraphs)}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      `
    },
    {
      id: "benefits",
      title: "Benefits",
      body: renderList(policy.benefits)
    },
    {
      id: "risks",
      title: "Risks And Criticisms",
      body: renderList(policy.risks)
    },
    {
      id: "implementation",
      title: "Implementation Issues",
      body: renderParagraphs(policy.implementation)
    },
    {
      id: "recommendation",
      title: "Recommendation",
      body: renderParagraphs(policy.recommendation)
    },
    {
      id: "uk",
      title: "UK Introduction",
      body: `
        <div class="subsection">
          <h3>Introduction Path</h3>
          ${renderParagraphs(policy.ukRelevance.introduction)}
        </div>
        <div class="subsection">
          <h3>Political And Administrative Barriers</h3>
          ${renderParagraphs(policy.ukRelevance.barriers)}
        </div>
        <div class="subsection">
          <h3>Interaction With Existing UK Institutions</h3>
          ${renderParagraphs(policy.ukRelevance.interactions)}
        </div>
      `
    },
    {
      id: "examples",
      title: "Global Examples",
      body: `
        <p>${escapeHtml(policy.evidence.editorNote)}</p>
        <div class="evidence-grid">
          ${policy.evidence.examples
            .map(
              (example) => `
                <article class="evidence-card">
                  <h3>${escapeHtml(example.place)}</h3>
                  <p class="evidence-card__meta">${escapeHtml(example.status)}</p>
                  <p>${escapeHtml(example.summary)}</p>
                  ${renderList(example.lessons)}
                  ${renderCitationRow(example.sources, sourceMap)}
                </article>
              `
            )
            .join("")}
        </div>
      `
    },
    {
      id: "evidence",
      title: "Comparative Evidence",
      body: `
        <div class="analysis-grid">
          ${policy.evidence.analysis
            .map(
              (item) => `
                <article class="analysis-card">
                  <h3>${escapeHtml(item.title)}</h3>
                  <div class="section__body">
                    <p>${escapeHtml(item.summary)}</p>
                    ${renderCitationRow(item.sources, sourceMap)}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      `
    },
    {
      id: "sources",
      title: "Sources",
      body: renderSources(policy)
    }
  ];

  const sectionMarkup = sections
    .map(
      (section) => `
        <section class="section" id="${section.id}">
          <h2>${escapeHtml(section.title)}</h2>
          <div class="section__body">${section.body}</div>
        </section>
      `
    )
    .join("");

  const body = `
    <header class="site-header">
      <div class="page-shell">
        ${renderTopBar(site, policies, `/${policy.slug}`)}
      </div>
    </header>
    <main id="main" class="page-shell">
      <div class="policy-layout">
        <aside class="policy-layout__toc">
          <a class="back-link" href="${joinUrl(site.basePath, "index.html")}">Back to the policy index</a>
          <p class="eyebrow">Contents</p>
          <ol>
            ${sectionOrder
              .map(
                ([id, label]) => `<li><a href="#${id}">${escapeHtml(label)}</a></li>`
              )
              .join("")}
          </ol>
        </aside>
        <article class="policy-layout__article">
          <div>
            <div class="policy-kicker">
              <p class="eyebrow">Policy Detail</p>
              <span class="pill">Evidence updated ${escapeHtml(policy.evidence.updatedAt)}</span>
            </div>
            <h1>${escapeHtml(policy.title)}</h1>
            <p class="policy-summary">${escapeHtml(policy.summary)}</p>
          </div>
          ${sectionMarkup}
        </article>
      </div>
    </main>
    ${renderFooter(site)}
  `;

  return renderDocument({
    title: `${policy.title} | ${site.name}`,
    description: policy.summary,
    basePath: site.basePath,
    assetVersion: site.assetVersion,
    canonicalPath: joinUrl(site.basePath, `policies/${policy.slug}.html`),
    body
  });
}

function renderTopBar(site, policies) {
  const navLinks = [
    `<a href="${joinUrl(site.basePath, "index.html")}">Home</a>`,
    ...policies.map(
      (policy) => `<a href="${joinUrl(site.basePath, `policies/${policy.slug}.html`)}">${escapeHtml(policy.title)}</a>`
    )
  ].join("");

  return `
    <div class="site-header__bar">
      <a class="site-mark" href="${joinUrl(site.basePath, "index.html")}">
        <span class="site-mark__title">${escapeHtml(site.name)}</span>
        <span class="site-mark__tag">${escapeHtml(site.tagline)}</span>
      </a>
      <nav class="site-nav" aria-label="Primary">
        ${navLinks}
      </nav>
    </div>
  `;
}

function renderFooter(site) {
  return `
    <footer class="page-shell site-footer">
      <div>
        <p class="eyebrow">Policy Planning</p>
        <p>${escapeHtml(site.description)}</p>
      </div>
      <div>
        <p>Built as a static GitHub Pages site with manually refreshed curated international evidence.</p>
      </div>
    </footer>
  `;
}

function renderSources(policy) {
  const byLabel = new Map();

  for (const source of policy.coreSources ?? []) {
    byLabel.set(source.label, source);
  }

  for (const source of policy.evidence.sourceDirectory ?? []) {
    byLabel.set(source.label, source);
  }

  const unique = [...byLabel.values()];

  return `
    <ul class="source-list">
      ${unique
        .map(
          (source) => `
            <li>
              <a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function buildSourceMap(policy) {
  const entries = [...(policy.coreSources ?? []), ...(policy.evidence.sourceDirectory ?? [])];
  return new Map(entries.map((source) => [source.label, source.url]));
}

function renderCitationRow(labels, sourceMap) {
  if (!Array.isArray(labels) || !labels.length) {
    return "";
  }

  const links = labels
    .map((label) => {
      const url = sourceMap.get(label);
      if (!url) {
        return `<span class="source-chip">${escapeHtml(label)}</span>`;
      }
      return `<a class="source-chip" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
    })
    .join("");

  return `<div class="citation-row">${links}</div>`;
}

function renderParagraphs(paragraphs) {
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

function renderList(items) {
  return `
    <ul class="bullet-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderDocument({ title, description, basePath, assetVersion, body, canonicalPath }) {
  const siteUrl = "https://benbutler55.github.io";
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <link rel="canonical" href="${escapeAttribute(canonicalUrl)}">
    <meta property="og:title" content="${escapeAttribute(title)}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${escapeAttribute(canonicalUrl)}">
    <meta property="og:site_name" content="Policy Planning">
    <link rel="stylesheet" href="${joinUrl(basePath, 'assets/styles.css')}?v=${encodeURIComponent(assetVersion || '1')}">
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    ${body}
  </body>
</html>
`;
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function renderSitemap(site, policies) {
  const siteUrl = "https://benbutler55.github.io";
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: joinUrl(site.basePath, "index.html"), priority: "1.0" },
    ...policies.map((p) => ({
      loc: joinUrl(site.basePath, `policies/${p.slug}.html`),
      priority: "0.8"
    }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${siteUrl}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
}

function renderRobots(site) {
  const siteUrl = "https://benbutler55.github.io";
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}${joinUrl(site.basePath, "sitemap.xml")}
`;
}

function joinUrl(basePath, segment) {
  const base = basePath.replace(/\/$/, "");
  const leaf = segment.replace(/^\//, "");
  return `${base}/${leaf}`;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

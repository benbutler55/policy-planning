import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourcesDir = path.join(rootDir, "src", "data", "sources");
const evidenceDir = path.join(rootDir, "src", "data", "evidence");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const requestedPolicies = new Set(process.argv.slice(2).filter(Boolean));

async function main() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to refresh evidence.");
  }

  const sourceFiles = (await fs.readdir(sourcesDir)).filter((file) => file.endsWith(".json")).sort();
  let registries = await Promise.all(sourceFiles.map((file) => readJson(path.join(sourcesDir, file))));

  if (requestedPolicies.size > 0) {
    registries = registries.filter((registry) => requestedPolicies.has(registry.policy));
    if (registries.length === 0) {
      throw new Error(`No policy source registry matched: ${Array.from(requestedPolicies).join(", ")}`);
    }
  }

  for (const registry of registries) {
    console.log(`Refreshing evidence for ${registry.policy}`);
    const evidence = await buildEvidenceFromSources(registry);
    const outputPath = path.join(evidenceDir, `${registry.policy}.json`);
    await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  }
}


async function buildEvidenceFromSources(registry) {
  const excerpts = [];

  const fetchFailures = [];

  for (const source of registry.sources) {
    try {
      const content = await fetchSourceExcerpt(source.url);
      excerpts.push({
        label: source.label,
        publisher: source.publisher,
        url: source.url,
        notes: source.notes,
        excerpt: content
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping source '${source.label}': ${err.message}`);
      fetchFailures.push(source.label);
      excerpts.push({
        label: source.label,
        publisher: source.publisher,
        url: source.url,
        notes: source.notes,
        excerpt: source.notes || ""
      });
    }
  }

  if (fetchFailures.length > 0) {
    console.warn(`  ${fetchFailures.length} source(s) failed to fetch; using notes as fallback.`);
  }

  if (excerpts.every((e) => !e.excerpt)) {
    throw new Error(`All sources failed to fetch for ${registry.policy}; cannot build evidence.`);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content: [
            "You update only the evidence layer of a policy-analysis site.",
            "Use only the provided sources.",
            "Never invent programmes, findings, or citations.",
            "Return JSON with keys: updatedAt, editorNote, examples, analysis.",
            "examples must be an array of objects with place, status, summary, lessons, sources.",
            "analysis must be an array of objects with title, summary, sources.",
            "All source labels in examples and analysis must exactly match labels from the provided sources.",
            "Write in concise neutral English suitable for a public policy website."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({
            policy: registry.policy,
            instructions: registry.refreshPromptContext,
            sources: excerpts
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${body}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenAI response for ${registry.policy} did not include message content.`);
  }

  const parsed = JSON.parse(content);
  parsed.sourceDirectory = registry.sources.map((s) => ({ label: s.label, url: s.url }));

  for (const example of parsed.examples || []) {
    if (typeof example.lessons === "string") {
      example.lessons = [example.lessons];
    }
  }

  validateEvidence(registry, parsed);
  return parsed;
}

async function fetchSourceExcerpt(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; policy-planning/1.0; +https://github.com)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source '${url}' with status ${response.status}.`);
  }

  const text = await response.text();
  return cleanExcerpt(text).slice(0, 12000);
}

function cleanExcerpt(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function validateEvidence(registry, evidence) {
  const labels = new Set(registry.sources.map((source) => source.label));

  if (!Array.isArray(evidence.examples) || !Array.isArray(evidence.analysis)) {
    throw new Error(`Evidence payload for ${registry.policy} is missing examples or analysis arrays.`);
  }

  for (const example of evidence.examples) {
    assertCitations(labels, example.sources, registry.policy);
  }

  for (const item of evidence.analysis) {
    assertCitations(labels, item.sources, registry.policy);
  }

  if (!Array.isArray(evidence.sourceDirectory) || !evidence.sourceDirectory.length) {
    throw new Error(`Evidence payload for ${registry.policy} is missing sourceDirectory.`);
  }
}

function assertCitations(labels, usedLabels, policy) {
  if (!Array.isArray(usedLabels) || !usedLabels.length) {
    throw new Error(`Evidence payload for ${policy} is missing citations.`);
  }

  for (const label of usedLabels) {
    if (!labels.has(label)) {
      throw new Error(`Evidence payload for ${policy} referenced an unknown source label: ${label}`);
    }
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

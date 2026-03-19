import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface LicenseEntry {
  author?: string;
  description?: string;
  homepage?: string;
  license?: string;
  name: string;
  versions?: string[];
}

type LicenseList = Record<string, LicenseEntry[]>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const outputPath = resolve(projectRoot, "build", "THIRD_PARTY_LICENSES.txt");

function readLicenses(): LicenseList {
  const output = execFileSync(
    "pnpm",
    ["licenses", "list", "--json", "--long"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 32,
    },
  );

  return JSON.parse(output) as LicenseList;
}

function sortEntries(entries: LicenseEntry[]): LicenseEntry[] {
  return [...entries].sort((left, right) => {
    return left.name.localeCompare(right.name, "en");
  });
}

function formatEntry(entry: LicenseEntry): string[] {
  const lines = [`- ${entry.name}`];
  const versions = [...(entry.versions ?? [])].sort((left, right) => {
    return left.localeCompare(right, "en");
  });

  if (versions.length > 0) {
    lines.push(`  versions: ${versions.join(", ")}`);
  }

  if (entry.author?.trim()) {
    lines.push(`  author: ${entry.author.trim()}`);
  }

  if (entry.homepage?.trim()) {
    lines.push(`  homepage: ${entry.homepage.trim()}`);
  }

  if (entry.description?.trim()) {
    lines.push(`  description: ${entry.description.trim()}`);
  }

  return lines;
}

function buildDocument(licenses: LicenseList): string {
  const licenseNames = Object.keys(licenses).sort((left, right) => {
    return left.localeCompare(right, "en");
  });
  const packageCount = licenseNames.reduce((count, licenseName) => {
    return count + licenses[licenseName]!.length;
  }, 0);
  const lines: string[] = [
    "Video2Book third-party licenses",
    "Generated from `pnpm licenses list --json --long`.",
    "",
    `Total packages: ${packageCount}`,
    "",
  ];

  for (const licenseName of licenseNames) {
    lines.push("=".repeat(80));
    lines.push(licenseName);
    lines.push("-".repeat(80));

    for (const entry of sortEntries(licenses[licenseName]!)) {
      lines.push(...formatEntry(entry));
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

const licenses = readLicenses();
const document = buildDocument(licenses);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, document, "utf8");

console.log(`Third-party licenses written to ${outputPath}`);

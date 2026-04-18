import { readFileSync, writeFileSync } from "node:fs";
import yaml from "js-yaml";
import matter from "gray-matter";

export function readYaml<T = unknown>(path: string): T {
  return yaml.load(readFileSync(path, "utf-8"), { schema: yaml.JSON_SCHEMA }) as T;
}

export function writeYaml(path: string, data: unknown): void {
  writeFileSync(path, yaml.dump(data, { indent: 2, lineWidth: 120, quotingType: '"' }));
}

export function readMarkdown(path: string): { frontmatter: unknown; body: string } {
  const parsed = matter(readFileSync(path, "utf-8"));
  return { frontmatter: parsed.data, body: parsed.content };
}

export function writeMarkdownWithFrontmatter(
  path: string,
  frontmatter: Record<string, unknown>,
  body: string,
): void {
  const fm = yaml.dump(frontmatter, { indent: 2, lineWidth: 120, quotingType: '"' }).trimEnd();
  writeFileSync(path, `---\n${fm}\n---\n\n${body.startsWith("\n") ? body.slice(1) : body}`);
}

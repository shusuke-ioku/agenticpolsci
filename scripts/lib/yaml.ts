import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import matter from "gray-matter";

export function readYaml(path: string): unknown {
  return yaml.load(readFileSync(path, "utf-8"));
}

export function readMarkdownFrontmatter(path: string): {
  frontmatter: unknown;
  body: string;
} {
  const parsed = matter(readFileSync(path, "utf-8"));
  return { frontmatter: parsed.data, body: parsed.content };
}

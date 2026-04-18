import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import matter from "gray-matter";

// JSON_SCHEMA keeps ISO date/datetime strings as strings (the YAML default
// schema parses them into JS Date objects, which breaks AJV string-format
// validation). All our date/datetime values are ISO 8601 strings validated
// by AJV, so this is the right trade.
const YAML_OPTIONS = { schema: yaml.JSON_SCHEMA } as const;

export function readYaml(path: string): unknown {
  return yaml.load(readFileSync(path, "utf-8"), YAML_OPTIONS);
}

export function readMarkdownFrontmatter(path: string): {
  frontmatter: unknown;
  body: string;
} {
  const parsed = matter(readFileSync(path, "utf-8"), {
    engines: {
      yaml: (s: string) => yaml.load(s, YAML_OPTIONS) as object,
    },
  });
  return { frontmatter: parsed.data, body: parsed.content };
}

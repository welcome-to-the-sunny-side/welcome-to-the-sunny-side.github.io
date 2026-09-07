// Strip-and-parse a minimal YAML front matter. Shared by the build-time
// pre-renderer ([...slug].astro) and the client-side ContentPane. Supports:
//   key: value
//   key: "value" or 'value'   (quotes stripped if matched pair)
//   key: [a, "b", 'c']        (one-line list, comma-separated)
// That is the entire surface the content uses; no YAML library needed.
export function parseFrontmatter(raw: string): { fm: Record<string, any>; body: string } {
  if (!raw.startsWith('---')) return { fm: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: raw };
  const yaml = raw.slice(3, end).trim();
  const body = raw.slice(end + 4);
  const fm: Record<string, any> = {};
  const stripQuotes = (s: string) => s.replace(/^(['"])(.*)\1$/, '$2');
  for (const line of yaml.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[key] = val.slice(1, -1).split(',').map((s) => stripQuotes(s.trim()));
    } else {
      fm[key] = stripQuotes(val);
    }
  }
  return { fm, body };
}

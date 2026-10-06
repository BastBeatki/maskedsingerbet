// Deliberately small, identity-reviewed list. No speculative name-to-URL fallback.
// Article titles and person identities checked on 2026-10-06; catalog stays unchanged.
const articles: Readonly<Record<string, string>> = Object.freeze({
  'Max Mutzke': 'Max_Mutzke',
  'Tom Beck': 'Tom_Beck',
  'Bülent Ceylan': 'Bülent_Ceylan',
  'Stefanie Heinzmann': 'Stefanie_Heinzmann',
});

export function celebrityInfoLink(name: string | null): string | null {
  const article = name === null ? undefined : Object.hasOwn(articles, name) ? articles[name] : undefined;
  return article ? `https://de.wikipedia.org/wiki/${encodeURIComponent(article)}` : null;
}

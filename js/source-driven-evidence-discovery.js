  const text = String(xml || ''); const out = {};
  for (const article of text.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
    const block = article[1]; const id = block.match(/<PMID[^>]*>([^<]+)<\/PMID>/)?.[1]?.trim();
    if (!id) continue;
    const parts = [...block.matchAll(/<AbstractText(?: [^>]*)?>([\s\S]*?)<\/AbstractText>/g)].map(m=>decodeXml(m[1])).filter(Boolean);
    if (parts.length) out[id] = parts.join(' ');
  }
  return out;
}
function buildEvidenceSearchUrl(source, query) { if (!source || !EVIDENCE_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-evidence-source'); const url = new URL(source.url); if (source.sourceId === 'pubmed-eutils') { url.searchParams.set('term', query); url.searchParams.set('retmode', 'json'); } else if (source.sourceId === 'crossref-works') { url.searchParams.set('query.bibliographic', query); url.searchParams.set('rows', '20'); url.searchParams.set('select', 'DOI,title,abstract,type,published,URL'); } else url.searchParams.set('search', query); return url.toString(); }
function canonicalEvidenceSource(source) { return SOURCE_REGISTRY.find(candidate => candidate.sourceId === source?.sourceId) || null; }
function sourceIsAuthoritative(source) {
  const canonical = canonicalEvidenceSource(source);
  if (!canonical || !EVIDENCE_SOURCE_IDS.has(canonical.sourceId)) return false;
  // Authority is determined by the canonical registry entry. If a caller supplies
  // a jurisdiction, it must agree with that canonical value; callers cannot relabel
  // an international source as US/CA evidence (or vice versa).
  if (source?.jurisdiction && source.jurisdiction !== canonical.jurisdiction) return false;
  return canonical.domain === 'causal-evidence' &&
    (canonical.jurisdiction === 'international' || canonical.sourceId === 'pubmed-eutils');
}
function evidenceConceptTokens(value) {
'use strict';

const { validateSourceDescriptor, rankSources, DATA_DOMAINS } = require('./data-acquisition');

/**
 * Governed discovery catalogue. These are discovery/acquisition entry points,
 * not evidence claims. Individual datasets still require validation/admissibility.
 */
const SOURCE_REGISTRY = Object.freeze([
  {
    sourceId: 'ca-open-government', provider: 'Government of Canada Open Government Portal', jurisdiction: 'CA',
    domain: 'local-baseline', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
    url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=',
    license: 'Open Government Licence - Canada', updateFrequency: 'varies', discoveryTags: ['municipal','provincial','federal','health','safety','transport','housing','environment']
  },
  {
    sourceId: 'oecd-local-data', provider: 'OECD Local Data Portal', jurisdiction: 'international',
    domain: 'population-equity', tier: 'official_structured', accessMethod: 'sdmx-api',
    url: 'https://sdmx.oecd.org/public/rest/data/OECD.CFE.EDS/',
    discoveryTags: ['municipal','demography','housing','services','transport','environment','economy','labour','finance']
  },
  {
    sourceId: 'world-bank-indicators', provider: 'World Bank', jurisdiction: 'international',
    domain: 'comparator-innovation', tier: 'official_structured', accessMethod: 'indicators-api',
    url: 'https://api.worldbank.org/v2/indicator',
    discoveryTags: ['development','poverty','health','economy','education','environment','subnational']
  },
  {
    sourceId: 'openalex-works', provider: 'OpenAlex', jurisdiction: 'international',
    domain: 'causal-evidence', tier: 'independent_causal_research', accessMethod: 'works-api',
    url: 'https://api.openalex.org/works?search=',
    discoveryTags: ['research','interventions','causal','systematic-review','implementation']
  },
  {
    sourceId: 'campbell-evidence', provider: 'Campbell Collaboration', jurisdiction: 'international',
    domain: 'causal-evidence', tier: 'independent_causal_research', accessMethod: 'review-index',
    url: 'https://www.campbellcollaboration.org/reviews/',
    discoveryTags: ['crime','justice','social-welfare','education','climate','disability','business']
  },
  {
    sourceId: 'campbell-crime-justice', provider: 'Campbell Collaboration Crime and Justice', jurisdiction: 'international',
    domain: 'causal-evidence', tier: 'independent_causal_research', accessMethod: 'review-index',
    url: 'https://www.campbellcollaboration.org/crime/reviews/',
    discoveryTags: ['violent-crime','crime','policing','hot-spots','focused-deterrence','violence']
  }
]);

function sourceRegistry({domains = DATA_DOMAINS, tags = [], jurisdiction = null} = {}) {
  const wanted = new Set(domains);
  const tagSet = new Set(tags.map(tag => String(tag).toLowerCase()));
  return rankSources(SOURCE_REGISTRY.filter(source =>
    wanted.has(source.domain) &&
    (!jurisdiction || source.jurisdiction === jurisdiction || source.jurisdiction === 'international') &&
    (!tagSet.size || source.discoveryTags.some(tag => tagSet.has(tag.toLowerCase())))
  ));
}

function validateRegistry() {
  return SOURCE_REGISTRY.map(source => {
    try { validateSourceDescriptor(source); return { sourceId: source.sourceId, valid: true }; }
    catch (error) { return { sourceId: source.sourceId, valid: false, error: error.message }; }
  });
}

module.exports = { SOURCE_REGISTRY, sourceRegistry, validateRegistry };

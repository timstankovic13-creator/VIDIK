'use strict';

const { validateSourceDescriptor, rankSources, DATA_DOMAINS } = require('./data-acquisition');

/** Governed discovery catalogue: entry points, not evidence claims. */
const SOURCE_REGISTRY = Object.freeze([
  {
    sourceId: 'ca-open-government', provider: 'Government of Canada Open Government Portal', jurisdiction: 'CA',
    domain: 'local-baseline', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
    url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=',
    license: 'Open Government Licence - Canada', updateFrequency: 'varies', discoveryTags: ['municipal','provincial','federal','health','safety','transport','housing','environment','crime','public-safety']
  },
  {
    sourceId: 'ca-program-discovery', provider: 'Government of Canada Open Government Portal', jurisdiction: 'CA',
    domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
    url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=',
    license: 'Open Government Licence - Canada', updateFrequency: 'varies', discoveryTags: ['municipal','provincial','federal','programs','services','health','safety','transport','housing','environment','crime','public-safety','employment','education','business']
  },
  {
    sourceId: 'ca-ontario-program-discovery', provider: 'Ontario Data Catalogue', jurisdiction: 'CA',
    domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
    url: 'https://data.ontario.ca/api/3/action/package_search?q=',
    license: 'Open Government Licence - Ontario', updateFrequency: 'varies', discoveryTags: ['ontario','municipal','provincial','programs','services','health','safety','transport','housing','environment','employment','education','business']
  },
  {
    sourceId: 'us-open-data-program-discovery', provider: 'Data.gov', jurisdiction: 'US',
    domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'catalog-api',
    url: 'https://catalog.data.gov/api/3/action/package_search?q=',
    discoveryTags: ['municipal','programs','services','health','safety','transport','housing','environment','crime','public-safety','employment','education','business']
  },
  {
    sourceId: 'uk-open-data-program-discovery', provider: 'UK Government Data Service', jurisdiction: 'UK',
    domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
    url: 'https://ckan.publishing.service.gov.uk/api/3/action/package_search?q=',
    discoveryTags: ['municipal','local-government','programs','services','health','safety','transport','housing','environment','crime','employment','education','business']
  },
  {
    sourceId: 'au-open-data-program-discovery', provider: 'Australian Government Data Catalogue', jurisdiction: 'AU',
    domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
    url: 'https://data.gov.au/data/api/3/action/package_search?q=',
    discoveryTags: ['municipal','state','programs','services','health','safety','transport','housing','environment','crime','employment','education','business']
  },
  {
    sourceId: 'ca-procurement-program-discovery', provider: 'Government of Canada Open Government Portal', jurisdiction: 'CA',
    domain: 'cost-resource', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
    url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=',
    license: 'Open Government Licence - Canada', updateFrequency: 'varies', discoveryTags: ['procurement','programs','services','cost','budget','municipal','health','safety','transport','housing','environment','employment','education','business']
  },
  {
    sourceId: 'oecd-local-data', provider: 'OECD Local Data Portal', jurisdiction: 'international',
    domain: 'population-equity', tier: 'official_structured', accessMethod: 'sdmx-api',
    url: 'https://sdmx.oecd.org/public/rest/data/OECD.CFE.EDS/',
    discoveryTags: ['municipal','demography','housing','services','transport','environment','economy','labour','finance','crime','public-safety']
  },
  {
    sourceId: 'world-bank-indicators', provider: 'World Bank', jurisdiction: 'international',
    domain: 'comparator-innovation', tier: 'official_structured', accessMethod: 'indicators-api',
    url: 'https://api.worldbank.org/v2/indicator',
    discoveryTags: ['development','poverty','health','economy','education','environment','subnational','crime','public-safety']
  },
  {
    sourceId: 'openalex-works', provider: 'OpenAlex', jurisdiction: 'international',
    domain: 'causal-evidence', tier: 'independent_causal_research', accessMethod: 'works-api',
    url: 'https://api.openalex.org/works?search=',
    discoveryTags: ['research','interventions','causal','systematic-review','implementation','crime','public-safety','violence','health','housing','environment','employment','education','business']
  },
  {
    sourceId: 'campbell-evidence', provider: 'Campbell Collaboration', jurisdiction: 'international',
    domain: 'causal-evidence', tier: 'independent_causal_research', accessMethod: 'review-index',
    url: 'https://www.campbellcollaboration.org/reviews/',
    discoveryTags: ['crime','justice','social-welfare','education','climate','disability','business','violence','health','housing','employment']
  },
  {
    sourceId: 'campbell-crime-justice', provider: 'Campbell Collaboration Crime and Justice', jurisdiction: 'international',
    domain: 'causal-evidence', tier: 'independent_causal_research', accessMethod: 'review-index',
    url: 'https://www.campbellcollaboration.org/crime/reviews/',
    discoveryTags: ['violent-crime','crime','policing','hot-spots','focused-deterrence','violence','public-safety']
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

const assert = require('assert');
const fs = require('fs');

const catalog = fs.readFileSync('data/RC3_PUBLIC_DATA_SOURCE_CATALOG.md', 'utf8');
for (const required of [
  'Automated_Speed_Enforcement_Camera_Speed_Data1',
  'Automated_Speed_Enforcement_Camera_Removal_–_Monitoring_Speed_Data',
  'Automated_Speed_Enforcement_Camera_Violations_2025',
  'Red_Light_Camera_Violations_2025',
  'Traffic_Collisions_by_Location_2017-2024_(excluding_2023)',
  'Transportation_Intersection_Volumes_2024',
  '2023-12-06'
]) assert.ok(catalog.includes(required), `missing catalog source: ${required}`);

console.log('RC3 Ottawa public-data source catalog: PASS');

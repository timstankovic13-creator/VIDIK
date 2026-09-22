# VIDIK No-Blind-CI Rule

A GitHub Actions run is permitted only when:

- the exact commit under test is known;
- the local failure/root cause is understood or the run is the first authoritative release-gate execution;
- the run has a named release-gate purpose;
- the expected evidence from the run is defined in advance.

A failed run must be inspected at the exact SHA before any rerun. This rule protects limited Actions capacity and prevents CI from becoming a debugging loop.

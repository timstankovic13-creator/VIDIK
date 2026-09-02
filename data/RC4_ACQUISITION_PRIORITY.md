# RC4 Evidence Acquisition Priority Map

**Status:** NO REQUESTS AUTHORIZED

This map sequences future work without authorizing a data request. The frozen acquisition specification remains the source of truth.

## 1. ASE + Red-light cameras (009 + 010)

**Why first:** These cases share several evidence dependencies: traffic exposure, collision severity/site linkage, and concurrent-intervention history. One carefully scoped municipal data package may therefore resolve material gaps for two experiments without broad collection.

**Must resolve before request:**
- exact treatment/exposure history;
- exact traffic denominator required by the preregistered design;
- collision linkage/severity fields;
- concurrent intervention history;
- comparison-period/site structure.

**Do not request yet:** any field that does not map to one of those frozen requirements.

## 2. Shelter capacity (014)

**Why second:** The causal bottleneck is unusually explicit: isolate marginal bed-night exposure and pair it with a defensible comparison or capacity shock. If that design cannot be reconstructed, more descriptive shelter data will not solve the problem.

**Must resolve before request:**
- how marginal capacity will be identified;
- how bed-night exposure will be attributed;
- which comparison/capacity-shock design is actually available;
- outcome follow-up and concurrent eligibility/program changes.

## 3. ANCHOR (006)

**Why third:** The experiment requires call-level operational linkage rather than program aggregates. The request must therefore be privacy-preserving and design-specific from the outset.

**Must resolve before request:**
- exact eligible-call definition;
- assignment/response exposure reconstruction;
- police/downstream outcome linkage;
- repeat-call linkage;
- defensible comparison mechanism;
- minimum retention/granularity needed for the preregistered outcomes.

## Global stop rule

No municipal request should be sent until the proposed request passes the RC4 request gate: every field is part of a frozen minimum causal package, every field has a named gate/claim, and the package contains no merely interesting extras.

Even a complete package does **not** guarantee an effect estimate. After acquisition, the evidence must still pass temporal admissibility, exposure, causal design/comparator, measurement, and experiment-contract gates. Failure at any gate remains `NO_RECOMMENDATION`.

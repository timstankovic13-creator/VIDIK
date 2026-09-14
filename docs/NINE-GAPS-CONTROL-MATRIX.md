# Nine-gap control matrix

| Gap | Production control | Adversarial test |
|---|---|---|
| Evidence quality | Trusted status required | caller-quality spoof rejected |
| Duplicate evidence | Unique evidence IDs required | duplicate IDs rejected |
| Freshness | Stale retrieval metadata blocks admissibility | stale evidence rejected |
| Missing evidence | Referenced evidence must resolve | missing evidence rejected |
| Unit/currency | Resource and model units must match | CAD/USD mismatch rejected |
| Human override | Authorization + actor + reason + immutable hash | unauthorized/malformed override rejected |
| Partial outage | Explicit PARTIAL state; available results preserved | one failed source does not erase available results |
| Transferability | Multi-dimensional similarity; lead-only | no causal effect import |
| Wrong jurisdiction | Evidence jurisdiction checked independently | foreign evidence rejected |

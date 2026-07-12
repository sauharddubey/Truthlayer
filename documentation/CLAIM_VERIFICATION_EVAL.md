# Claim Verification Evaluation Loop

This document defines the dataset shape, checkpoints, and regression guardrails
for claim verification quality improvements.

## Objective

- Maximize precision of decisive verdicts (`supported`, `contradicted`).
- Keep strict evidence policy (weak/noisy evidence should stay `unverified`).
- Reduce `unverified` rate for typical public videos toward `< 40%`.

## Dataset Design

Build a representative set of `30-50` videos with mixed topics:

- health/medical claims
- finance/investing claims
- sports and entertainment claims
- product/comparative claims
- politics/news claims

For each video, annotate:

- expected claim list (atomic, checkable statements)
- expected verdict per claim
- whether claim should remain `unverified`
- minimum citation quality needed for decisive verdicts

### Suggested JSONL format

```json
{"video_id":"...", "claim_text":"...", "expected_verdict":"unverified", "strict_reason":"low_alignment", "domain":"sports"}
```

## Metrics

Track these per run and compare to previous baseline:

- `precision_decisive`: precision over (`supported`, `contradicted`)
- `unverified_rate`: share of `unverified` over all claims
- `claim_coverage`: extracted claims / expected claims
- `avg_evidence_quality`: mean claim evidence quality score (0-100)
- `citation_completeness`: share of decisive claims with source + excerpt (+ url when available)

## Checkpoints

### Checkpoint A (after retrieval baseline)

- retrieval diagnostics populated per claim
- lower noisy snippet ratio
- higher mean relevance score

### Checkpoint B (after alignment hardening)

- fewer decisive claims without aligned evidence
- higher citation completeness
- improved decisive precision

### Checkpoint C (after calibration)

- decisive precision improves while strict policy remains intact
- `unverified_rate` trends toward `< 40%` on representative set

## Regression Guardrails

Treat the change as regression if any of these occur:

- `precision_decisive` decreases by `>= 5` absolute points
- decisive verdict without evidence contract compliance appears
- `unverified_rate` drops but decisive precision drops (unsafe recall gain)
- evidence quality and relevance both degrade over two consecutive runs

When guardrail fails:

1. Revert threshold changes first.
2. Keep retrieval and diagnostics improvements.
3. Re-run checkpoint metrics before further recall tuning.

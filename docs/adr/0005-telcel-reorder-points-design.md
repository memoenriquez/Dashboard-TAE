# Telcel reorder points use aggregate consumption scenarios

The Telcel reorder page calculates an internal-admin reorder strategy from aggregate successful client consumption, not from each client's displayed balance. The internal ledger is separate from the dashboard, so the operator enters the current ledger balance and preferred maximum exposure manually.

The calculation uses the history window to estimate current burn rate, not as a total amount expected to happen again today. It uses p95 successful sales over calendar days, with zero-demand days included. Hourly and day-of-week views are normalized averages over the selected history window, not raw 90-day totals. It generates ranked scenarios such as daily, 2x daily, dynamic 3x/4x daily when the preferred cap creates pressure, and dynamic every-N-days strategies up to the preferred cap. Dynamic every-N-days strategies are filtered using the rounded target balance, so rounding cannot sneak a scenario above the preferred cap. Ranking prefers cap-compliant, low-risk scenarios with the longest coverage first, so the dashboard does not recommend unnecessary frequent top-ups when the preferred cap can safely support a longer cycle. The UI presents one operator-first recommendation before diagnostics: add now, target balance, runway estimate, next check, then a curated strategy comparison. The comparison shows the recommendation plus nearby useful alternatives and collapses the rest to avoid overwhelming operators when many dynamic strategies fit.

Weekend coverage is handled separately because there are no weekend or emergency top-ups. Weekend carry affects the immediate target only when the operating date is Friday, Saturday, or Sunday. Monday-Thursday recommendations use the normal scenario target while still showing the upcoming weekend target as context. If Friday-to-Monday carry exceeds the preferred max ledger balance, the recommendation is to increase the cap for that coverage window rather than assume an unavailable weekend top-up.

We chose p95 instead of mean because mean underestimates common spikes, and instead of max because max can overfit one unusual day. We avoid automatic fraud/spike exclusion until there is labeled incident data or a clear business rule.

## Consequences

- The dashboard does not claim to know real internal ledger balance; it uses operator input.
- The max ledger balance is a preferred target, not a hard validity constraint.
- Cap-exceeding scenarios remain visible with warnings.
- Weekend carry can force a higher cap even when weekday top-up frequency is increased.
- The feature depends on normalized transaction timestamp, amount, external client id, and visible client name already available from the TAE transaction API.

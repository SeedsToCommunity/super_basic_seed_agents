# Tier 3 Prompt Guidance

## Role and Scope

- You are responding **without access to Tier 1 or Tier 2 outputs**. No trusted source text, summaries, or interpretations are provided to you.
- Your task is to **independently report what you, as a language model, know about the topic**, based solely on your internal training and general biological knowledge.
- Do **not** attempt to infer what prior tiers may have said or omitted.
- Do **not** attempt to “complete” or “fix” earlier answers.
- Respond as if this is the **only tier being generated**.

This tier exists to **reveal model knowledge and its limits**, not to produce a final or authoritative answer.

## Tier 3 — Model Knowledge and Pattern Interpretation

### Allowed knowledge

- General biological knowledge learned during model training
- Pattern recognition across species, genera, families, and life-history strategies
- Common ecological, restoration, and propagation heuristics
- Broad, widely observed tendencies in plant biology

### Explicitly allowed scopes of generalization

- Species-level patterns (when stable)
- Genus-level patterns
- Family-level patterns
- Life-history and ecological strategy patterns (e.g., wetland vs upland, dispersal syndromes)
- General restoration or seed-handling practices

### Forbidden

- Referencing or implying the existence of specific trusted sources
- Presenting model knowledge as if it were sourced or documented
- Inferring what earlier tiers “must have said”
- Treating missing specificity as an error that must be filled

## Value Field Rules

- Provide a **value** only when the model has a **recognizable, explainable pattern** relevant to the column.
- It is valid and meaningful for the value to be an **empty string** if:
  - the model does not have a stable generalization
  - patterns vary widely across taxa or contexts
  - knowledge is fragmented or inconsistent

## Value Framing Rules (Critical)

Each knowledge claim in the value must be **explicitly prefixed** with the level from which the pattern is derived. This ensures the value and attribution are consistent.

### Required Prefixes

Use one of these prefixes before each distinct knowledge claim:

- `Based on species patterns:` — when you have stable, species-specific knowledge
- `Based on genus patterns:` — when extrapolating from the genus
- `Based on family patterns:` — when extrapolating from the family (e.g., Asteraceae)
- `Based on life-history patterns:` — when using ecological strategy (e.g., wetland obligate, wind-dispersed)
- `Based on general practice:` — when using common restoration or seed-handling heuristics

### Multi-Level Responses

When knowledge genuinely comes from **multiple levels**, include multiple prefixed segments. This honestly represents the layered nature of model knowledge.

**Single-level example:**
```
Based on genus patterns: Seeds disperse via wind-carried pappus in late fall. Light typically required for germination. Cold-moist stratification improves germination rates.
```

**Multi-level example:**
```
Based on family patterns: Seeds are small and wind-dispersed with pappus structures typical of Asteraceae. Based on genus patterns: Pappus is white and persistent, remaining attached through winter. Based on general practice: Cold stratification for 60-90 days typically improves germination uniformity.
```

### Consistency Rule

Do **not** write the value as if species-specific knowledge exists when you are extrapolating from broader patterns. The prefix must honestly reflect the source level of each claim.

**Wrong:** "Anaphalis margaritacea seeds disperse in late fall..."
**Right:** "Based on genus patterns: Seeds disperse in late fall..."

## Numeric estimates and ranges

- Numeric values, ranges, or concrete examples **may be included**
- Only include them when they reflect **broad, well-established patterns**
- When numbers are used, they must be framed as:
  - approximate
  - typical
  - pattern-based (not species-specific unless clearly so)

## Uncertainty handling

- When knowledge is weak or variable, state that explicitly.
- Variability is a valid outcome, not a failure.

## Model Knowledge Framing Requirements

This tier is expected to surface:
- where patterns are strong
- where they break down
- where the model lacks clarity
- **at which level(s) the knowledge exists** (via explicit prefixes in the value)

## Attribution Rules

- Attribution describes **model knowledge only**.
- Do not reference external sources or prior tiers.
- Attribution should **summarize which levels were used** in the value.
- Use the same parenthetical format as other tiers.

Examples for single-level responses:

- Model knowledge (family-level pattern)
- Model knowledge (genus-level pattern)
- Model knowledge (general restoration heuristic)

Examples for multi-level responses:

- Model knowledge (family and genus patterns)
- Model knowledge (genus patterns + general practice)
- Model knowledge (species, genus, and family patterns)

Examples for uncertain or variable knowledge:

- Model knowledge (variable across species)
- Model knowledge (weak or inconsistent patterns)
- Model knowledge (limited genus-level inference)

Maximum one sentence in attribution. The attribution should reflect all levels that appear in the value.

## Output Expectations

- The **value** reflects only what the model independently knows.
- The **attribution** is always present and describes the nature of that knowledge.
- An empty value is a valid and informative result.
- This tier does **not** complete the response; it exposes model understanding.

## Intent Reminder (non-user-facing)

This tier is a **diagnostic instrument**.
Its purpose is to help humans understand:

- what the model knows
- how confidently it knows it
- where its knowledge generalizes
- where it does not

Accuracy, transparency, and epistemic honesty take precedence over completeness.
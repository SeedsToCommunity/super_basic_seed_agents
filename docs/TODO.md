# TODO — Known Issues and Future Improvements

## Processing Guidance: Training Bias Override

**Status:** Open  
**Priority:** Medium  
**Good conference example:** Yes — illustrates hidden LLM training biases

### The Problem

The LLM's default behavior assumes commercial seed processing standards, even though these standards are unnecessary for Seeds to Community's use case.

**What the model assumes (from training data):**
- Seeds should be thoroughly cleaned and separated from chaff/pappus
- "Careful separation" of fluffy material is standard practice
- More processing effort = better outcomes

**What's actually true for this project:**
- Pappus/fluff does NOT need removal — doesn't affect germination
- Only remove sharp/bulky debris (sticks, stems) that could puncture storage bags
- For home processing, even debris removal is optional
- "Good enough for direct sowing" is the standard, not commercial-grade cleaning

### Example Output Showing the Bias

Field Pussy Toes (*Antennaria plantaginifolia*):

> **Processing Difficulty:** "Moderate. Seeds are tiny and require careful separation from fluffy pappus (seed tuft) material..."

> **Processing Time/Labor:** "Minimal - tiny seeds separate easily from dried flower heads"

The model describes pappus separation as if it's required, when it's completely unnecessary.

### Why This Is Hard to Fix

| Approach | Problem |
|----------|---------|
| Prescriptive rule ("Never remove fluff") | Wrong for some species (milkweed coma SHOULD be removed) |
| General framing ("Use judgment") | Model reverts to training bias |
| Species-specific config | Requires botanical expertise users don't have |
| Longer base prompt | Already at complexity limits |

### The Deeper Issue

This is an example of **opaque training bias** — the model learned default behaviors from professional/commercial sources that don't match the actual requirements for success. These biases are invisible until you work with a model in a specific domain and discover them through trial and error.

The parallel to human behavior: Workshop participants instinctively reach for screens and sieves to separate seeds from fluff, doing unnecessary work because they assume "more effort = better results."

### Proposed Solution

Add a brief "processing philosophy" statement to the base prompt (~3-5 lines):

> "Default assumption: Minimal processing is sufficient. Fluffy material, chaff, and fine debris generally do NOT need removal for successful germination or short-term storage. Only describe separation/cleaning as necessary when trusted sources explicitly state it is critical for this specific species. Remove only sharp or bulky debris (stems, sticks, flower heads) that could puncture storage bags."

This sets the default to "leave it alone" while allowing trusted sources to override for specific species.

### Conference Value

This example clearly illustrates:
1. LLMs have hidden biases from training data
2. Professional standards in training data ≠ what's actually necessary
3. Prompt engineering requires discovering these biases through use
4. Fixing biases involves tradeoffs (prescriptive vs. flexible, simple vs. complex)
5. The same challenge exists when training human participants

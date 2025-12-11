# Similar Species and Distinguishing Features Extraction

SPECIES: {{species_name}}

## DATA INPUTS

{{data_inputs}}

## TASK

Extract Similar Species and Distinguishing Feature information. For each similar species commonly confused with {{species_name}}, provide:
- The similar species name (botanical name preferred, with common name if known)
- One paragraph describing the distinguishing features that differentiate {{species_name}} from that similar species
- Focus on practical field identification characteristics (leaf shape, flower color, bloom time, habitat preferences, geographic range, etc.)

## CRITICAL INSTRUCTIONS

### TIER 1 - SOURCE-BACKED DATA ONLY
- Use ONLY information explicitly stated in the provided sources
- For each similar species, cite which source(s) mentioned it
- If sources conflict, report both viewpoints
- If data is missing or unclear, mark as "NO DATA"
- Assess confidence: HIGH (explicit/detailed), MEDIUM (mentioned but vague), LOW (implied/unclear)

### TIER 2 - LLM INFERRED DATA (gap-filling)
- For any gaps or additional commonly confused species not mentioned in sources, apply species/genus/family-level knowledge
- Clearly state inference basis: "Typical confusion within Genus" or "Known lookalike in region"
- Confidence for inferred data: MEDIUM or LOW only (never HIGH)
- List which specific gaps you filled

### KNOWN UNKNOWNS
- List questions about similar species you cannot answer even with inference
- Example: "No information on whether this species co-occurs with [X] in the field"

## OUTPUT FORMAT (JSON)

Return valid JSON only, no markdown code blocks:

{
  "species": "{{species_name}}",
  "topic": "similar_species",
  
  "similar_species": [
    {
      "name": "Similar species botanical name",
      "common_name": "Common name if known or null",
      
      "tier1_source_backed": {
        "distinguishing_features": {
          "value": "Paragraph describing how to distinguish from the target species based on source data",
          "source": "source filename or 'multiple sources'",
          "confidence": "high/medium/low",
          "notes": "any conflicts or additional context"
        }
      },
      
      "tier2_inferred": {
        "additional_distinctions": {
          "value": "Additional distinguishing information from LLM knowledge if sources lacked detail",
          "inference_basis": "explain reasoning - genus patterns, regional knowledge, etc.",
          "confidence": "medium/low",
          "notes": "why this inference is reasonable"
        }
      }
    }
  ],
  
  "known_unknowns": [
    "List of unanswered questions about similar species identification"
  ],
  
  "source_summary": {
    "sources_used": ["list of source files/pages that mentioned similar species"],
    "sources_with_no_data": ["list of sources that had no similar species info"]
  }
}

## IMPORTANT NOTES

- Focus on species that are genuinely confusing in the field, not just taxonomically related
- Prioritize distinguishing features visible without specialized equipment
- Include seasonal or growth-stage differences when relevant
- If no similar species are mentioned in sources, use Tier 2 to provide common lookalikes but clearly mark as inferred

Remember: Never blend training knowledge into Tier 1. Keep source-backed and inferred data strictly separated.

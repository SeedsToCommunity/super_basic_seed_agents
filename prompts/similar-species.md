# Similar Species and Distinguishing Features Extraction

SPECIES: {{species_name}}

## DATA INPUTS

{{data_inputs}}

## TASK

Extract Similar Species and Distinguishing Feature information. For each similar species commonly confused with {{species_name}}, provide:
- The similar species name (botanical name preferred, with common name if known)
- One short paragraph describing the distinguishing features that differentiate {{species_name}} from that similar species
- Focus on practical field identification characteristics (leaf shape, flower color, bloom time, habitat preferences, geographic range, etc.)
- Speak in common language, with no botanical terms. Assume the reader will not have no botanical training. Assume that pictures of the focus species are readily available. No words like glandular. Exclude design, layout, and pairing information. 
- Response should be geared towards a user in SE Michigan. 
- Shorter descriptions are better. 

## CRITICAL INSTRUCTIONS

### TIER 1 - SOURCE-BACKED DATA (required when sources mention the species)
- Use ONLY information explicitly stated in the provided sources
- For each similar species, cite which source(s) mentioned it
- If sources conflict, report both viewpoints
- If data is missing or unclear, mark as "NO DATA"
- Assess confidence: HIGH (explicit/detailed), MEDIUM (mentioned but vague), LOW (implied/unclear)

### TIER 2 - LLM INFERRED DATA (optional - include only when necessary)
- **OMIT tier2_inferred entirely** if Tier 1 provides comprehensive distinguishing features
- **INCLUDE tier2_inferred** only when:
  - Tier 1 data has significant gaps that your knowledge can fill
  - You know of a commonly confused species NOT mentioned in sources (in this case, include ONLY tier2_inferred, omit tier1_source_backed)
- Clearly state inference basis: "Typical confusion within Genus" or "Known lookalike in region"
- Confidence for inferred data: MEDIUM or LOW only (never HIGH)

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
      
      "tier1_source_backed": {  // INCLUDE if species was mentioned in sources
        "distinguishing_features": {
          "value": "Paragraph describing how to distinguish from the target species based on source data",
          "source": "source filename or 'multiple sources'",
          "confidence": "high/medium/low",
          "notes": "any conflicts or additional context"
        }
      },
      
      "tier2_inferred": {  // OPTIONAL - omit if Tier 1 is comprehensive; include alone for species not in sources
        "additional_distinctions": {
          "value": "Additional distinguishing information from LLM knowledge",
          "inference_basis": "explain reasoning - genus patterns, regional knowledge, etc.",
          "confidence": "medium/low",
          "notes": "why this inference is reasonable"
        }
      }
    },
    
    {
      "name": "Example: Tier 2-only species (not mentioned in sources but commonly confused)",
      "common_name": "Common name",
      "tier2_inferred": {
        "additional_distinctions": {
          "value": "Distinguishing features based on LLM knowledge only",
          "inference_basis": "Known lookalike in SE Michigan region",
          "confidence": "medium",
          "notes": "Not mentioned in provided sources but frequently confused in the field"
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
- **Tier 2 is optional per species**: If Tier 1 fully describes the distinguishing features, omit Tier 2 entirely for that species
- **Add species not in sources**: If you know of a commonly confused species the sources didn't mention, add it with ONLY tier2_inferred (no tier1_source_backed)
- If no similar species are mentioned in sources at all, use Tier 2 to provide common lookalikes

Remember: Never blend training knowledge into Tier 1. Keep source-backed and inferred data strictly separated.

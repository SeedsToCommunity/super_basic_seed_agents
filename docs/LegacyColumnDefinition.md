CAPTURE STATE OF SEED DATA COLUMNS — FULL EXPORT

Goal
Produce a complete, carry-forward export of the work defining spreadsheet columns (“data elements”) for ~200 native SE Michigan species (Seeds to Community). This must be sufficient for me to paste into a brand-new chat and continue seamlessly. If a prior export appears below between >>>BEGIN PRIOR EXPORT and >>>END PRIOR EXPORT, produce both (1) a delta since that prior export and (2) the full refreshed export.

Strict requirements
- Do NOT invent new rules or content. Summarize only what exists in this chat/project; where gaps exist, list them under “Open Questions / Gaps”.
- Clearly label each column as LOCKED, DRAFT, or PENDING.
- Keep structure exactly as specified below. Use concise, precise language (novice-friendly where noted). No filler.
- Timestamp with America/Detroit local date/time.
- Include both human-readable narrative and a machine-readable spec.
- Where you reference a prior decision, include a one-line rationale (“because …”) or “rationale unknown”.
- When multiple variants existed historically, note conflicts and the current canonical resolution.

Output order (exactly this order)

0) Header
- Title: State of Seed Columns — Seeds to Community
- Timestamp (America/Detroit):
- Scope: spreadsheet column definitions for ~200 native species (SE Michigan); agent-executable outputs
- Source chat(s): this conversation
- Version tag: YYYYMMDD-hhmm-DET

1) Purpose & Use Cases (why this exists)
- Primary uses (agent execution across ~200 species; volunteer-facing guides; internal QA)
- Target environments (Google Sheets and downstream text generation)
- Expected outputs from each column (one-line per column: what it drives)

2) Audience & Constraints
- Intended users/skills: novice volunteers, community participants; coordinators; internal editors
- Non-goals / out-of-scope behaviors
- Global writing constraints required across all species entries:
  • Paragraph style, novice-friendly tone
  • Emphasis on field ID (not just harvest timing), harvest timing, drying, short-term refrigerator storage
  • Include Seeds to Community best practices + labeling reminders
  • Use Michigan/Southeast Michigan framing
  • Consistent terminology and units

3) Canonical Style & Series Context
- Series intent for Seeds to Community
- Locked reference formats: 
  • Asteraceae guide (locked) — paragraph format & topics
  • Apocynaceae guide (locked) — exact guidance on pods, processing-before-fluff, storage, “Seeds to Community” closing
- Cross-reference: what from these guides is REQUIRED to carry into all species columns

4) Column Inventory & Status
For EACH defined or proposed column, enumerate in this exact sub-structure:
- Column Name:
- Status: LOCKED | DRAFT | PENDING
- Purpose (what problem it solves; who uses it)
- Data Type: (short text / multi-paragraph / enum / boolean / date-window / numeric / list / URL / image ref)
- Format Rules (length caps, bullet vs paragraph, units, vocab to include/avoid)
- Content Rules (what MUST be present; what MUST NOT be present)
- Examples (one or two good examples already produced; if none, say “none yet”)
- Validation/QA Checks (deterministic checks the agent/editor can run)
- Dependencies (columns this one relies on or feeds)
- Notes (rationale, conflicts resolved, open issues)

5) Current Column Set (flat list)
- Quick bullet list of all columns by status:
  • LOCKED: …
  • DRAFT: …
  • PENDING: …
(Ensure this list matches the detailed entries above.)

6) Decision Log (abridged)
- Chronological bullets of major decisions (most recent first): decision → rationale → affected columns

7) Known Conflicts & Resolutions
- Prior contradictions and the chosen canonical rule
- Still-unresolved contradictions (mark as OPEN)

8) Open Questions / Gaps (actionable)
- Enumerated list of specific questions that MUST be answered to complete DRAFT/PENDING columns
- For each, propose 1–2 concrete resolution options to choose from (no new research; options must reflect patterns already used here)

9) Consistency & QA Policy (series-wide)
- Required checks across ALL species rows before publish
- Style lint (forbiddens / required phrases)
- Accessibility/novice-readability considerations

10) Species-Level Templates & Snippets
- Provide minimal “fill-this-in” micro-templates the agent will use for the most text-heavy columns (one template per such column), aligned with locked guide style.
- Include one representative filled example drawn from existing work (no invention; if not available, state “no vetted example yet”).

11) Machine-Readable Spec (authoritative; keep it tidy)
YAML block with:
- metadata:
    version: "YYYYMMDD-hhmm-DET"
    region: "SE Michigan"
    audience: ["novice volunteers","coordinators","editors","agent"]
    locked_guides: ["Asteraceae (locked)","Apocynaceae (locked)"]
- columns: 
    - name: "<Column Name>"
      status: LOCKED|DRAFT|PENDING
      type: short_text|paragraph|enum|boolean|date_window|number|list|url|image_ref
      required: true|false
      format_rules: ["..."]
      content_rules: ["..."]
      enum_values: ["..."]   # if type=enum
      min_len: <int>         # if applicable
      max_len: <int>         # if applicable
      qa_checks: ["..."]
      depends_on: ["<other columns>"]
      examples:
        - good: "…"
        - alt: "…"
- series_policy:
    style: {paragraph: true, novice_friendly: true, MI_context: true}
    seeds_to_community_practices: ["labeling reminders","processing timing","short-term fridge storage"]
    forbidden: ["jargon X","Latin abbreviations without full binomial first mention", "..."]

12) Delta Since Prior Export (only if a prior export is provided below)
- New/changed decisions
- Column status changes
- Added/removed columns
- Newly identified conflicts/gaps

13) Minimal Carry-Forward Summary (≤300 words)
- For pasting at the start of a fresh chat to rehydrate context quickly: purpose, audience, locked guides, column statuses (counts), top 5 open decisions, link to YAML section above.

END OF SPEC

(if present) >>>BEGIN PRIOR EXPORT
[paste any previous export here when re-running]
>>>END PRIOR EXPORT

0) Header
Title: State of Seed Columns — Seeds to Community


Timestamp (America/Detroit): Sun, Sep 07, 2025, 10:30 PM


Scope: spreadsheet column definitions for ~200 native species (SE Michigan); agent-executable outputs


Source chat(s): this conversation


Version tag: 20250907-2230-DET



1) Purpose & Use Cases (why this exists)
Primary uses: agent execution across ~200 species; volunteer-facing guides (pages/slides/docs); internal QA & discrepancy tracking.


Target environments: Google Sheets as source of truth; downstream text/PDF/web generation.


Expected outputs (one line per column):


Genus / Species epithet: assemble canonical binomial for all outputs.


Previously Known As: legacy binomials to aid cross-reference & search.


Commonly Used Common Names: vernacular labels for public materials.


Trusted External References: deterministic species links + Google Images results page for visual checks.


Collection ID Cautions: “what to look for” features on the target plant at collection time.


Similar Species / Distinguishing Features: look-alike list with how they differ from the target.


Readiness Collection Cues: observable, viability-explicit timing cues.


Collection Challenges: obstacles to harvesting usable quantities.


Collection Safety and Nuisance Notes: documented hazards and nuisances while collecting.


Seed Drop/Shatter Risk: qualitative risk (with optional quantitative note) of seed loss pre-collection.


Collection Quantity Notes: typical yields and variability.


Collection Habitat Notes: habitat context for ID (not a search guide).


Ease of Collection: at-a-glance effort rating.


Some Useful Collection Tools: practical tool list for the collection act.


Collection Container Guidance: container type to use in the field at collection time.


Seed Drying Needs: container-based post-collection drying method (no processing).


Seed Visibility at Maturity: visibility enum + plain description of where/how seeds appear.


Seed Color at Maturity: seed color cue.


What You Collect: unit taken (pods/heads/seeds/etc.).


Processing Difficulty / Time / Seed Cleaning Complexity / Hazards / Nuggets: practical post-collection processing guidance.


Safe Storage – Room Temp / Safe Storage – Dry Fridge / Mold Risk Notes / Other Storage Hazards: short-term storage guidance & risks (no stratification).


Germination Ecology / Stratification Requirements / Artificial Stratification Risks: ecological “why”, artificial fridge methods, and risks.


Seeds to Community Spreadsheet vs Reference: Discrepancies: explicit contradictions only.



2) Audience & Constraints
Intended users/skills: novice volunteers & community participants; coordinators; internal editors; agent.


Non-goals / out-of-scope: designing outdoor stratification; exhaustive botanical keys; non-SE-MI horticultural advice; literature reviews.


Global writing constraints: paragraph style; novice-friendly; emphasize field ID across life stages, harvest timing, drying, short-term dry-fridge storage where applicable; include Seeds to Community best practices & labeling reminders where relevant; Michigan/SE-MI framing; consistent terms/units; avoid jargon and vague comparatives unless anchored with absolutes.



3) Canonical Style & Series Context
Series intent: practical, community-usable entries that are agent-generatable and volunteer-readable.


Locked reference formats:

 • Asteraceae guide (locked): paragraph topics for heads/chaff/cleaning carry to analogous species.

 • Apocynaceae guide (locked): pods; “process before fluff” notes; storage cautions; standardized closing.


Cross-reference (required carry-over): use the locked guide patterns for paragraphing, topic order, and novice cues across analogous species; keep “no filler” tone.



4) Column Inventory & Status
Identification
Column Name: Genus


Status: LOCKED


Purpose: canonical genus for binomial; alignment across outputs.


Data Type: short text


Format Rules: capitalized; no abbreviations.


Content Rules: current accepted genus from trusted references.


Examples: Aquilegia


Validation/QA Checks: non-empty; matches trusted refs.


Dependencies: Trusted External References


Notes: split from prior “Botanical Name” to reduce ambiguity (because separate Genus/Species is clearer for QA).


Column Name: Species epithet


Status: LOCKED


Purpose: canonical epithet for binomial assembly.


Data Type: short text


Format Rules: lowercase; preserve hyphens/diacritics; no abbreviations; not “sp.”


Content Rules: accepted epithet.


Examples: canadensis


Validation/QA Checks: non-empty; forms valid binomial with Genus; matches trusted refs.


Dependencies: Genus; Trusted External References


Notes: mirrors Genus QA for consistency.


Column Name: Previously Known As


Status: LOCKED


Purpose: record legacy botanical binomials to aid search and reconciliation.


Data Type: list


Format Rules: comma-separated binomials only.


Content Rules: include all synonyms from Michigan Flora (primary), USDA PLANTS (fallback), Tropicos (secondary fallback/cross-check); exclude infraspecific ranks unless synonymized to full species.


Examples: Actaea alba, Actaea pachypoda


Validation/QA Checks: not equal to current Genus+Species; supported by at least one trusted source.


Dependencies: Genus; Species epithet; Trusted External References


Notes: botanical synonyms only (because vernaculars live elsewhere).


Column Name: Commonly Used Common Names


Status: LOCKED


Purpose: alternate vernaculars volunteers may encounter.


Data Type: list


Format Rules: comma-separated; Title Case.


Content Rules: widely used in SE-MI or adjacent regions; mixed sources allowed; no limit; duplicates across columns acceptable; exclude botanical synonyms.


Examples: “Red Columbine, Canadian Columbine”


Validation/QA Checks: entries are vernaculars only.


Dependencies: none


Notes: rationale — usability in public materials.


Column Name: Trusted External References


Status: LOCKED


Purpose: deterministic, clickable species sources and images results page.


Data Type: list (URL)


Format Rules: Fixed order; attempt all sites deeply; include only species pages:


Michigan Flora → 2) Go Botany → 3) Illinois Wildflowers → 4) Lady Bird Johnson (Wildflower.org) → 5) Prairie Moon → 6) USDA PLANTS → 7) Tropicos → 8) Minnesota Wildflowers → 9) Google Images results page (binomial).


Content Rules: include URL only if a species page exists; always append Google Images results page (not single images).


Examples: site species pages + Google Images results page.


Validation/QA Checks: order preserved; links resolve; name match; Google Images results present.


Dependencies: Genus; Species epithet


Notes: because users need reliable visuals; algorithm removes guesswork.


Collection
Column Name: Collection ID Cautions


Status: LOCKED


Purpose: what to look for on the target species at collection time (no look-alikes).


Data Type: paragraph


Format Rules: short paragraph; simple connectors; no semicolons; length scales with features.


Content Rules: target traits only; include seasonal variations; keep colors simple; explicitly state which traits = viable vs not yet viable when relevant.


Examples: “Look for nodding red-and-yellow flowers facing downward; pods turn brown and begin to split when seeds are firm and dark.”


Validation/QA Checks: observable traits present; viability clarity present when timing is discussed.


Dependencies: none


Notes: separated from look-alike logic (because clarity for novices).


Column Name: Similar Species / Distinguishing Features


Status: LOCKED


Purpose: list look-alikes and how they differ from the native target.


Data Type: paragraph (bulleted allowed)


Format Rules: group order = Native → Horticultural → Non-native → Invasive; within group by likelihood of confusion; 1–2 sentences per entry; each begins with a tag (e.g., “Native — …”).


Content Rules: observable, absolute traits; include infraspecific ranks only if commonly confused; include only taxa present/likely in Michigan; max 10 entries; habitat notes only when starkly different (e.g., obligate wetland vs dry prairie).


Examples: “Native — Trillium erectum: maroon petals, not white; flower sits above leaves.”


Validation/QA Checks: relative terms anchored to absolutes.


Dependencies: Trusted External References


Notes: distinct from Collection ID Cautions (because it addresses “others”).


Column Name: Readiness Collection Cues


Status: LOCKED


Purpose: observable cues for harvest timing with viability made explicit.


Data Type: paragraph


Format Rules: each sentence follows [Viability state] → [Observable traits] → [Qualified time frame (optional)]; qualifiers like “generally/typically/often” required when months are used.


Content Rules: include multi-stage maturity; allow overlap with “Seed Visibility”; state which stage = viable.


Examples: “When viable and ready to collect, pods turn brown and begin to split, and seeds are firm and dark, generally by late June through July.”


Validation/QA Checks: at least one viable-stage sentence; month references must be qualified.


Dependencies: none


Notes: because regional/yearly variation is high.


Column Name: Collection Challenges


Status: LOCKED


Purpose: note practical obstacles to obtaining usable seed.


Data Type: short text


Format Rules: one phrase or up to 1–2 sentences.


Content Rules: physical/field obstacles and/or ecological factors; duplication with safety allowed if clarifying.


Examples: “Pods shatter quickly”; “Tall, scattered seed heads.”


Validation/QA Checks: fact-based, observable.


Dependencies: none


Notes: separated from Safety (because different intent).


Column Name: Collection Safety and Nuisance Notes


Status: LOCKED


Purpose: documented hazards and nuisances while collecting.


Data Type: paragraph


Format Rules: short paragraph; expand as needed.


Content Rules: include toxicity, spines, irritants, allergens; include nuisances (sap/fluff); factual tone; duplication with Challenges allowed.


Examples: “Berries are poisonous if eaten. Sticky sap can irritate skin.”


Validation/QA Checks: evidence-based; separate hazards vs nuisances when both exist.


Dependencies: none


Notes: because volunteers need clear safety context.


Column Name: Seed Drop/Shatter Risk


Status: LOCKED


Purpose: how easily seeds are lost before collection.


Data Type: short text


Format Rules: one value: Low / Moderate / High; no timing notes here.


Content Rules: use plain language for drop/burst/scatter; may add quantitative note if documented (e.g., “>80% drop within one week”).


Examples: “High — pods burst and seeds scatter (shatter) quickly”; “Low — seeds stay on plant into winter.”


Validation/QA Checks: if “High,” Readiness Cues must mention frequent monitoring.


Dependencies: Readiness Collection Cues


Notes: plain terms first (because “shatter” is jargon).


Column Name: Collection Quantity Notes


Status: LOCKED


Purpose: expectations of how much seed is usuallc0:y collectable.


Data Type: short text


Format Rules: concise; 1–2 sentences.


Content Rules: typical yield per plant/stand; allow quantitative ranges when documented; may note year-to-year variability; do not describe patch density.


Examples: “Often hundreds of seeds per plant”; “Few viable seeds; production varies year to year.”


Validation/QA Checks: evidence-based.


Dependencies: none


Notes: scoped to yield, not where to find plants.


Column Name: Collection Habitat Notes


Status: LOCKED


Purpose: ID context via habitat association (not search guidance).


Data Type: paragraph


Format Rules: concise; one+ sentences as needed.


Content Rules: SE-MI habitat when available; otherwise Michigan/Great Lakes; include specific features (soil/light/moisture/canopy) when they help ID; frame as ID context only.


Examples: “Species of dry oak–hickory woods and edges, usually on sandy soils.”


Validation/QA Checks: MI/Great Lakes frame; not phrased as foraging/search advice.


Dependencies: none


Notes: avoids encouraging land-scouring (because ethics & practicality).


Column Name: Ease of Collection


Status: LOCKED


Purpose: at-a-glance effort rating.


Data Type: enum


Format Rules: values = Easy / Moderate / Difficult.


Content Rules: judge by time/effort to collect usable quantity; kept even if overlapping other fields.


Examples: “Easy”; “Difficult.”


Validation/QA Checks: value in enum.


Dependencies: none


Notes: 3-tier chosen for simplicity.


Column Name: Some Useful Collection Tools


Status: LOCKED


Purpose: basic tools that directly support cutting/detaching/containing seed.


Data Type: list


Format Rules: bulleted list; length as needed.


Content Rules: simple/common tools (paper bags, scissors, hand pruners, buckets, tarps, nets); exclude gloves/protective gear unless essential; specialty gear only if essential; maintain consistency across related species when appropriate.


Examples: • Paper bags • Hand pruners • Scissors • Bucket


Validation/QA Checks: avoid comfort/nuisance gear unless essential.


Dependencies: none


Notes: consistency expectation without prescribing mechanism.


Column Name: Collection Container Guidance


Status: LOCKED


Purpose: container type to use at collection time.


Data Type: paragraph


Format Rules: 1–2 sentences; concise.


Content Rules: name container type(s) only (paper bags, mesh bags, buckets, envelopes, jars); do not discuss storage, drying, or processing; may warn against unsuitable types (e.g., sealed plastic).


Examples: “Collect into paper bags”; “Use a bucket for large seed heads.”


Validation/QA Checks: clearly identifies appropriate container.


Dependencies: none


Notes: kept strictly to collection moment.


Column Name: Seed Drying Needs


Status: LOCKED


Purpose: container-based drying after collection, before storage (no processing).


Data Type: short text


Format Rules: 1–2 sentences; concise.


Content Rules: identify an appropriate container-based drying method (paper bags/envelopes/buckets); describe containment of fluff/seeds during drying; no “laying out” methods (trays/screens/tarps); do not instruct when/how to process.


Examples: “Dry pods in paper bags so floss and seeds stay contained.”


Validation/QA Checks: excludes exposed surface methods; no processing instructions.


Dependencies: none


Notes: optimized for household practicality and tidiness.


Column Name: Seed Visibility at Maturity


Status: LOCKED


Purpose: whether seeds can be seen and where/how they appear.


Data Type: paragraph


Format Rules: begin with Visible / Hidden / Partly visible; add 1–2 sentences in plain language.


Content Rules: avoid jargon; describe where the seeds are and how to tell them from other parts.


Examples: “Visible — small black seeds loose inside the open dried flower case.”


Validation/QA Checks: starts with enum; includes everyday description.


Dependencies: none


Notes: stands alone (no cross-check required).


Column Name: Seed Color at Maturity


Status: LOCKED


Purpose: color cue for mature seed.


Data Type: short text


Format Rules: short phrase allowed.


Content Rules: describe seed color only; free-text.


Examples: “Dark brown to black.”


Validation/QA Checks: concise; seed-only.


Dependencies: none


Notes: simple cue; avoids surrounding tissues.


Column Name: What You Collect


Status: LOCKED


Purpose: unit taken at collection time.


Data Type: short text


Format Rules: single short noun phrase only; may list multiple units separated by commas; no clarifiers.


Content Rules: pods/heads/capsules/seeds/clusters/etc.; no processing/storage language.


Examples: “Pods”; “Seed heads”; “Loose seeds.”


Validation/QA Checks: matches species’ reproductive structure.


Dependencies: none


Notes: kept terse for sheet usability.


Processing
Column Name: Processing Difficulty


Status: DRAFT


Purpose: overall difficulty of post-collection processing.


Data Type: enum


Format Rules: values = Easy / Moderate / Difficult (proposed).


Content Rules: reflect steps needed to get clean seed.


Examples: none yet


Validation/QA Checks: value in enum; consistent with Seed Cleaning Complexity.


Dependencies: Seed Cleaning Complexity


Notes: enum set mirrors “Ease of Collection” for symmetry.


Column Name: Processing Time / Labor


Status: DRAFT


Purpose: effort magnitude for processing.


Data Type: short text


Format Rules: “Minimal / Moderate / High” (selected vocabulary).


Content Rules: avoid pseudo-precision; no minutes unless documented.


Examples: none yet


Validation/QA Checks: matches narrative in Cleaning Complexity.


Dependencies: Seed Cleaning Complexity


Notes: chosen to avoid false precision.


Column Name: Seed Cleaning Complexity


Status: LOCKED


Purpose: concise note on chaff/mesh/steps.


Data Type: short text


Format Rules: brief; mention chaff/mesh/step.


Content Rules: core cleaning approach only.


Examples: “Screen 1/8″, then winnow light chaff.”


Validation/QA Checks: concise; actionable.


Dependencies: none


Notes: locked earlier for agent usability.


Column Name: Processing Hazards


Status: DRAFT


Purpose: mechanical/irritant/toxin hazards during processing.


Data Type: short text


Format Rules: concise; factual.


Content Rules: dust, spines, latex, toxins as documented.


Examples: none yet


Validation/QA Checks: evidence-based; non-alarmist.


Dependencies: none


Notes: distinct from Safety (collection phase).


Column Name: Processing Nuggets


Status: DRAFT


Purpose: 1–2 practical tricks/tips.


Data Type: short text


Format Rules: concise.


Content Rules: plain, high-leverage steps (no full protocol).


Examples: none yet


Validation/QA Checks: practical; species-specific if possible.


Dependencies: none


Notes: complements Cleaning Complexity.


Storage
Column Name: Safe Storage Method – Room Temp


Status: LOCKED


Purpose: short-term at home before donation/strat; no cold-moist talk.


Data Type: paragraph


Format Rules: short paragraph.


Content Rules: dry, labeled, pest-safe; no stratification.


Examples: none yet


Validation/QA Checks: storage ≠ stratification.


Dependencies: none


Notes: separation kept to prevent confusion.


Column Name: Safe Storage Method – Dry Fridge


Status: LOCKED


Purpose: dry-fridge storage guidance; no strat methods.


Data Type: paragraph


Format Rules: short paragraph.


Content Rules: dry container; desiccant if appropriate; no cold-moist.


Examples: none yet


Validation/QA Checks: avoids moist media.


Dependencies: none


Notes: explicit separation from stratification.


Column Name: Mold Risk Notes


Status: LOCKED


Purpose: note only if mold is a concern.


Data Type: short text


Format Rules: blank allowed.


Content Rules: fill only when risk exists.


Examples: none yet


Validation/QA Checks: empty allowed.


Dependencies: none


Notes: avoids noise.


Column Name: Other Storage Hazards / Warnings


Status: DRAFT


Purpose: non-mold hazards (e.g., static/fluff) phrased as characteristics.


Data Type: short text


Format Rules: concise; factual.


Content Rules: hazards/warnings without speculative mechanisms.


Examples: none yet


Validation/QA Checks: evidence-based.


Dependencies: none


Notes: complements Mold Risk Notes.


Stratification
Column Name: Germination Ecology / Real-World Behavior


Status: LOCKED


Purpose: plain-language seasonal signals & dormancy summary.


Data Type: paragraph


Format Rules: 3–6 sentences; plain language.


Content Rules: dispersal timing; signals (warm/cold/moist/light); dormancy mechanism(s); natural germination season; “missed cues → dormant but viable.”


Examples: vetted Geranium maculatum ecology paragraph (see series).


Validation/QA Checks: names at least one signal; separates viability vs dormancy.


Dependencies: Trusted External References


Notes: moved before methods (because “why” precedes “how”).


Column Name: Stratification Requirements


Status: LOCKED


Purpose: artificial fridge methods only.


Data Type: paragraph


Format Rules: start with codes (e.g., C(60), M); then plain language; list alternatives and conflicts; allowed moist media = sand/vermiculite/damp paper towel; do not mention outdoor stratification.


Content Rules: clearly label alternatives; state conflicts without resolving by fiat.


Examples: none yet


Validation/QA Checks: codes present; alternatives stated when conflicts exist.


Dependencies: Germination Ecology


Notes: storage kept separate.


Column Name: Artificial Stratification Risks


Status: LOCKED


Purpose: fridge-method pitfalls.


Data Type: paragraph (bullets allowed)


Format Rules: concise bullets allowed.


Content Rules: premature germination in fridge; mold/rot if overwet; reduced germination if cues skipped or over-extended (avoid “seed dead” unless documented).


Examples: none yet


Validation/QA Checks: documented risks only.


Dependencies: Stratification Requirements


Notes: phrasing kept neutral (“reduced/delayed”).


Meta
Column Name: Seeds to Community Spreadsheet vs Reference: Discrepancies


Status: LOCKED


Purpose: record contradictions between sheet and references.


Data Type: list


Format Rules: bullets; “Spreadsheet: …; References: …”.


Content Rules: contradictions only (codes/durations/methods/storage/ecology timing/status); no blanks/wording diffs.


Examples: none yet


Validation/QA Checks: populate only after all other columns.


Dependencies: all other columns


Notes: transparency for QA.



5) Current Column Set (flat list)
LOCKED: Genus; Species epithet; Previously Known As; Commonly Used Common Names; Trusted External References; Collection ID Cautions; Similar Species / Distinguishing Features; Readiness Collection Cues; Collection Challenges; Collection Safety and Nuisance Notes; Seed Drop/Shatter Risk; Collection Quantity Notes; Collection Habitat Notes; Ease of Collection; Some Useful Collection Tools; Collection Container Guidance; Seed Drying Needs; Seed Visibility at Maturity; Seed Color at Maturity; What You Collect; Seed Cleaning Complexity; Safe Storage – Room Temp; Safe Storage – Dry Fridge; Mold Risk Notes; Germination Ecology / Real-World Behavior; Stratification Requirements; Artificial Stratification Risks; Seeds to Community Spreadsheet vs Reference: Discrepancies.


DRAFT: Processing Difficulty; Processing Time / Labor; Processing Hazards; Processing Nuggets; Other Storage Hazards / Warnings.


PENDING: none.



6) Decision Log (abridged)
Split Genus/Species from single “Botanical Name” → clearer QA & dependency mapping → Genus; Species epithet.


Removed “Primary/Common Name” column → avoid redundancy; vernaculars live in “Commonly Used Common Names” → Commonly Used Common Names.


Trusted refs fixed order + attempt all → deterministic links; images = Google results page only → Trusted External References.


Collection ID Cautions = target features only → look-alikes moved out for clarity → Collection ID Cautions; Similar Species.


Similar Species grouped & limited → Native → Horticultural → Non-native → Invasive; max 10; MI-present only → Similar Species.


Readiness Cues sentence structure & month qualifiers → viability-first wording; “generally/typically/often” with months → Readiness Collection Cues.


Plain-language “shatter” rule → use drop/burst/scatter terms first → Seed Drop/Shatter Risk.


Habitat = ID context, not search guide → avoid encouraging foraging → Collection Habitat Notes.


Tools exclude comfort gear → focus on mechanical help; add “consistency when appropriate” without mechanism → Some Useful Collection Tools.


Container vs Drying vs Processing boundaries → clarified to prevent overlap → Collection Container Guidance; Seed Drying Needs.


Seed Visibility adds plain description → enum + everyday location/contrast → Seed Visibility at Maturity.



7) Known Conflicts & Resolutions
Botanical Name vs Genus+Species: split adopted; Resolution: separate columns are canonical.


Common Name field: removed in favor of “Commonly Used Common Names”; Resolution: vernaculars live only in that list.


Safety vs Challenges overlap: Resolution: duplication allowed when clarifying roles.


Storage vs Stratification content mixing: Resolution: storage (dry only) kept separate; stratification only in Stratification section.


OPEN: none currently flagged as unresolved contradictions.



8) Open Questions / Gaps (actionable)
Processing Difficulty (enum values):


Option A: Easy / Moderate / Difficult (mirrors “Ease of Collection”).


Option B: Very easy / Easy / Moderate / Difficult (adds granularity).


Processing Hazards scope:


Option A: hazards only (dust, prickles, toxins, latex).


Option B: hazards + strong nuisances that affect processing (e.g., static cling), labeled as nuisance.


Other Storage Hazards / Warnings phrasing:


Option A: strictly characteristics (“fluff builds static in dry air”).


Option B: allow brief precaution phrasing without mechanism (“avoid over-packing fluffy seed”).


Processing Time / Labor vocabulary:


Option A: Minimal / Moderate / High (selected earlier but not fully locked).


Option B: Minimal / Some / High (plainer).



9) Consistency & QA Policy (series-wide)
Required checks before publish: all LOCKED columns present and non-empty where required; trusted refs order preserved; Google Images results link appended; stratification codes parse; ecology text separates dormancy vs viability.


Style lint: forbid filler; avoid jargon; first mention uses full binomial when shown; SE-MI context.


Accessibility: short paragraphs; concrete cues; avoid expert shorthand; plain terms preferred over jargon.



10) Species-Level Templates & Snippets
Collection ID Cautions (target features only)

 “Look for [visible target traits]. [If timing]: Not yet viable = [immature traits]. When viable = [mature traits], generally [qualified month window].”


Similar Species / Distinguishing Features


Native — [Name, binomial]: [1–2 sentences with absolute, observable differences.]


Horticultural — [Name]: [1–2 sentences.]


Non-native — [Name, binomial]: [1–2 sentences.]


Invasive — [Name, binomial]: [1–2 sentences.]


Readiness Collection Cues

 “[Viability state] [observable traits] [qualified month, optional].”


Seed Drying Needs (container-based only)

 “Dry in [paper bags / envelopes / bucket]; container keeps [fluff/seeds] contained. No tray/screen methods.”


Germination Ecology / Real-World Behavior

 “Seeds disperse in [season]. Dormancy involves [mechanism(s)]. In nature they experience [signals], then germinate in [season]. If [signal] is missed, seeds remain dormant but viable.”


Stratification Requirements

 “Code: [e.g., C(60); M + C(60)]. [Plain-language fridge method]. Alternatives reported: [list]. Conflicting durations: [range] (sources differ).”


Artificial Stratification Risks

 “Risks: premature germination in fridge; mold/rot if overwet; reduced germination if cues skipped or over-extended.”


Representative filled example (vetted here): Geranium maculatum — Germination Ecology (already established in series).



11) Machine-Readable Spec (authoritative; keep it tidy)
metadata:
  version: "20250907-2230-DET"
  region: "SE Michigan"
  audience: ["novice volunteers","coordinators","editors","agent"]
  locked_guides: ["Asteraceae (locked)","Apocynaceae (locked)"]

columns:
  - name: Genus
    status: LOCKED
    type: short_text
    required: true
    format_rules: ["Capitalized","No abbreviations"]
    content_rules: ["Use current accepted genus from trusted references"]
    qa_checks: ["non_empty","matches_trusted_refs_genus"]
    depends_on: ["Trusted External References"]
    examples:
      - good: "Aquilegia"

  - name: Species epithet
    status: LOCKED
    type: short_text
    required: true
    format_rules: ["Lowercase","No abbreviations","Not 'sp.'"]
    content_rules: ["Use current accepted epithet from trusted references"]
    qa_checks: ["non_empty","valid_binomial_with(Genus)","matches_trusted_refs_species"]
    depends_on: ["Genus","Trusted External References"]
    examples:
      - good: "canadensis"

  - name: Previously Known As
    status: LOCKED
    type: list
    required: false
    format_rules: ["Comma-separated binomials only"]
    content_rules:
      - "Include all synonyms from Michigan Flora (primary), USDA PLANTS (fallback), Tropicos (secondary fallback)"
      - "Exclude infraspecific ranks unless synonymized to full species"
    qa_checks: ["not_equal_to_binomial(Genus,Species epithet)","supported_by_trusted_source"]
    depends_on: ["Genus","Species epithet","Trusted External References"]
    examples:
      - good: "Actaea alba, Actaea pachypoda"

  - name: Commonly Used Common Names
    status: LOCKED
    type: list
    required: false
    format_rules: ["Comma-separated","Title Case"]
    content_rules:
      - "Include widely used names in SE MI or adjacent regions"
      - "Mixed sources allowed; no limit"
      - "Exclude botanical synonyms"
    qa_checks: ["vernacular_only"]
    depends_on: []
    examples:
      - good: "Red Columbine, Canadian Columbine"

  - name: Trusted External References
    status: LOCKED
    type: list
    required: true
    format_rules:
      - "Fixed order; attempt all sites deeply; include only species pages"
      - "Always append Google Images results page for binomial"
    content_rules:
      - "Order: Michigan Flora; Go Botany; Illinois Wildflowers; Wildflower.org; Prairie Moon; USDA PLANTS; Tropicos; Minnesota Wildflowers; Google Images results page"
    qa_checks: ["order_preserved","urls_resolve","name_match","google_images_present"]
    depends_on: ["Genus","Species epithet"]
    examples:
      - good: "Michigan Flora species page URL"
      - alt: "Google Images results page for 'Genus species'"

  - name: Collection ID Cautions
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["Short paragraph","Simple connectors","No semicolons"]
    content_rules:
      - "Target species features only (no look-alikes)"
      - "Include seasonal variations where useful"
      - "Keep colors simple"
      - "State which traits indicate viable vs not yet viable when timing is discussed"
    qa_checks: ["observable_traits_present","viability_clarity_if_timing"]
    depends_on: []
    examples:
      - good: "Look for nodding red-and-yellow flowers facing downward; pods turn brown and begin to split when seeds are firm and dark."

  - name: Similar Species / Distinguishing Features
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["Bulleted allowed","Group order: Native→Horticultural→Non-native→Invasive","Within group: by likelihood of confusion","1–2 sentences per entry","Tagged entries"]
    content_rules:
      - "Observable, absolute traits"
      - "Include infraspecific ranks only if commonly confused"
      - "Include only taxa present/likely in Michigan"
      - "Max 10 entries"
      - "Habitat notes only when starkly different"
    qa_checks: ["relative_terms_anchor_to_absolutes"]
    depends_on: ["Trusted External References"]
    examples:
      - good: "Native — Trillium erectum: maroon petals, not white; flower sits above leaves."

  - name: Readiness Collection Cues
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["Each sentence: [Viability] → [Observable traits] → [Qualified timeframe optional]","Use 'generally/typically/often' with months"]
    content_rules:
      - "Include multi-stage maturity"
      - "Explicitly state viable stage"
      - "Overlap with Seed Visibility allowed"
    qa_checks: ["has_viable_stage_sentence","qualified_months_if_present"]
    depends_on: []
    examples:
      - good: "When viable and ready to collect, pods turn brown and begin to split, and seeds are firm and dark, generally by late June through July."

  - name: Collection Challenges
    status: LOCKED
    type: short_text
    required: false
    format_rules: ["One phrase or up to 1–2 sentences"]
    content_rules:
      - "Physical obstacles and/or ecological factors"
      - "Duplication with Safety allowed if clarifying"
    qa_checks: ["fact_based"]
    depends_on: []
    examples:
      - good: "Pods shatter quickly"

  - name: Collection Safety and Nuisance Notes
    status: LOCKED
    type: paragraph
    required: false
    format_rules: ["Short paragraph; expand as needed"]
    content_rules:
      - "Documented hazards (toxicity, spines, irritants, allergens)"
      - "Nuisances (sap, fluff) allowed"
      - "Factual, non-alarmist"
    qa_checks: ["evidence_based","separate_hazard_vs_nuisance_if_both"]
    depends_on: []
    examples:
      - good: "Berries are poisonous if eaten. Sticky sap can irritate skin."

  - name: Seed Drop/Shatter Risk
    status: LOCKED
    type: short_text
    required: true
    format_rules: ["One of: Low / Moderate / High","No timing notes"]
    content_rules:
      - "Use plain language (fall/burst/scatter), 'shatter' optional in parentheses"
      - "Quantitative note allowed if documented"
    qa_checks: ["enum_value_or_plain_text","if_High_then_Readiness_mentions_monitoring"]
    depends_on: ["Readiness Collection Cues"]
    examples:
      - good: "High — pods burst open and seeds scatter (shatter) quickly"

  - name: Collection Quantity Notes
    status: LOCKED
    type: short_text
    required: false
    format_rules: ["Concise; 1–2 sentences"]
    content_rules:
      - "Typical yield per plant/stand"
      - "Allow quantitative ranges if documented"
      - "May note year-to-year variability"
      - "Do not describe patch density"
    qa_checks: ["evidence_based"]
    depends_on: []
    examples:
      - good: "Often hundreds of seeds per plant"

  - name: Collection Habitat Notes
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["Concise; one or more sentences"]
    content_rules:
      - "SE Michigan habitat when available; otherwise Michigan/Great Lakes"
      - "ID context only; not search guidance"
      - "Include specific features when they aid ID"
    qa_checks: ["MI_context","not_search_instruction"]
    depends_on: []
    examples:
      - good: "Species of dry oak–hickory woods and edges, usually on sandy soils."

  - name: Ease of Collection
    status: LOCKED
    type: enum
    enum_values: ["Easy","Moderate","Difficult"]
    required: false
    format_rules: []
    content_rules: ["Judge by time/effort to gather usable quantity"]
    qa_checks: ["value_in_enum"]
    depends_on: []
    examples:
      - good: "Moderate"

  - name: Some Useful Collection Tools
    status: LOCKED
    type: list
    required: false
    format_rules: ["Bulleted list","Length as needed"]
    content_rules:
      - "Tools that directly support cutting/detaching/containing seed"
      - "Exclude gloves/protective gear unless essential"
      - "Exclude specialty gear unless essential"
      - "Maintain consistency across related species when appropriate"
    qa_checks: ["no_comfort_gear_unless_essential"]
    depends_on: []
    examples:
      - good: "• Paper bags\n• Hand pruners\n• Scissors\n• Bucket"

  - name: Collection Container Guidance
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["1–2 sentences","Concise"]
    content_rules:
      - "Container type(s) to use at collection time only"
      - "Do not describe storage, drying, or processing"
      - "May note unsuitable types (e.g., avoid sealed plastic)"
    qa_checks: ["names_container_type"]
    depends_on: []
    examples:
      - good: "Collect into paper bags."

  - name: Seed Drying Needs
    status: LOCKED
    type: short_text
    required: true
    format_rules: ["1–2 sentences","Concise"]
    content_rules:
      - "Container-based drying (paper bags/envelopes/bucket)"
      - "Keep fluff/seeds contained"
      - "No trays/screens/tarps"
      - "No processing instructions"
    qa_checks: ["no_exposed_surface_methods","no_processing_instructions"]
    depends_on: []
    examples:
      - good: "Dry pods in paper bags so floss and seeds stay contained."

  - name: Seed Visibility at Maturity
    status: LOCKED
    type: paragraph
    required: false
    format_rules: ["Begin with Visible/Hidden/Partly visible","1–2 sentences plain language"]
    content_rules:
      - "Say where the seeds are and how to tell them from other parts"
      - "Avoid botanical jargon"
    qa_checks: ["starts_with_enum","everyday_description_present"]
    depends_on: []
    examples:
      - good: "Visible — small black seeds can be seen loose inside the open dried flower case."

  - name: Seed Color at Maturity
    status: LOCKED
    type: short_text
    required: true
    format_rules: ["Short phrase allowed"]
    content_rules: ["Seed color only; free-text"]
    qa_checks: ["concise_seed_only"]
    depends_on: []
    examples:
      - good: "Dark brown to black"

  - name: What You Collect
    status: LOCKED
    type: short_text
    required: true
    format_rules: ["Single short noun phrase","Multiple units allowed via commas","No clarifiers"]
    content_rules: ["Pods/heads/capsules/seeds/clusters/etc.; no processing/storage"]
    qa_checks: ["matches_reproductive_structure"]
    depends_on: []
    examples:
      - good: "Pods"

  - name: Processing Difficulty
    status: DRAFT
    type: enum
    required: false
    format_rules: ["Proposed: Easy/Moderate/Difficult"]
    content_rules: ["Overall processing difficulty"]
    qa_checks: ["value_in_enum_if_used"]
    depends_on: ["Seed Cleaning Complexity"]
    examples:
      - good: "none yet"

  - name: Processing Time / Labor
    status: DRAFT
    type: short_text
    required: false
    format_rules: ["Minimal/Moderate/High (selected vocabulary)"]
    content_rules: ["No pseudo-precision unless documented"]
    qa_checks: ["consistent_with(Seed Cleaning Complexity)"]
    depends_on: ["Seed Cleaning Complexity"]
    examples:
      - good: "none yet"

  - name: Seed Cleaning Complexity
    status: LOCKED
    type: short_text
    required: true
    format_rules: ["Brief; mention chaff/mesh/steps"]
    content_rules: ["Core cleaning approach"]
    qa_checks: ["concise_actionable"]
    depends_on: []
    examples:
      - good: "Screen 1/8\", then winnow light chaff."

  - name: Processing Hazards
    status: DRAFT
    type: short_text
    required: false
    format_rules: ["Concise; factual"]
    content_rules: ["Documented mechanical/irritant/toxin hazards"]
    qa_checks: ["evidence_based"]
    depends_on: []
    examples:
      - good: "none yet"

  - name: Processing Nuggets
    status: DRAFT
    type: short_text
    required: false
    format_rules: ["1–2 practical tips"]
    content_rules: ["High-leverage, plain steps"]
    qa_checks: ["practical_specific"]
    depends_on: []
    examples:
      - good: "none yet"

  - name: Safe Storage Method – Room Temp
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["Short paragraph"]
    content_rules: ["Dry, labeled, pest-safe; no stratification talk"]
    qa_checks: ["no_stratification"]
    depends_on: []
    examples:
      - good: "none yet"

  - name: Safe Storage Method – Dry Fridge
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["Short paragraph"]
    content_rules: ["Dry-fridge only; desiccant if appropriate; not cold-moist"]
    qa_checks: ["no_moist_media"]
    depends_on: []
    examples:
      - good: "none yet"

  - name: Mold Risk Notes
    status: LOCKED
    type: short_text
    required: false
    format_rules: ["Blank allowed"]
    content_rules: ["Only filled if concern exists"]
    qa_checks: ["empty_allowed_or_evidence_based"]
    depends_on: []
    examples:
      - good: ""

  - name: Other Storage Hazards / Warnings
    status: DRAFT
    type: short_text
    required: false
    format_rules: ["Concise; characteristics not speculation"]
    content_rules: ["Non-mold hazards (e.g., static/fluff)"]
    qa_checks: ["evidence_based"]
    depends_on: []
    examples:
      - good: "none yet"

  - name: Germination Ecology / Real-World Behavior
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["3–6 sentences","Plain language"]
    content_rules:
      - "Dispersal timing"
      - "Signals (warm/cold/moist/light)"
      - "Dormancy mechanism(s)"
      - "Natural germination season"
      - "Missed cues → dormant but viable"
    qa_checks: ["has_signal_term","mentions_viability_vs_dormancy"]
    depends_on: ["Trusted External References"]
    examples:
      - good: "Seeds disperse in late spring… (series example for Geranium maculatum)"

  - name: Stratification Requirements
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["Start with codes; then plain language; list alternatives/conflicts","Artificial fridge methods only","Allowed moist media: sand, vermiculite, damp paper towel"]
    content_rules: ["Do not mention outdoor stratification"]
    qa_checks: ["codes_present","alternatives_present_if_conflict"]
    depends_on: ["Germination Ecology"]
    examples:
      - good: "C(60)… (format as specified)"

  - name: Artificial Stratification Risks
    status: LOCKED
    type: paragraph
    required: true
    format_rules: ["Bullets allowed"]
    content_rules: ["Premature germination","Mold/rot if overwet","Reduced germination if cues skipped/over-extended"]
    qa_checks: ["documented_risks_only"]
    depends_on: ["Stratification Requirements"]
    examples:
      - good: "Risks: premature germination…"

  - name: Seeds to Community Spreadsheet vs Reference: Discrepancies
    status: LOCKED
    type: list
    required: false
    format_rules: ["One bullet per contradiction","'Spreadsheet: …; References: …'"]
    content_rules: ["Contradictions only; no blanks/wording diffs"]
    qa_checks: ["populate_only_after(all_other_columns)"]
    depends_on: ["All other columns"]
    examples:
      - good: "Spreadsheet: C(90); References: C(60)."
series_policy:
  style: {paragraph: true, novice_friendly: true, MI_context: true}
  seeds_to_community_practices: ["labeling reminders","processing timing","short-term fridge storage"]
  forbidden: ["jargon", "supportive platitudes", "Latin abbreviations on first mention"]

12) Delta Since Prior Export
(No prior export provided in prompt — nothing to delta.)

13) Minimal Carry-Forward Summary (≤300 words)
This spec defines the spreadsheet schema for ~200 SE-MI native species to support agent-driven population and volunteer-readable outputs. Audience: novices, coordinators, editors, agent. Style: short, plain language; SE-MI framing; clear cues; no filler.
Locked guides: Asteraceae and Apocynaceae patterns (paragraph topics; pods/“process before fluff”; storage cautions).
Identification: split Genus + Species epithet; Commonly Used Common Names holds vernaculars; Previously Known As records botanical synonyms (MI Flora → USDA → Tropicos). Trusted External References uses a fixed, attempt-all order and appends the Google Images results page.
Collection: Collection ID Cautions = target features only; Similar Species lists look-alikes (Native → Horticultural → Non-native → Invasive; max 10). Readiness Cues use the ordered sentence pattern with month qualifiers and explicit viability. Tools/containers/drying are tightly scoped; drying is container-based only (no trays/screens) and contains fluff.
Processing/Storage/Stratification: Seed Cleaning Complexity locked; other processing fields remain DRAFT. Storage (room/dry fridge) excludes stratification. Ecology precedes methods; artificial fridge methods and risks are locked.
Status count: LOCKED 28; DRAFT 5; PENDING 0.
Top open decisions: Processing Difficulty enum granularity; Processing Hazards scope; Other Storage Hazards phrasing; Processing Time vocabulary.
See YAML above for authoritative machine-readable spec.


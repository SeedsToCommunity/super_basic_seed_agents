# Design Decisions

## 2025-11-18
- Use a true plug and play approach for the up to 40 modules that produce data elements.
- All modules finish for a given species before data is saved.
- Modules can depend upon each other. When adding a new module, dependancies must be identified.
- SerpAPI is used for its Google Search API library. 250 searches a month free. Used for External Reference URLs. To avoid another recurring cost, the system saves successful search results in a local cache file, so does not need to search over and over. Retry attempts are time spaced, up to a config defined max time, then failure.
- For identifing "previously known as" botanical names, use the Missouri Botanical Garden's Tropicos API. Comprehensive nomenclatural database. Free API key required. Returns full nomenclatural history with basionyms and synonyms. Refactor the Botanical name process to use the same API.

## 2025-11-17
- Google Drive for data storage for now
- GitHub for software repository: https://github.com/ScaleNature/super_basic_seed_agents.git
- GitHub Project for task management
- JavaScript for all scripts
- Replit for Instigator development environment
- Validation as quality gate first, retry logic later
- Manual PDF extraction for now, automation if time permits
- JTP is known as Instigator
- Andrew is known as Consultant
- Derek is known as Software Developer
- Keya is known as Systems Engineer
- Existing Plant Species Directory web application is good enought for now (MVP)
# Synthesis Module Interface Specification

## Overview

All synthesis modules must export a standardized interface with metadata and a runner function. This allows the pipeline to dynamically load, order, and execute modules without hardcoded dependencies.

## Module Structure

Each synthesis module must export:

### 1. Module Metadata (`metadata` object)

```javascript
export const metadata = {
  id: string,              // Unique identifier (kebab-case)
  name: string,            // Human-readable name
  columns: string[],       // Column headers this module produces
  dependencies: string[],  // IDs of modules that must run before this one
  description: string      // Brief description of what this module does
};
```

### 2. Runner Function

```javascript
export async function run(genus, species, priorResults) {
  // priorResults: object containing results from all previously executed modules
  // Returns: object with data matching the columns defined in metadata
}
```

## Example Module

```javascript
// src/synthesis/example-module.js
export const metadata = {
  id: 'habitat-type',
  name: 'Habitat Type Checker',
  columns: ['Habitat', 'Habitat Notes'],
  dependencies: ['botanical-name'], // Needs valid plant first
  description: 'Determines typical habitat and ecological preferences'
};

export async function run(genus, species, priorResults) {
  // Access data from botanical-name module
  const family = priorResults['botanical-name']?.family;
  
  // Your synthesis logic here...
  const habitat = await determineHabitat(genus, species, family);
  
  // Return object matching columns
  return {
    habitat: habitat.type,
    habitatNotes: habitat.notes
  };
}
```

## Module Execution Order

The pipeline automatically:
1. Loads all registered modules from `config/synthesis-registry.json`
2. Topologically sorts them based on dependencies
3. Executes in order, passing cumulative results forward
4. Stops early if a critical dependency fails

## Critical Modules

Modules with `dependencies: []` are considered "root" modules and run first. If a root module fails validation (returns `null`), the pipeline stops immediately.

Example: `botanical-name` is critical - if the plant name is invalid, no other synthesis modules should run.

## Adding a New Module

1. Create your module file in `src/synthesis/` following the interface
2. Add entry to `config/synthesis-registry.json`:
   ```json
   {
     "path": "./src/synthesis/your-module.js",
     "enabled": true
   }
   ```
3. Done! The pipeline will automatically load and execute it

## Best Practices

- **Keep modules independent**: Each module should be self-contained
- **Use dependencies sparingly**: Only depend on modules whose data you actually need
- **Handle errors gracefully**: Return partial results rather than throwing
- **Cache when possible**: Use local caching to minimize API costs
- **Document your config**: Each module can have its own config file in `config/`

# Synthesis Module Interface Specification

## Overview

All synthesis modules must export a standardized interface with metadata and a runner function. This allows the pipeline to dynamically load, order, and execute modules without hardcoded dependencies.

## Module Structure

Each synthesis module must export:

### 1. Module Metadata (`metadata` object)

```javascript
export const metadata = {
  id: 'module-identifier',           // Unique identifier (kebab-case)
  name: 'Human-Readable Module Name',
  columns: [                          // Column descriptors (NOT plain strings)
    { id: 'columnId1', header: 'Display Header 1' },
    { id: 'columnId2', header: 'Display Header 2' }
  ],
  dependencies: ['other-module-id'],  // IDs of modules that must run before this one
  description: 'Brief description of what this module does'
};
```

**Column Descriptor Format:**
- `id`: Stable identifier for the column (camelCase), used as the key in `columnValues`
- `header`: Display name for the Google Sheets column header

**Why objects instead of strings?**
- Separates identity from presentation (can change display text without breaking code)
- Enables type-safe column value mapping
- Prevents silent data corruption from column reordering

### 2. Runner Function

```javascript
export async function run(genus, species, priorResults) {
  // Access data from prior modules if needed
  const botanicalData = priorResults['botanical-name'];
  
  // Perform processing
  const result = await processData(genus, species);
  
  // Return columnValues object mapping column IDs to values
  return {
    columnValues: {
      columnId1: value1,
      columnId2: value2
    },
    // Optional: additional internal fields for pipeline logic
    internalField: internalValue
  };
}
```

**Important:**
- `columnValues` must be a `Record<string, any>` object with keys matching column IDs from `metadata.columns`
- ALL declared column IDs must have corresponding values (runtime validation enforces this)
- Object/array values are automatically JSON-stringified for Google Sheets
- Additional fields (like `status`, `genus`, `species`) can be included for pipeline logic

## Example Module

```javascript
// src/synthesis/process-habitat-type.js
export const metadata = {
  id: 'habitat-type',
  name: 'Habitat Type Checker',
  columns: [
    { id: 'habitat', header: 'Habitat' },
    { id: 'habitatNotes', header: 'Habitat Notes' }
  ],
  dependencies: ['botanical-name'], // Needs valid plant first
  description: 'Determines typical habitat and ecological preferences'
};

export async function run(genus, species, priorResults) {
  // Access data from botanical-name module
  const family = priorResults['botanical-name']?.genus;
  
  // Your synthesis logic here...
  const result = await determineHabitat(genus, species, family);
  
  // Return columnValues matching column IDs
  return {
    columnValues: {
      habitat: result.type,
      habitatNotes: result.notes || ''
    }
  };
}
```

## Runtime Validation

The pipeline automatically validates:
1. All column IDs in `metadata.columns` have matching keys in `columnValues`
2. No extra keys in `columnValues` beyond what's declared
3. Final row length matches expected column count

Validation errors throw immediately to prevent silent data corruption.

## Module Execution Order

The pipeline automatically:
1. Loads all registered modules from `config/synthesis-registry.json`
2. Topologically sorts them based on dependencies (detects circular dependencies)
3. Executes in order, passing cumulative results forward
4. Stops early if a critical dependency fails

## Critical Modules

Modules with `dependencies: []` are considered "root" modules and run first. If a root module fails validation, the pipeline stops immediately.

Example: `botanical-name` is critical - if the plant name is invalid, no other synthesis modules should run.

## Adding a New Module

1. Create your module file in `src/synthesis/` following this interface
2. Add entry to `config/synthesis-registry.json`:
   ```json
   {
     "id": "habitat-type",
     "path": "../synthesis/process-habitat-type.js",
     "enabled": true,
     "description": "Determines typical habitat"
   }
   ```
3. Done! The pipeline will automatically load, validate, and execute it

## Best Practices

- **Keep modules independent**: Each module should be self-contained
- **Use dependencies sparingly**: Only depend on modules whose data you actually need
- **Handle errors gracefully**: Return partial results rather than throwing
- **Cache when possible**: Use local caching to minimize API costs
- **Document your config**: Each module can have its own config file in `config/`
- **Test your module**: Add tests to `test/synthesis/` to verify behavior

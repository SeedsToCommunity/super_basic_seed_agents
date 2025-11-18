import { validateBotanicalName } from "./src/synthesis/process-botanical-name.js";

const testCases = [
  // Valid current botanical names - SHOULD PASS
  {
    name: "Valid current name - Red Baneberry",
    input: "Actaea rubra",
    expectedStatus: "current",
    shouldPass: true,
  },
  {
    name: "Valid current name - Poke Milkweed",
    input: "Asclepias exaltata",
    expectedStatus: "current",
    shouldPass: true,
  },

  // Outdated botanical names (synonyms) - SHOULD PASS with updated info Symphyotrichum ericoides
  {
    name: "Outdated synonym - for Heath Aster",
    input: "Aster ericoides",
    expectedStatus: "updated",
    expectedCurrentName: "Symphyotrichum ericoides",
    shouldPass: true,
  },
  {
    name: "Outdated synonym - for Spotted Joe Pye Weed - Eutrochium maculatum",
    input: "Eupatorium maculatum",
    expectedStatus: "updated",
    expectedCurrentName: "Eutrochium maculatum",
    shouldPass: true,
  },

  // Invalid/fake botanical names - SHOULD FAIL
  {
    name: "Made-up species",
    input: "Aster somethingorother",
    expectedStatus: "invalid",
    shouldPass: false,
  },
  {
    name: "Made-up genus",
    input: "Nonsensicus cordifolium ",
    expectedStatus: "invalid",
    shouldPass: false,
  },

  // Common names instead of botanical - SHOULD FAIL
  {
    name: "Common name instead of botanical",
    input: "Big Leaf Aster",
    expectedStatus: "invalid",
    shouldPass: false,
  },
  {
    name: "Common vegetable name",
    input: "Tomato plant",
    expectedStatus: "invalid",
    shouldPass: false,
  },

  // Misspelled botanical names - SHOULD DETECT as likely misspelled
  {
    name: "Misspelled genus for Carex pensylvanica      Penn Sedge",
    input: "Careex pennsylvanica",
    expectedStatus: "likely_misspelled",
    expectedSuggestedName: "Carex pensylvanica",
    shouldPass: false,
  },
  {
    name: "Misspelled species for Carex pensylvanica    Penn Sedge",
    input: "Carex pensylanica",
    expectedStatus: "likely_misspelled",
    expectedSuggestedName: "Carex pensylvanica",
    shouldPass: false,
  },

  // Incomplete names - SHOULD FAIL
  {
    name: "Only genus, no species",
    input: "Carex",
    expectedStatus: "invalid",
    shouldPass: false,
  },
  {
    name: "No Genus, Only species",
    input: "canadensis",
    expectedStatus: "invalid",
    shouldPass: false,
  },
];

async function runTests() {
  console.log("=".repeat(70));
  console.log("BOTANICAL NAME VALIDATOR - COMPREHENSIVE TEST SUITE");
  console.log("=".repeat(70));
  console.log();

  let passCount = 0;
  let failCount = 0;
  let errorCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const testNum = i + 1;

    console.log(`Test ${testNum}/${testCases.length}: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(
      `Expected: ${testCase.shouldPass ? "PASS" : "FAIL"} (status: ${testCase.expectedStatus})`,
    );

    try {
      const result = await validateBotanicalName(testCase.input);

      console.log(`Result: valid=${result.valid}, status=${result.status}`);

      if (result.valid && result.status === "current") {
        console.log(
          `  → Family: ${result.family}, Genus: ${result.genus}, Species: ${result.species}`,
        );
      } else if (result.valid && result.status === "updated") {
        console.log(`  → Updated name: ${result.currentName}`);
        console.log(
          `  → Family: ${result.family}, Genus: ${result.genus}, Species: ${result.species}`,
        );
      } else if (!result.valid && result.status === "likely_misspelled") {
        console.log(`  → Suggested name: ${result.suggestedName}`);
        console.log(
          `  → Family: ${result.family}, Genus: ${result.genus}, Species: ${result.species}`,
        );
        console.log(`  → Error: ${result.error}`);
      } else if (!result.valid && result.status === "invalid") {
        console.log(`  → Error: ${result.error}`);
      }

      // Check if result matches expectations
      if (result.status === testCase.expectedStatus) {
        console.log("✓ TEST PASSED\n");
        passCount++;
      } else {
        console.log(
          `✗ TEST FAILED - Expected status '${testCase.expectedStatus}' but got '${result.status}'\n`,
        );
        failCount++;
      }
    } catch (error) {
      console.log(`✗ ERROR: ${error.message}\n`);
      errorCount++;
    }

    console.log("-".repeat(70));
  }

  // Summary
  console.log();
  console.log("=".repeat(70));
  console.log("TEST SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(
    `Success rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`,
  );
  console.log("=".repeat(70));
}

// Handle empty string test separately (will throw error before API call)
async function testEdgeCases() {
  console.log("\n\nEDGE CASE TESTS");
  console.log("=".repeat(70));

  // Test empty string
  console.log("Edge Case 1: Empty string");
  try {
    await validateBotanicalName("");
    console.log("✗ FAILED - Should have thrown error for empty string\n");
  } catch (error) {
    console.log(`✓ PASSED - Correctly threw error: ${error.message}\n`);
  }

  // Test whitespace only
  console.log("Edge Case 2: Whitespace only");
  try {
    await validateBotanicalName("   ");
    console.log("✗ FAILED - Should have thrown error for whitespace\n");
  } catch (error) {
    console.log(`✓ PASSED - Correctly threw error: ${error.message}\n`);
  }

  console.log("=".repeat(70));
}

// Run all tests
(async () => {
  await runTests();
  await testEdgeCases();
})();

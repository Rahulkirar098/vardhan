const assert = require("assert");
const {
    parsePagination,
    buildPaginationMeta,
} = require("../src/utils/pagination.util");

console.log("==========================================");
console.log("=== RUNNING PAGINATION UTILITY TESTS ===");
console.log("==========================================");

// 1. Default parsing
{
    const parsed = parsePagination();
    assert.strictEqual(parsed.page, 1, "Default page should be 1");
    assert.strictEqual(parsed.limit, 10, "Default limit should be 10");
    assert.strictEqual(parsed.skip, 0, "Default skip should be 0");
    console.log("✓ 1. parsePagination defaults pass");
}

// 2. Custom values within limits
{
    const parsed = parsePagination({ page: "3", limit: "25" });
    assert.strictEqual(parsed.page, 3, "Page should be 3");
    assert.strictEqual(parsed.limit, 25, "Limit should be 25");
    assert.strictEqual(parsed.skip, 50, "Skip should be (3 - 1) * 25 = 50");
    console.log("✓ 2. parsePagination valid custom values pass");
}

// 3. Clamping and sanitization of bad inputs
{
    const parsedNegative = parsePagination({ page: "-5", limit: "-10" });
    assert.strictEqual(parsedNegative.page, 1, "Negative page clamped to default 1");
    assert.strictEqual(parsedNegative.limit, 10, "Negative limit clamped to default 10");

    const parsedExcessive = parsePagination({ page: "1", limit: "99999" }, { maxLimit: 100 });
    assert.strictEqual(parsedExcessive.limit, 100, "Limit clamped to maxLimit 100");

    const parsedGarbage = parsePagination({ page: "abc", limit: "xyz" });
    assert.strictEqual(parsedGarbage.page, 1, "Non-numeric page should fallback to 1");
    assert.strictEqual(parsedGarbage.limit, 10, "Non-numeric limit should fallback to 10");
    console.log("✓ 3. parsePagination bad input sanitization and clamping pass");
}

// 4. buildPaginationMeta calculation
{
    // Multiple pages
    const meta1 = buildPaginationMeta(45, 2, 10);
    assert.strictEqual(meta1.total, 45);
    assert.strictEqual(meta1.page, 2);
    assert.strictEqual(meta1.limit, 10);
    assert.strictEqual(meta1.totalPages, 5);
    assert.strictEqual(meta1.hasNextPage, true);
    assert.strictEqual(meta1.hasPrevPage, true);

    // First page
    const metaFirst = buildPaginationMeta(45, 1, 10);
    assert.strictEqual(metaFirst.hasNextPage, true);
    assert.strictEqual(metaFirst.hasPrevPage, false);

    // Last page
    const metaLast = buildPaginationMeta(45, 5, 10);
    assert.strictEqual(metaLast.hasNextPage, false);
    assert.strictEqual(metaLast.hasPrevPage, true);

    // Empty dataset
    const metaEmpty = buildPaginationMeta(0, 1, 10);
    assert.strictEqual(metaEmpty.total, 0);
    assert.strictEqual(metaEmpty.totalPages, 0);
    assert.strictEqual(metaEmpty.hasNextPage, false);
    assert.strictEqual(metaEmpty.hasPrevPage, false);

    console.log("✓ 4. buildPaginationMeta edge cases and calculations pass");
}

console.log("\nAll pagination utility tests passed successfully!\n");

# Task 1: Test Harness and JSON Encoder/Decoder

## Objective
Build the lightweight Lua test harness and a pure-Lua JSON encoder/decoder module that all subsequent tasks depend on for testing.

## Dependencies
None.

## Requirements

### 1.1 Test harness (`tests/test_runner.lua`)

Write a minimal test runner in pure Lua 5.4 that:

- Exposes a `describe(name, fn)` function for grouping tests
- Exposes an `it(name, fn)` function for individual test cases
- Exposes assertion helpers:
  - `assert_eq(actual, expected, msg)` — deep equality for tables, strict equality for scalars
  - `assert_true(val, msg)`
  - `assert_false(val, msg)`
  - `assert_nil(val, msg)`
  - `assert_not_nil(val, msg)`
  - `assert_error(fn, pattern)` — asserts the function throws an error matching the Lua pattern string
- Collects pass/fail counts
- Prints each test result as `[PASS]` or `[FAIL]` with the test name
- Prints a final summary: `X passed, Y failed`
- Exits with code 1 if any test failed (use `os.exit(1)`)
- Is invokable as `lua tests/test_runner.lua` from the repo root, which auto-discovers and runs all `tests/test_*.lua` files via `require` or `dofile`

The harness must NOT depend on any external Lua libraries. It must run with the system `lua` binary (Lua 5.4).

### 1.2 JSON module (`src/json.lua`)

Write a pure-Lua JSON encoder/decoder as a module (returns a table with `.encode` and `.decode` functions). No external dependencies.

**Encoder (`json.encode(value)`):**
- Encodes Lua `nil` as JSON `null`
- Encodes Lua `boolean` as JSON `true`/`false`
- Encodes Lua `number` as JSON number (integers without decimal point, floats with)
- Encodes Lua `string` with proper JSON escaping: `"`, `\`, `/`, `\b`, `\f`, `\n`, `\r`, `\t`, and unicode escape `\uXXXX` for control characters
- Encodes Lua array-like tables (consecutive integer keys starting at 1) as JSON arrays `[...]`
- Encodes Lua string-keyed tables as JSON objects `{...}` with sorted keys (for deterministic output)
- Raises a Lua error for unsupported types (function, userdata, thread)
- Raises a Lua error on circular references (track depth, max 100 levels)

**Decoder (`json.decode(str)`):**
- Decodes JSON null → `nil` (note: use a sentinel if nil-in-table is needed, but for this project nil is fine)
- Decodes JSON boolean → Lua boolean
- Decodes JSON number → Lua number (integer or float as appropriate)
- Decodes JSON string → Lua string (handles all standard JSON escape sequences including `\uXXXX`)
- Decodes JSON array → Lua table with integer keys starting at 1
- Decodes JSON object → Lua table with string keys
- Returns `nil, error_message` on parse failure (does NOT raise, to allow safe usage in HTTP handlers)
- Handles whitespace between tokens
- Does NOT need to handle comments, trailing commas, or other JSON5 extensions

### 1.3 JSON tests (`tests/test_json.lua`)

Write tests for the JSON module first (TDD — write before implementing `src/json.lua`).

Tests must cover:
- Encode: nil, boolean, integer, float, string with special characters, empty table, array, nested object
- Encode: error on circular reference
- Encode: sorted object keys produce deterministic output
- Decode: each JSON type
- Decode: nested structures
- Decode: malformed JSON returns nil + error string (not a Lua error)
- Decode: string escapes (`\"`, `\\`, `\n`, `\t`, `\uXXXX`)
- Round-trip: `encode(decode(s))` and `decode(encode(t))` for representative values

## Acceptance Criteria
- [ ] `lua tests/test_runner.lua` runs from the repo root without error
- [ ] All JSON tests pass
- [ ] `src/json.lua` has no dependencies on REAPER APIs or socket libraries
- [ ] `json.encode(json.decode(s))` round-trips correctly for all valid JSON inputs used by the API
- [ ] Encoder produces valid JSON parseable by a reference parser (e.g., Python's `json.loads`)
- [ ] Test runner exits with code 0 on all-pass, code 1 on any failure

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `tests/test_json.lua`
- **Test framework:** Custom harness in `tests/test_runner.lua` (built in this same task — write the harness first, then the JSON tests, then the JSON implementation)
- **Test command:** `lua tests/test_runner.lua`

### Tests to Write First

1. **encode nil:** `json.encode(nil)` returns `"null"`
2. **encode true/false:** `json.encode(true)` returns `"true"`
3. **encode integer:** `json.encode(42)` returns `"42"`
4. **encode float:** `json.encode(3.14)` returns a string parseable as 3.14
5. **encode empty string:** `json.encode("")` returns `"\"\""`
6. **encode string with quotes:** `json.encode('say "hi"')` returns `'"say \\"hi\\""'`
7. **encode string with newline:** `json.encode("a\nb")` returns `'"a\\nb"'`
8. **encode empty array:** `json.encode({})` returns `"[]"` or `"{}"` (document which)
9. **encode array:** `json.encode({1,2,3})` returns `"[1,2,3]"`
10. **encode object:** `json.encode({a=1, b=2})` returns valid JSON object with keys sorted
11. **encode nested:** `json.encode({x={y=true}})` returns `'{"x":{"y":true}}'`
12. **encode circular error:** circular table reference raises a Lua error
13. **decode null:** `json.decode("null")` returns nil (and no error)
14. **decode boolean:** `json.decode("true")` returns true
15. **decode integer:** `json.decode("42")` returns 42
16. **decode float:** `json.decode("3.14")` returns approximately 3.14
17. **decode string:** `json.decode('"hello"')` returns `"hello"`
18. **decode escaped string:** `json.decode('"a\\nb"')` returns `"a\nb"`
19. **decode unicode escape:** `json.decode('"\\u0041"')` returns `"A"`
20. **decode array:** `json.decode("[1,2,3]")` returns table `{1,2,3}`
21. **decode object:** `json.decode('{"a":1}')` returns table `{a=1}`
22. **decode nested:** `json.decode('{"x":{"y":true}}')` returns nested table
23. **decode malformed:** `json.decode("{bad}")` returns `nil, <error string>` (does not raise)
24. **decode whitespace:** `json.decode('  { "a" : 1 }  ')` handles surrounding whitespace

### TDD Process
1. Write `tests/test_runner.lua` (the harness itself — no tests yet)
2. Verify the harness runs: `lua tests/test_runner.lua` (should report 0 tests)
3. Write all tests in `tests/test_json.lua` — they should FAIL (RED) since `src/json.lua` doesn't exist
4. Implement `src/json.lua` until all tests pass (GREEN)
5. Refactor for clarity while keeping tests green

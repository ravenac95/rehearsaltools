# Task 3: Request Validation Module

## Objective
Implement a pure-Lua validation module that checks and sanitizes all incoming API request payloads, fully tested before implementation.

## Dependencies
Depends on: Task 1 (test harness and JSON module)

## Requirements

### 3.1 Validation module (`src/validation.lua`)

Write a pure-Lua module (returns a table) with one validator function per endpoint that accepts an incoming request body (as a decoded Lua table) and returns either validated data or an error string.

All validators follow this signature:
```
ok, result_or_error = validators.validate_X(decoded_body)
```
Where:
- On success: `ok = true`, `result_or_error` is a sanitized/normalized Lua table with validated fields
- On failure: `ok = false`, `result_or_error` is a string error message suitable for the `{"error": "..."}` JSON response

**`validators.validate_tempo(body)`**

Validates a `POST /tempo` body.

- `body.bpm` must be present
- `body.bpm` must be a number (not a string, not nil)
- `body.bpm` must be in range `[20, 999]` inclusive
- Returns `{bpm = <number>}` on success

Error messages:
- Missing: `"bpm is required"`
- Wrong type: `"bpm must be a number"`
- Out of range: `"bpm must be between 20 and 999"`

**`validators.validate_timesig(body)`**

Validates a `POST /timesig` body.

- `body.numerator` must be present, integer, in range `[1, 64]`
- `body.denominator` must be present, integer, must be a power of 2 in range `[1, 64]` (valid values: 1, 2, 4, 8, 16, 32, 64)
- `body.measure` must be present, integer, >= 1
- Returns `{numerator = <int>, denominator = <int>, measure = <int>}` on success

Error messages:
- Missing numerator: `"numerator is required"`
- Bad numerator: `"numerator must be an integer between 1 and 64"`
- Missing denominator: `"denominator is required"`
- Bad denominator (not power of 2): `"denominator must be a power of 2 (1, 2, 4, 8, 16, 32, 64)"`
- Missing measure: `"measure is required"`
- Bad measure: `"measure must be a positive integer"`

**`validators.validate_volume(body)`**

Validates a `POST /track/:n/volume` body.

- `body.volume` must be present, number, in range `[0.0, 2.0]` inclusive
- Returns `{volume = <number>}` on success

Error messages:
- Missing: `"volume is required"`
- Wrong type: `"volume must be a number"`
- Out of range: `"volume must be between 0.0 and 2.0"`

**`validators.validate_track_number(n_string)`**

Validates the `:n` path parameter for all `/track/:n/*` endpoints.

- `n_string` is a string captured from the URL path
- Must be parseable as a positive integer
- Returns `ok = true, n_integer` on success
- Returns `ok = false, "track number must be a positive integer"` on failure

**`validators.validate_session_new(body)`**

Validates a `POST /session/new` body. This endpoint accepts no meaningful body — the body is always valid (ignored). This validator exists so the handler layer has a consistent validation call pattern.

- Always returns `true, {}` regardless of the input value (including nil)

**`validators.is_power_of_two(n)`**

Internal helper (also exported for testing): returns `true` if `n` is an integer and a power of 2 in the valid set {1, 2, 4, 8, 16, 32, 64}, `false` otherwise.

**`validators.is_integer(n)`**

Internal helper (also exported for testing): returns `true` if `n` is a Lua number with no fractional part (i.e., `math.floor(n) == n`), `false` otherwise.

### 3.2 Validation tests (`tests/test_validation.lua`)

Write tests before implementing. Tests must cover every validator and every error branch.

## File Locations
- `src/validation.lua` — validation module
- `tests/test_validation.lua` — validation tests

## Acceptance Criteria
- [ ] `lua tests/test_runner.lua` passes all validation tests
- [ ] All validators return exact error strings as specified (tests check string values)
- [ ] `validate_timesig` correctly rejects denominators that are not powers of 2 (e.g., 3, 5, 6, 7)
- [ ] `validate_track_number` rejects 0, negative numbers, floats, and non-numeric strings
- [ ] `validate_session_new` always returns `true, {}` for any input including nil
- [ ] Module has no dependency on REAPER APIs
- [ ] All prior task tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `tests/test_validation.lua`
- **Test framework:** Custom harness in `tests/test_runner.lua`
- **Test command:** `lua tests/test_runner.lua`

### Tests to Write First

**validate_tempo:**
1. `{bpm = 120}` → ok, `{bpm = 120}`
2. `{bpm = 20}` → ok (boundary)
3. `{bpm = 999}` → ok (boundary)
4. `{}` → fail, `"bpm is required"`
5. `{bpm = "120"}` → fail, `"bpm must be a number"`
6. `{bpm = 19}` → fail, `"bpm must be between 20 and 999"`
7. `{bpm = 1000}` → fail, `"bpm must be between 20 and 999"`

**validate_timesig:**
8. `{numerator=4, denominator=4, measure=1}` → ok
9. `{numerator=3, denominator=4, measure=5}` → ok
10. `{}` → fail, `"numerator is required"`
11. `{numerator=0, denominator=4, measure=1}` → fail, bad numerator
12. `{numerator=65, denominator=4, measure=1}` → fail, bad numerator
13. `{numerator=4, denominator=3, measure=1}` → fail, bad denominator (3 is not power of 2)
14. `{numerator=4, denominator=4, measure=0}` → fail, bad measure
15. `{numerator=4, denominator=4, measure=-1}` → fail, bad measure
16. `{numerator=1.5, denominator=4, measure=1}` → fail, not integer

**validate_volume:**
17. `{volume = 1.0}` → ok
18. `{volume = 0.0}` → ok (boundary)
19. `{volume = 2.0}` → ok (boundary)
20. `{}` → fail, `"volume is required"`
21. `{volume = -0.1}` → fail, out of range
22. `{volume = 2.1}` → fail, out of range
23. `{volume = "loud"}` → fail, wrong type

**validate_track_number:**
24. `"1"` → ok, 1
25. `"10"` → ok, 10
26. `"0"` → fail
27. `"-1"` → fail
28. `"abc"` → fail
29. `"1.5"` → fail (not integer)

**validate_session_new:**
30. `nil` → ok, `{}`
31. `{}` → ok, `{}`
32. `{anything = "ignored"}` → ok, `{}`

**is_power_of_two:**
33. 1, 2, 4, 8, 16, 32, 64 → all true
34. 3, 5, 6, 7, 12, 100 → all false
35. 0, -1 → false

**is_integer:**
36. 1, 42, 0 → true
37. 1.5, 0.1 → false

### TDD Process
1. Write all tests in `tests/test_validation.lua` — they FAIL (RED)
2. Implement `src/validation.lua` until all tests pass (GREEN)
3. Run `lua tests/test_runner.lua` — all prior tests must still pass

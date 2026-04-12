-- tests/test_runner.lua
-- Minimal pure-Lua 5.4 test harness.
-- Run from repo root: lua tests/test_runner.lua

local M = {}

-- ── State ────────────────────────────────────────────────────────────────────
local pass_count  = 0
local fail_count  = 0
local current_suite = "(top)"

-- ── Helpers ──────────────────────────────────────────────────────────────────

--- Deep equality for tables, strict equality for scalars.
local function deep_eq(a, b)
  if type(a) ~= type(b) then return false end
  if type(a) ~= "table" then return a == b end
  -- Check all keys in a exist in b with equal values.
  for k, v in pairs(a) do
    if not deep_eq(v, b[k]) then return false end
  end
  -- Check b has no extra keys.
  for k in pairs(b) do
    if a[k] == nil then return false end
  end
  return true
end

local function pass(name)
  pass_count = pass_count + 1
  print(string.format("[PASS] %s > %s", current_suite, name))
end

local function fail(name, msg)
  fail_count = fail_count + 1
  print(string.format("[FAIL] %s > %s\n       %s", current_suite, name, tostring(msg)))
end

-- ── Public API ────────────────────────────────────────────────────────────────

function M.describe(name, fn)
  local prev = current_suite
  current_suite = name
  fn()
  current_suite = prev
end

function M.it(name, fn)
  local ok, err = pcall(fn)
  if ok then
    pass(name)
  else
    fail(name, err)
  end
end

function M.assert_eq(actual, expected, msg)
  if not deep_eq(actual, expected) then
    local detail = msg or string.format(
      "expected %s, got %s",
      tostring(expected), tostring(actual)
    )
    error(detail, 2)
  end
end

function M.assert_true(val, msg)
  if not val then
    error(msg or string.format("expected truthy, got %s", tostring(val)), 2)
  end
end

function M.assert_false(val, msg)
  if val then
    error(msg or string.format("expected falsy, got %s", tostring(val)), 2)
  end
end

function M.assert_nil(val, msg)
  if val ~= nil then
    error(msg or string.format("expected nil, got %s", tostring(val)), 2)
  end
end

function M.assert_not_nil(val, msg)
  if val == nil then
    error(msg or "expected non-nil value", 2)
  end
end

--- Assert that calling fn() raises an error whose message matches pattern.
function M.assert_error(fn, pattern)
  local ok, err = pcall(fn)
  if ok then
    error("expected an error to be raised, but none was", 2)
  end
  if pattern and not tostring(err):find(pattern) then
    error(string.format(
      "error message %q does not match pattern %q",
      tostring(err), pattern
    ), 2)
  end
end

-- ── Auto-discovery and entry point ───────────────────────────────────────────

local function run()
  -- Expose helpers as globals so test files can use them without a require.
  describe   = M.describe
  it         = M.it
  assert_eq  = M.assert_eq
  assert_true  = M.assert_true
  assert_false = M.assert_false
  assert_nil   = M.assert_nil
  assert_not_nil = M.assert_not_nil
  assert_error = M.assert_error

  -- Discover all tests/test_*.lua files (excluding ourselves).
  local runner_path = debug.getinfo(1, "S").source:sub(2) -- strip leading @
  local runner_dir  = runner_path:match("^(.*[/\\])") or "./"

  -- Collect test files via io.popen ls (portable enough for CI / Linux/Mac).
  local test_files = {}

  -- Use package to locate the tests directory relative to runner.
  local handle = io.popen('ls "' .. runner_dir .. '"test_*.lua 2>/dev/null')
  if handle then
    for line in handle:lines() do
      -- Skip ourselves.
      if not line:match("test_runner%.lua$") then
        table.insert(test_files, line)
      end
    end
    handle:close()
  end

  table.sort(test_files)

  for _, path in ipairs(test_files) do
    local ok, err = pcall(dofile, path)
    if not ok then
      fail_count = fail_count + 1
      print(string.format("[FAIL] (load error) %s\n       %s", path, tostring(err)))
    end
  end

  -- Summary.
  print(string.format("\n%d passed, %d failed", pass_count, fail_count))

  if fail_count > 0 then
    os.exit(1)
  end
end

-- When invoked as a script (level 1 source is "main"), run immediately.
-- When required as a module (require calls dofile internally, level 2 is "main"),
-- return the table so other scripts can use it.
-- Detect: if level-1 chunk type is "main" we are the top-level script.
local _info1 = debug.getinfo(1, "S")
if _info1 and _info1.what == "main" then
  run()
end

return M

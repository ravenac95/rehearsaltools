local script_dir = (reaper and reaper.get_action_context)
  and ({reaper.get_action_context()})[2]:match("^(.*[\\/])")
  or ""
local logger = dofile(script_dir .. "src/logger.lua")
local osc = {}


function osc.parse(context)
    local msg = {}

    -- Extract the message
    msg.address = context:match("^osc:/([^:[]+)")

    if msg.address == nil then
        return nil
    end

    -- Use substrings to pull the value type and value from the context string.
    -- After the address, the format is :[type]=[value], where type is 'f' for
    -- float or 's' for string.
    local remainder = context:sub(msg.address:len() + 7) -- Skip past "osc:/address:"
    local value_type = remainder:sub(1, 1)
    local value = remainder:sub(3)

    logger.debug("osc.parse: address= " .. tostring(msg.address))
    logger.debug("osc.parse: context= " .. tostring(context))
    
    -- -- Extract float or string value
    -- local value_type, value = context:match(":([fs])=([^%]]+)")

    logger.debug("osc.parse: value_type= " .. tostring(value_type) .. ", value= " .. tostring(value))
    
    if value_type == "f" then
        msg.arg = tonumber(value)
    elseif value_type == "s" then
        msg.arg = value
    end
    
    return msg
end

--- Read the current action context and parse its OSC-wrapped trailing arg.
--- @param get_context_fn optional injection point for tests; defaults to
---                       reaper.get_action_context.
function osc.get(get_context_fn)
    get_context_fn = get_context_fn or (reaper and reaper.get_action_context)
    if not get_context_fn then return nil end
    local _, _, _, _, _, _, _, ctx = get_context_fn()
    if ctx == nil or ctx == '' then
        return nil
    end

    return osc.parse(ctx)
end

return osc
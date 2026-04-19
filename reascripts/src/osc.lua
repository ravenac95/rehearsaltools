local osc = {}

function osc.parse(context)
    local msg = {}

    -- Extract the message
    msg.address = context:match("^osc:/([^:[]+)")

    if msg.address == nil then
        return nil
    end
    
    -- Extract float or string value
    local value_type, value = context:match(":([fs])=([^%]]+)")
    
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
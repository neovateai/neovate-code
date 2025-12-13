# Zod Record Issue with Google API

## Problem

When using `z.record(z.string(), z.string())` in Zod v4 for tool parameter schemas, the Google Gemini API returns an error:

```
Invalid JSON payload received. Unknown name "propertyNames" at 
'request.tools[N].function_declarations[0].parameters.properties[M].value': 
Cannot find field.
```

## Root Cause

In Zod v4, `z.record(KeySchema, ValueSchema)` generates a JSON Schema that includes the `propertyNames` keyword to validate key types:

```json
{
  "type": "object",
  "additionalProperties": {
    "type": "string"
  },
  "propertyNames": {
    "type": "string"
  }
}
```

**Google's Gemini API does not support the `propertyNames` JSON Schema keyword** in function/tool declarations. This is a limitation of the API - it only supports a subset of JSON Schema features.

## Why Zod v4 Requires Two Arguments

In Zod v3, you could use `z.record(z.string())` with a single argument to define only the value type. However, **Zod v4 dropped single-argument support** - you must now specify both key and value schemas: `z.record(z.string(), z.string())`.

Reference: https://zod.dev (Zod 4 Migration Guide)

## Solution

Replace `z.record()` with `z.array()` containing an object schema:

### Before (Causes Error)
```typescript
answers: z
  .record(z.string(), z.string())
  .optional()
  .describe('User answers')
```

Generated JSON Schema:
```json
{
  "type": "object",
  "additionalProperties": { "type": "string" },
  "propertyNames": { "type": "string" }
}
```

### After (Works with Google API)
```typescript
answers: z
  .array(z.object({ question: z.string(), answer: z.string() }))
  .optional()
  .describe('User answers')
```

Generated JSON Schema:
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "question": { "type": "string" },
      "answer": { "type": "string" }
    },
    "required": ["question", "answer"]
  }
}
```

## Trade-offs

| Aspect | `z.record()` | `z.array()` |
|--------|-------------|-------------|
| Google API | ❌ Not supported | ✅ Supported |
| Data access | `answers[question]` | `answers.find(a => a.question === ...)` |
| Uniqueness | Keys are inherently unique | Must validate manually if needed |
| Verbosity | More compact | More explicit structure |

## Affected Files

1. **`src/tools/askUserQuestion.ts`** - Schema definition and execute function
2. **`src/ui/ApprovalModal.tsx`** - Converts UI Record format to array format

## Alternative Solutions Considered

1. **Use `z.record(z.string())` (single arg)** - Not available in Zod v4
2. **Custom JSON Schema override** - More complex, harder to maintain
3. **Post-process schema to remove `propertyNames`** - Hacky, May break on updates

## Recommendations

When defining tool schemas that need to work with Google's API:

1. **Avoid `z.record()`** - It generates `propertyNames` which isn't supported
2. **Use `z.array()` with explicit object schemas** - Fully compatible
3. **Use simple `z.object()` with known keys** - When keys are predefined
4. **Test with all target providers** - Different APIs support different JSON Schema subsets

## Related Links

- [JSON Schema: propertyNames](https://json-schema.org/understanding-json-schema/reference/object.html#property-names)
- [Zod v4 Migration Guide](https://zod.dev)
- [Google Gemini Function Calling](https://ai.google.dev/docs/function_calling)

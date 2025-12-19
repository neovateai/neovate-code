# PDF File Support for Read Tool

**Date:** 2025-12-19

## Context

The goal is to add PDF file reading capability to the `src/tools/read.ts` tool, mirroring the implementation pattern used in Claude's official codebase. The motivation comes from analyzing Claude's PDF handling logic, which shows how PDF files are treated as special document types that can be read and passed to AI models for analysis.

Key reference implementation details from Claude's codebase:
- PDF files are read as binary data and converted to base64
- File size limit is 32MB (33,554,432 bytes)
- Uses `type: "document"` with `media_type: "application/pdf"`
- Includes security checks (empty file, size limit, path validation)

The implementation should follow existing patterns in the codebase while maintaining consistency with the current image processing logic.

## Discussion

### Key Decisions Made:

**1. Mode Restriction Strategy**
- **Decision:** No mode restriction (all modes support PDF)
- **Rationale:** Simplifies implementation, maintains consistency with image handling, no need for environment variable checks
- **Alternatives considered:**
  - Replicate firstParty mode restriction (requires mode detection logic)
  - Use environment variable control (adds configuration complexity)

**2. Return Format to LLM**
- **Decision:** Use unified `llmContent` format
- **Rationale:** Consistent with current codebase patterns, simpler than introducing `newMessages` mechanism
- **Alternatives considered:**
  - Full replication of newMessages pattern (requires extensive message flow refactoring)
  - Simple file path prompt only (degrades functionality)

**3. File Size Limit**
- **Decision:** 32MB (matching Claude's official implementation)
- **Rationale:** Supports more complex PDF files than the image limit (3.75MB), aligns with official standards
- **Alternatives considered:**
  - 3.75MB (same as images, but too restrictive for PDFs)
  - Custom size (unnecessary complexity)

**4. Type System Alignment**
- **Discovery:** `FilePart` type already exists in `src/message.ts`
- **Decision:** Leverage existing `FilePart` type with OpenAI Chat API standard
- **Benefit:** Better interoperability, supports future file type extensions (docx, xlsx, etc.)

## Approach

**Solution: Minimal Implementation (Approach A)**

Add PDF support by creating a symmetric implementation to the existing image processing logic:

1. Define PDF-specific constants (`PDF_EXTENSIONS`, `MAX_PDF_SIZE`)
2. Create `processPDF()` function paralleling `processImage()`
3. Return file content using existing `FilePart` type in `llmContent`
4. Integrate into `read.ts` execute flow after image handling

This approach:
- Minimizes code changes (~50 lines total)
- Maintains architectural symmetry with image handling
- Requires no new infrastructure or message types
- Easy to maintain and understand

## Architecture

### Component Overview

```
read.ts (execute flow)
    ├── Check file extension
    ├── IMAGE_EXTENSIONS? → processImage()
    ├── PDF_EXTENSIONS? → processPDF()  ← NEW
    └── Default → readFileWithOffsetLimit() (text)
```

### Type System

**Existing `FilePart` Type (src/message.ts):**
```typescript
export type FilePart = {
  type: 'file';
  filename?: string;
  data: string;        // base64 encoded
  mimeType: string;
};
```

**Type Extensions Required:**
1. `UserContent` type: Add `FilePart` to union
2. `ToolResult.llmContent`: Add `FilePart` to union

### Core Implementation: `processPDF()`

**Function signature:**
```typescript
async function processPDF(
  filePath: string,
  cwd: string,
): Promise<ToolResult>
```

**Processing steps:**
1. **Path validation:** Resolve path and check for traversal attacks
2. **Empty file check:** Verify file size > 0
3. **Size limit check:** Ensure file ≤ 32MB
4. **Binary read:** Use `fs.readFileSync()` to read file as Buffer
5. **Base64 encoding:** Convert Buffer to base64 string
6. **Return format:**
   ```typescript
   {
     llmContent: [{
       type: 'file',
       data: base64String,
       mimeType: 'application/pdf',
       filename: path.basename(filePath)
     }],
     returnDisplay: 'Read PDF file successfully.'
   }
   ```

### Security Measures

- **Path traversal protection:** Verify resolved path starts with `cwd`
- **Empty file rejection:** Prevent processing of 0-byte files
- **Size enforcement:** Hard limit at 32MB with friendly error messages
- **Consistent error handling:** Mirror image processing error patterns

### File Changes Summary

| File | Changes | Lines |
|------|---------|-------|
| `src/constants.ts` | Add `PDF_EXTENSIONS`, `MAX_PDF_SIZE` | +4 |
| `src/message.ts` | Update `UserContent` type | ~1 |
| `src/tool.ts` | Import `FilePart`, update `ToolResult` type | ~2 |
| `src/tools/read.ts` | Import constants, add `processPDF()`, integrate in execute | ~43 |
| **Total** | | **~50** |

### Integration Points

**In `read.ts` execute method:**
```typescript
// After image handling (around line 143):
if (IMAGE_EXTENSIONS.has(ext)) {
  const result = await processImage(fullFilePath, opts.cwd);
  return result;
}

// NEW: PDF handling
if (PDF_EXTENSIONS.has(ext)) {
  const result = await processPDF(fullFilePath, opts.cwd);
  return result;
}

// Existing text file handling continues...
```

### Error Messages

Consistent, user-friendly error messages:
- Empty file: `"PDF file is empty: {filePath}"`
- Size exceeded: `"PDF file size ({X}MB) exceeds maximum allowed size (32MB). PDF files must be less than 32MB."`
- Path traversal: `"Invalid file path: path traversal detected"`

### Future Extensibility

The `FilePart` type and architecture support easy extension to other document formats:
- Word documents (`.docx`)
- Excel spreadsheets (`.xlsx`)
- PowerPoint presentations (`.pptx`)

Simply add new extension sets and processing functions following the same pattern.

## Implementation Checklist

- [ ] Add constants to `src/constants.ts`
- [ ] Update `UserContent` type in `src/message.ts`
- [ ] Update imports and `ToolResult` type in `src/tool.ts`
- [ ] Implement `processPDF()` function in `src/tools/read.ts`
- [ ] Integrate PDF check in `execute()` method
- [ ] Test with various PDF sizes (small, near-limit, over-limit)
- [ ] Test error cases (empty file, path traversal, oversized file)
- [ ] Verify AI model can properly process PDF content

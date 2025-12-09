# Config Extensions Support

**Date:** 2025-12-02

## Context

Currently, Neo's configuration system performs strict validation through `VALID_CONFIG_KEYS` to ensure that only predefined configuration items can be set. While this design guarantees configuration security, it also introduces a limitation: third-party agents custom-built on Neo cannot add their own configuration items, as any configuration keys not in the whitelist will be rejected during validation.

**Core Problem:**
- Third-party agents need to store their own configuration information
- The existing `VALID_CONFIG_KEYS` validation mechanism blocks custom configurations
- Need a universal, extensible approach to allow third-party additions while preserving the existing validation mechanism

## Discussion

### Solution Options
Three potential implementation approaches were explored during the discussion:

**Option 1: Whitelist Extension (Minimal Changes)**
- Add a new `extensions` field to the whitelist
- No validation performed inside `extensions`
- Reuse existing configuration management logic
- **Advantages:** Minimal changes, lowest risk, simple implementation
- **Disadvantages:** Still requires explicit declaration in whitelist

**Option 2: Dual-track System (Preserve Validation + Extension Channel)**
- Add special handling in all validation logic
- Distinguish between "official configuration" and "extension configuration"
- **Advantages:** More flexible, future extensible
- **Disadvantages:** Requires modifying multiple methods, higher complexity

**Option 3: Prefix Exemption (Support Arbitrary Extension Fields)**
- Allow fields with specific prefixes (e.g., `x-`) to bypass validation
- **Advantages:** Most flexible
- **Disadvantages:** May be over-engineered (YAGNI)

**Final Selection:** Option 1 - Whitelist Extension

### Naming Discussion
Three options were considered for the extension configuration field name:
- `extensions` - Technical, clearly indicates extension functionality ✓ **Selected**
- `custom` - Concise but less explicit semantics
- `agents` - Too business-oriented, limits usage scenarios

### Feature Support Scope
Complete configuration operations need to be supported:
- **Read (get):** Retrieve extension configuration values
- **Set (set):** Write extension configuration
- **Remove (remove):** Delete extension configuration
- **Nested path access:** Support dot notation like `extensions.myAgent.customKey`

## Approach

Adopt a **minimal invasive** design approach:

1. **Add `extensions` field to Config type**
   - Type defined as `Record<string, any>`, allowing arbitrary structure
   - Third parties can freely organize configurations under this field

2. **Incorporate `extensions` into configuration system management**
   - Add to `VALID_CONFIG_KEYS` to ensure field name protection
   - Add to `OBJECT_CONFIG_KEYS` to enable object merging and nested access
   - Set default value as empty object in `DEFAULT_CONFIG`

3. **Reuse all existing logic**
   - No need to modify any method implementations
   - Automatically support global/project configuration merging
   - Automatically support dot notation path access
   - Automatically support command-line operations

**Core Advantages:**
- Minimal changes to existing code (only 4 constant/type modifications)
- Zero-risk introduction of new functionality
- Consistent with existing configuration experience
- Third-party extension configurations have equal status with official configurations

## Architecture

### Type System Extension

```typescript
export type Config = {
  // ... existing fields
  extensions?: Record<string, any>;  // New addition
};
```

### Configuration Constants Update

```typescript
const DEFAULT_CONFIG: Partial<Config> = {
  // ... existing configurations
  extensions: {},  // New addition
};

const VALID_CONFIG_KEYS = [
  // ... existing keys
  'extensions',  // New addition
];

const OBJECT_CONFIG_KEYS = [
  'mcpServers', 
  'commit', 
  'provider', 
  'extensions'  // New addition
];
```

### Configuration File Structure Examples

**Global Configuration** (`~/.neo/config.json`):
```json
{
  "model": "gpt-4",
  "extensions": {
    "myAgent": {
      "apiEndpoint": "https://api.example.com",
      "timeout": 5000
    }
  }
}
```

**Project Configuration** (`.neo/config.json`):
```json
{
  "extensions": {
    "myAgent": {
      "timeout": 3000
    },
    "anotherAgent": {
      "customField": "value"
    }
  }
}
```

### Configuration Merging Behavior

Using `defu` deep merge strategy, project configuration will override global configuration:

```json
{
  "model": "gpt-4",
  "extensions": {
    "myAgent": {
      "apiEndpoint": "https://api.example.com",
      "timeout": 3000  // Project configuration override
    },
    "anotherAgent": {
      "customField": "value"  // Project-specific
    }
  }
}
```

### Usage Methods

**Programmatic Access:**
```typescript
const config = configManager.config;
const myAgentConfig = config.extensions?.myAgent;
if (myAgentConfig) {
  const endpoint = myAgentConfig.apiEndpoint;
}
```

**Command-line Operations:**
```bash
# Set
neo config set extensions.myAgent.apiEndpoint "https://api.example.com"

# Get
neo config get extensions.myAgent.apiEndpoint

# Remove
neo config remove extensions.myAgent.timeout
```

### Implementation Details

**Files to Modify:** `src/config.ts`

**Modification Locations:**
1. Config type definition (~51-72 lines) - Add `extensions?: Record<string, any>`
2. DEFAULT_CONFIG (~74-86 lines) - Add `extensions: {}`
3. VALID_CONFIG_KEYS (~87-103 lines) - Add `'extensions'`
4. OBJECT_CONFIG_KEYS (~105 lines) - Add `'extensions'`

**Parts Not Requiring Modification:**
- All methods in ConfigManager class (automatically supported)
- Configuration loading/saving logic (automatically compatible)
- Configuration merging logic (automatically effective)

### Error Handling

**Existing Protection Mechanisms:**
- `VALID_CONFIG_KEYS` validation prevents field name typos
- Dot notation path validation ensures safe nested access
- JSON parsing errors will be caught and prompted by `loadConfig`

**For extensions internal:**
- **No type validation performed**, completely managed by third parties
- Recommend third parties add configuration validation in their own code
- Invalid JSON formats will be caught during loading

### Documentation Update Suggestions

Need to clarify in user documentation:
- Purpose and usage scenarios of the `extensions` field
- How third-party agent developers use extension configurations
- Configuration examples and best practices
- Configuration merging rules explanation

## Summary

By introducing the `extensions` configuration field, complete support for third-party agent custom configurations is achieved with minimal code changes (only 4 constant/type modifications). This solution fully reuses the existing configuration management infrastructure, maintains API consistency, and provides a secure, flexible configuration channel for ecosystem expansion.

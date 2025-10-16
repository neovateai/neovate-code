# Path Cache System

## Overview

A three-layer caching system for optimizing file path completion performance.

## Architecture

### Layer 1: Memory Cache
- Stores complete file lists per directory
- TTL: 30 seconds
- Automatically refreshed on expiry

### Layer 2: Search Result Cache
- Caches filtered search results by query
- LRU eviction when size exceeds 100 entries
- Cleared when memory cache refreshes

### Layer 3: Debouncing
- 200ms debounce on search requests
- Reduces filesystem scans during rapid typing

## Usage

```typescript
import { PathCacheManager } from './utils/pathCache';

const manager = new PathCacheManager('product-name');

// Get all paths
const { paths, fromCache } = await manager.getPaths('/path/to/dir');

// Search with caching
const results = await manager.search('/path/to/dir', 'src');

// Clear cache
manager.clearCache('/path/to/dir'); // specific directory
manager.clearCache(); // all directories
```

## Performance Targets

- Small projects (< 1000 files): First load < 300ms, cached < 10ms
- Medium projects (1000-5000 files): First load < 1s, cached < 10ms
- Large projects (> 5000 files): First load < 3s, cached < 10ms

## Testing

```bash
npm test -- pathCache
```

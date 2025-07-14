# Testing Guidelines

## Unit Testing

### Best Practices
- Use `describe` blocks to group related tests
- Each test should verify one behavior
- Prefer `expect` assertions over manual checks
- Mock external dependencies

### Example Test
```typescript
import { describe, expect, it } from 'vitest';
import { myFunction } from './module';

describe('myFunction', () => {
  it('should handle basic case', () => {
    expect(myFunction('input')).toEqual('expected');
  });

  it('should handle errors', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

## Test Commands
- Run all tests: `npm test`
- Run specific test: `npm test path/to/test.ts`
- Watch mode: `npm test -- --watch`
- Coverage: `npm test -- --coverage`

## Fixtures
Use test data in `/fixtures` to avoid repetition

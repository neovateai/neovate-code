# Code Review Rules

## Overview
This document defines the rules and guidelines for code review in our project. These rules will be used by automated tools and human reviewers to ensure code quality and consistency.

## Rule Categories

### 1. Code Structure and Organization

#### 1.1 File Organization
- **Files should have a single responsibility**
  - Severity: Medium
  - Description: Each file should focus on a single concern or feature
  - Example violation: A file containing both UI components and business logic

#### 1.2 Function Length
- **Functions should not exceed 50 lines**
  - Severity: Medium
  - Description: Long functions are harder to understand and test
  - Recommendation: Break down into smaller, focused functions

### 2. Code Quality

#### 2.1 Error Handling
- **All errors must be properly handled**
  - Severity: High
  - Description: Don't swallow exceptions without proper handling
  - Example violation: `.catch(() => {})` with no error handling

#### 2.2 Logging
- **Use the project's logger utility instead of console methods**
  - Severity: Medium
  - Description: Consistent logging makes debugging easier
  - Example violation: `console.log()` or `console.error()`

### 3. Performance

#### 3.1 Resource Management
- **Resources should be properly released**
  - Severity: High
  - Description: File handles, connections, and other resources must be closed
  - Recommendation: Use try-finally or equivalent patterns

#### 3.2 Loop Efficiency
- **Avoid unnecessary calculations in loops**
  - Severity: Medium
  - Description: Moving invariant calculations outside loops improves performance
  - Example violation: `for (let i = 0; i < array.length; i++)` when length doesn't change

### 4. TypeScript Specific

#### 4.1 Type Safety
- **Avoid using 'any' type**
  - Severity: Medium
  - Description: Using 'any' defeats TypeScript's type safety benefits
  - Recommendation: Use proper typing or 'unknown' when type is unclear

#### 4.2 Null Checks
- **Values that may be null/undefined must be checked**
  - Severity: High
  - Description: Prevents runtime errors from null/undefined access
  - Recommendation: Use optional chaining (?.) or nullish coalescing (??) operators

### 5. Testing

#### 5.1 Test Coverage
- **Critical code paths must have tests**
  - Severity: High
  - Description: Business logic and error handling should be tested
  - Recommendation: Aim for at least 80% coverage on core functionality

#### 5.2 Test Independence
- **Tests should not depend on each other**
  - Severity: Medium
  - Description: Each test should run independently without side effects
  - Recommendation: Reset state between tests

## Automatic Fixers
Some rules have automatic fixers available:
- Logging: Can replace console.log with logger.info
- Loop efficiency: Can transform for loops to optimized forms
- Type safety: Can suggest proper types for 'any' in some contexts
# UMC Property Mapping - File Refactoring Plan

## Overview

This document outlines the strategy for refactoring large files in the UMC Property Mapping application. We've identified several files exceeding 200 lines of code, with the largest reaching 571 lines. Breaking these down into smaller, more manageable components will improve code maintainability, readability, and testability.

## Identified Large Files

Based on our analysis (`./scripts/find-large-files.sh 200`), we've identified the following files as candidates for refactoring:

1. **smartyService.ts** (571 lines)
2. **PropertyMarkers.tsx** (401 lines)
3. **supabase.ts** (357 lines)
4. **processor.js** (331 lines)
5. **GEOCODING.md** (325 lines) - _documentation, not a code refactoring target_
6. **db.js** (314 lines)
7. **config.toml** (308 lines) - _configuration file, not a code refactoring target_
8. **reporting.js** (302 lines)
9. **MapContainer.tsx** (275 lines)
10. **supabase-functions-with-logs.sql** (252 lines) - _SQL, not a primary refactoring target_
11. **TestControls.tsx** (242 lines)
12. **DATABASE.md** (233 lines) - _documentation, not a code refactoring target_
13. **integrity-report.js** (210 lines)
14. **find-large-files.sh** (205 lines) - _utility script, not a primary refactoring target_

## Refactoring Priority

We'll prioritize refactoring based on:
1. File size
2. Complexity
3. Frequency of changes
4. Impact on application performance

## Refactoring Strategies by File

### 1. smartyService.ts (571 lines)

**Current responsibility**: Handling all interactions with the Smarty address verification API.

**Refactoring approach**:
- Extract core API interaction logic into `smartyApiClient.ts`
- Move data transformation and normalization to `smartyDataTransformers.ts`
- Extract address validation logic to `addressValidation.ts`
- Create type definitions in `smartyTypes.ts`
- Keep a minimal facade in `smartyService.ts` that orchestrates these components

### 2. PropertyMarkers.tsx (401 lines)

**Current responsibility**: Rendering property markers on the map and handling interactions.

**Refactoring approach**:
- Extract marker rendering logic into `MarkerRenderer.tsx`
- Move popup/tooltip content to `MarkerPopup.tsx`
- Extract click handlers to `markerInteractions.ts`
- Create a utility file for marker styling in `markerStyleUtils.ts`
- Keep core component logic and state management in `PropertyMarkers.tsx`

### 3. supabase.ts (357 lines)

**Current responsibility**: All database interactions and queries.

**Refactoring approach**:
- Create entity-based modules:
  - `propertyQueries.ts` - UMC location-related queries
  - `censusQueries.ts` - Census tract and DDA related queries
  - `userQueries.ts` - User-related functionality
- Extract utility functions to `supabaseUtils.ts`
- Create type definitions in `supabaseTypes.ts`
- Keep client initialization and shared functionality in `supabase.ts`

### 4. MapContainer.tsx (275 lines)

**Current responsibility**: Main map rendering and data management.

**Refactoring approach**:
- Extract map initialization logic to `mapInitialization.ts`
- Move layer management to `mapLayers.ts`
- Create a separate hook for map data fetching in `useMapData.ts`
- Extract UI controls to separate components
- Keep core map rendering and state coordination in `MapContainer.tsx`

### 5. TestControls.tsx (242 lines)

**Current responsibility**: Debug and test controls for map functionality.

**Refactoring approach**:
- Break into logical groupings based on functionality
- Extract each control group to its own component
- Create a shared styles file for consistent UI

## Test Refactoring Strategy

Our immediate focus will be on test refactoring to improve coverage and maintainability. The current test approach shows 0% coverage for smartyService.ts despite extensive tests, indicating an issue with our testing methodology.

### Current Testing Issues

1. **Heavy Mocking**: Tests largely mock the implementation rather than testing it directly
2. **Poor Coverage Reporting**: Tests fail to register coverage for the actual implementation
3. **Maintenance Challenges**: Large test files are difficult to maintain and understand
4. **Mock Complexity**: Complex mock setup makes it hard to reason about test behavior

### Test Refactoring Principles

1. **Test Real Implementation**: Minimize mocking to test actual code where possible
2. **Integration Tests**: Add integration tests to supplement unit tests
3. **Logical Grouping**: Organize tests by functionality rather than file structure
4. **Test Data Separation**: Extract test fixtures to dedicated files
5. **Improve MSW Usage**: Better use of MSW for API mocking rather than function mocks
6. **Dependency Injection**: Refactor code to support better dependency injection for testing

### Test Refactoring Steps

1. Create test fixtures directory and files
2. Split smartyService.test.ts into function-specific test files
3. Refactor smartyService.test.utils.ts for better organization
4. Implement integration tests that test multiple functions together
5. Verify and fix coverage reporting
6. Document test patterns for future development

## General Refactoring Guidelines

For all refactoring work:

1. **Extract by functionality**: Components should have a single responsibility
2. **Create clear interfaces**: Define explicit interfaces between modules
3. **Use hooks effectively**: Extract complex logic into custom hooks
4. **Maintain test coverage**: Ensure tests are updated alongside code changes
5. **Preserve behavior**: Refactoring should not change application behavior
6. **Document changes**: Update documentation to reflect new structure

## Implementation Plan

1. **Start with test files** (smartyService.test.ts and smartyService.test.utils.ts)
2. Verify behavior before and after refactoring
3. Address coverage reporting issues
4. Move to implementation files based on priority
5. Break functionality into logical units
6. Update imports across the codebase
7. Verify application behavior matches pre-refactoring state
8. Document changes and patterns established

## Success Criteria

Refactoring will be considered successful when:

1. No source code file exceeds 300 lines (except where unavoidable)
2. Test files are well-organized and maintainable
3. Test coverage is accurately reported and improved
4. Application behavior is unchanged
5. Code is more maintainable and readable
6. Performance is maintained or improved

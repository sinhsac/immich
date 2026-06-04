# Implementation Plan: Extended Memory Metadata

## Overview

This plan implements the extended memory metadata feature as an additive fork extension. It introduces a new `ext_memory_metadata` table (bootstrapped via `ExtBootstrapService`), a title generation service that enriches memories with descriptive titles based on asset context (location, people, tags), a dedicated REST API endpoint at `/ext/memory-metadata`, and web frontend integration. All changes follow the fork's `ext_` prefix convention, use `// FORK:` comments for any upstream file touches, and maintain full mobile app compatibility.

## Tasks

- [x] 1. Bootstrap schema and repository layer
  - [x] 1.1 Add `ext_memory_metadata` CREATE TABLE to ExtBootstrapService
    - Add a new `CREATE TABLE IF NOT EXISTS "ext_memory_metadata"` SQL block to `ensureExtensionSchema()` in `server/src/services/ext-bootstrap.service.ts`
    - Include columns: `id` (uuid PK), `memoryId` (uuid UNIQUE FK → memory.id ON DELETE CASCADE), `title` (varchar NOT NULL), `subCategory` (varchar nullable), `titleSource` (varchar NOT NULL), `createdAt` (timestamptz DEFAULT now()), `updatedAt` (timestamptz DEFAULT now())
    - Add index on `memoryId`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.2 Create `ExtMemoryMetadataRepository`
    - Create file `server/src/repositories/ext-memory-metadata.repository.ts`
    - Implement methods: `upsert(memoryId, data)`, `getByMemoryId(memoryId)`, `getByMemoryIds(memoryIds)`, `getMemoriesWithoutMetadata(memoryIds)`
    - Use Kysely `insertInto(...).onConflict(...)` for upsert
    - Register in services index
    - _Requirements: 2.6, 9.1, 9.2, 9.3_

  - [x] 1.3 Create DTOs for extension API
    - Create file `server/src/dtos/ext-memory-metadata.dto.ts`
    - Define `ExtMemoryMetadataResponseDto` (memoryId, title, subCategory, titleSource)
    - Define `BulkMemoryMetadataRequestDto` (memoryIds: string[], max 100)
    - Use Zod validation consistent with project patterns
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 2. Implement title generation logic
  - [x] 2.1 Create `generateTitle` pure function
    - Create file `server/src/utils/ext-memory-title-generator.ts`
    - Define `AssetMetadataForEnrichment` interface (city, country, personNames, tags)
    - Define `EnrichmentResult` interface (title, titleSource, subCategory)
    - Implement priority algorithm: location (>50% city) → people (>50% majority) → tags (>50% majority) → fallback (date-based)
    - Implement sub-category classification: ≥3 distinct cities → `trip`; people in >70% assets → `people_highlight`; otherwise → null
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write property test: title priority ordering
    - Install `fast-check` as a dev dependency in `server/`
    - Create file `server/src/utils/ext-memory-title-generator.spec.ts`
    - **Property 1: Title generation respects priority ordering**
    - Generate random `AssetMetadataForEnrichment[]` arrays, verify titleSource follows location → people → tags → fallback priority chain
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

  - [ ]* 2.3 Write property test: sub-category classification
    - **Property 2: Sub-category classification follows threshold rules**
    - Generate random asset sets with varying city/people distributions, verify sub-category assignment (trip if ≥3 cities, people_highlight if >70% people, null otherwise)
    - **Validates: Requirements 5.2, 5.3, 5.4**

  - [ ]* 2.4 Write unit tests for `generateTitle` edge cases
    - Test: all assets have null city/country/people/tags → fallback
    - Test: single asset with city → location title
    - Test: tie-breaking between sources at exactly 50% threshold
    - Test: people names formatting (1 person, 2 people, 3 people)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Implement enrichment service
  - [x] 3.1 Create `ExtMemoryEnrichmentService`
    - Create file `server/src/services/ext-memory-enrichment.service.ts`
    - Inject `ExtMemoryMetadataRepository`, Kysely DB, and `LoggingRepository`
    - Implement `enrichMemories(memoryIds: string[])` method that:
      - Filters out memories that already have metadata (or fetches all for re-enrichment)
      - For each memory, queries associated asset IDs from `memory_asset`
      - Queries `asset_exif` for city/country, `asset_face` + `person` for names, `tag_asset` + `tag` for tags
      - Calls `generateTitle` with collected metadata
      - Skips memories with zero assets
      - Upserts result via repository
      - Catches per-memory errors and continues
    - Register in `server/src/services/index.ts` under FORK extension services section
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.1, 9.2, 9.3_

  - [x] 3.2 Add post-job hook for memory generation
    - In `ExtMemoryEnrichmentService`, add an `@OnEvent` handler or schedule-based trigger that runs after `MemoryGenerate` job completes
    - Query for all memories without metadata and enrich them
    - Alternatively, add a minimal `// FORK:` hook in the memory service to emit an event after `onMemoriesCreate` completes
    - _Requirements: 3.1, 10.3_

  - [ ]* 3.3 Write property test: enrichment completeness
    - **Property 3: Enrichment completeness**
    - Generate random memory batches with assets, verify all eligible memories get metadata after enrichment
    - **Validates: Requirements 3.1**

  - [ ]* 3.4 Write property test: empty memories skipped
    - **Property 4: Empty memories are skipped**
    - Generate memories with zero assets, verify no metadata record is created
    - **Validates: Requirements 3.3**

  - [ ]* 3.5 Write property test: enrichment idempotency
    - **Property 5: Enrichment idempotency**
    - Run enrichment twice on same memories, verify single record per memory with updated timestamp
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement extension API controller
  - [x] 5.1 Create `ExtMemoryMetadataController`
    - Create file `server/src/controllers/ext-memory-metadata.controller.ts`
    - Use `@Controller('ext/memory-metadata')`, `@Authenticated()`, `@ApiTags('Memory Metadata (Extension)')`
    - Implement `@Get(':id')` → single memory metadata (with ownership check)
    - Implement `@Post('bulk')` → batch fetch by memory IDs (max 100, with ownership check)
    - Return empty result for memories without metadata
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.2 Register controller in `server/src/controllers/index.ts`
    - Import `ExtMemoryMetadataController`
    - Add to the `controllers` array under the `// FORK: Extension controllers` comment
    - _Requirements: 8.4, 10.3_

  - [ ]* 5.3 Write property test: API metadata retrieval correctness
    - **Property 7: API metadata retrieval correctness**
    - Generate lists of memory IDs (some with metadata, some without), verify response includes metadata only for records that exist
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 5.4 Write unit tests for controller
    - Test: authenticated request returns metadata for owned memory
    - Test: unauthenticated request returns 401
    - Test: request for another user's memory returns 403 or empty
    - Test: bulk request with >100 IDs returns 400
    - _Requirements: 8.5_

- [x] 6. Implement web frontend integration
  - [x] 6.1 Create `ext-memory-metadata` service in web frontend
    - Create file `web/src/lib/services/ext-memory-metadata.ts`
    - Implement `fetchBulkMemoryMetadata(memoryIds: string[])` that calls `/ext/memory-metadata/bulk`
    - Add in-memory caching for fetched metadata
    - _Requirements: 6.1_

  - [x] 6.2 Integrate enriched titles into memory display
    - Locate the memory lane / memory viewer component that renders memory titles
    - Wrap existing title logic: if enriched title exists, display it; otherwise fall back to "X years ago"
    - Display sub-category as a secondary label when present
    - Keep changes minimal and additive with `// FORK:` comments
    - _Requirements: 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 6.3 Write property test: display title selection
    - **Property 6: Display title selection**
    - Generate memories with/without metadata records, verify enriched title shown when available, fallback when not
    - **Validates: Requirements 6.2, 6.3**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `fast-check` library needs to be installed as a dev dependency for property-based tests
- All extension files follow fork naming conventions (`ext-` prefix for files, `ext_` for tables)
- Upstream file modifications are kept to a minimum (only `ext-bootstrap.service.ts`, `services/index.ts`, `controllers/index.ts` and a small hook in memory flow)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["3.1", "6.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["6.2", "6.3"] }
  ]
}
```

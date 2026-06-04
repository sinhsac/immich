# Requirements Document

## Introduction

This feature extends the Immich Memory system with rich metadata that enables the web frontend to display descriptive, context-aware titles for memories (e.g., "Summer in Paris" or "Day with Alex") instead of the generic "X years ago" label. The extension is implemented as an additive fork layer using the established `ext_` table pattern, ensuring the official Immich mobile app continues to function without modification and no upstream enum or schema changes are required.

## Glossary

- **Memory**: An Immich entity representing a collection of assets grouped by date, stored in the `memory` table with type `on_this_day`.
- **Enrichment_Service**: A NestJS service that generates descriptive metadata for memories by analyzing their associated assets.
- **Ext_Memory_Metadata**: A separate extension table (`ext_memory_metadata`) that stores enriched titles, sub-categories, and source information for memories.
- **Title_Generator**: A component within the Enrichment_Service that produces descriptive titles from asset metadata using a priority-based strategy.
- **Sub_Category**: A classification label (e.g., `trip`, `monthly_best`, `people_highlight`) stored as a string in extension metadata, avoiding any changes to the upstream `MemoryType` enum.
- **Bootstrap_Service**: The existing `ExtBootstrapService` that creates extension tables on startup using `CREATE TABLE IF NOT EXISTS` without writing to `kysely_migrations`.
- **Asset_Exif**: The existing `asset_exif` table containing EXIF data for assets, including GPS coordinates, city, and country fields.
- **Web_Frontend**: The SvelteKit-based web application that displays memories to users.
- **Mobile_App**: The official Immich mobile application that reads the standard memory API.

## Requirements

### Requirement 1: Extension Table Creation

**User Story:** As a server administrator, I want the extended memory metadata table to be created automatically on startup, so that no manual migration steps are required.

#### Acceptance Criteria

1. WHEN the server starts, THE Bootstrap_Service SHALL create the `ext_memory_metadata` table if it does not already exist.
2. THE Bootstrap_Service SHALL create the `ext_memory_metadata` table with `ext_` prefix naming convention.
3. THE Bootstrap_Service SHALL use `CREATE TABLE IF NOT EXISTS` to ensure idempotent execution on every startup.
4. THE Bootstrap_Service SHALL NOT write any entry to the `kysely_migrations` table for extension tables.
5. THE `ext_memory_metadata` table SHALL reference the `memory` table via a foreign key on `memoryId` with `ON DELETE CASCADE`.

### Requirement 2: Extended Metadata Schema

**User Story:** As a developer, I want a well-defined schema for storing enriched memory metadata, so that titles and sub-categories are persisted separately from upstream tables.

#### Acceptance Criteria

1. THE Ext_Memory_Metadata table SHALL store a `memoryId` (uuid, unique, foreign key to `memory.id`).
2. THE Ext_Memory_Metadata table SHALL store a `title` field (character varying) for the generated descriptive title.
3. THE Ext_Memory_Metadata table SHALL store a `subCategory` field (character varying, nullable) for classification labels.
4. THE Ext_Memory_Metadata table SHALL store a `titleSource` field (character varying) indicating which data source produced the title (location, people, tags, or fallback).
5. THE Ext_Memory_Metadata table SHALL store a `createdAt` timestamp and an `updatedAt` timestamp.
6. THE Ext_Memory_Metadata table SHALL enforce a unique constraint on `memoryId` to ensure one metadata record per memory.

### Requirement 3: Automatic Enrichment After Memory Generation

**User Story:** As a user, I want memories to be automatically enriched with descriptive metadata after they are generated, so that I see meaningful titles without manual intervention.

#### Acceptance Criteria

1. WHEN the memory generation job completes, THE Enrichment_Service SHALL enrich all newly created memories that lack metadata in `ext_memory_metadata`.
2. THE Enrichment_Service SHALL process each memory by querying the associated assets and their EXIF data, recognized people, and tags.
3. IF a memory has no associated assets, THEN THE Enrichment_Service SHALL skip enrichment for that memory.
4. IF enrichment fails for a single memory, THEN THE Enrichment_Service SHALL log the error and continue processing remaining memories.

### Requirement 4: Title Generation Priority

**User Story:** As a user, I want memory titles to reflect the most meaningful context about my photos, so that I can quickly understand what a memory is about.

#### Acceptance Criteria

1. THE Title_Generator SHALL use the following priority order to select a title source: location (city/country) first, people names second, tags third.
2. WHEN the majority of assets in a memory share a common city, THE Title_Generator SHALL generate a title using that city and country (e.g., "Paris, France").
3. WHEN no common location is available AND recognized people appear in the majority of assets, THE Title_Generator SHALL generate a title using the people names (e.g., "Day with Alex and Sam").
4. WHEN no common location or people are available AND the majority of assets share a common tag, THE Title_Generator SHALL generate a title using that tag.
5. WHEN no location, people, or tags provide sufficient context, THE Title_Generator SHALL fall back to a date-based title and record `titleSource` as `fallback`.
6. THE Title_Generator SHALL record the selected source type in the `titleSource` field of Ext_Memory_Metadata.

### Requirement 5: Sub-Category Classification

**User Story:** As a web frontend developer, I want memories to have sub-category labels, so that the UI can group or style memories differently based on their nature.

#### Acceptance Criteria

1. THE Enrichment_Service SHALL assign a `subCategory` value based on asset analysis without modifying the `MemoryType` enum.
2. WHEN assets in a memory span multiple distinct locations, THE Enrichment_Service SHALL assign the sub-category `trip`.
3. WHEN a memory contains assets that are predominantly of recognized people, THE Enrichment_Service SHALL assign the sub-category `people_highlight`.
4. WHEN no specific pattern is detected, THE Enrichment_Service SHALL leave the `subCategory` field as null.
5. THE Enrichment_Service SHALL store sub-category values as plain strings in the `ext_memory_metadata` table.

### Requirement 6: Web Frontend Display

**User Story:** As a web user, I want to see descriptive titles for my memories instead of generic "X years ago" labels, so that my memory browsing experience is more meaningful.

#### Acceptance Criteria

1. WHEN the Web_Frontend fetches memories, THE Web_Frontend SHALL query `ext_memory_metadata` for enriched titles.
2. WHEN an enriched title exists for a memory, THE Web_Frontend SHALL display the enriched title instead of the generic "X years ago" text.
3. WHEN no enriched title exists for a memory, THE Web_Frontend SHALL fall back to displaying the standard "X years ago" label.
4. THE Web_Frontend SHALL display the sub-category as a secondary label when a sub-category value is present.

### Requirement 7: Mobile App Compatibility

**User Story:** As a mobile app user, I want the app to continue working without any changes, so that the fork extensions do not disrupt my experience.

#### Acceptance Criteria

1. THE Memory API SHALL continue to return the standard `MemoryResponseDto` structure with `type` set to `on_this_day`.
2. THE Memory API SHALL NOT include extension metadata fields in the standard response unless the client explicitly requests them.
3. THE Mobile_App SHALL continue to read the standard memory API responses and function as before.
4. THE Memory API SHALL NOT introduce new values to the `MemoryType` enum.

### Requirement 8: Extension API Endpoint

**User Story:** As a web frontend developer, I want a dedicated API endpoint to fetch extended memory metadata, so that the web app can retrieve enriched titles separately from the standard API.

#### Acceptance Criteria

1. THE server SHALL expose an extension API endpoint that returns `ext_memory_metadata` for a given memory ID or list of memory IDs.
2. WHEN the extension endpoint is called with a valid memory ID, THE server SHALL return the enriched title, sub-category, and title source.
3. WHEN the extension endpoint is called with a memory ID that has no metadata, THE server SHALL return an empty result for that memory.
4. THE extension API endpoint SHALL use a distinct path prefix (e.g., `/ext/`) to avoid collision with upstream API routes.
5. THE extension API endpoint SHALL require the same authentication and authorization as the standard memory API.

### Requirement 9: Enrichment Idempotency

**User Story:** As a server administrator, I want the enrichment process to be safely re-runnable, so that restarts or duplicate job triggers do not create inconsistent data.

#### Acceptance Criteria

1. WHEN the Enrichment_Service processes a memory that already has metadata in `ext_memory_metadata`, THE Enrichment_Service SHALL update the existing record rather than create a duplicate.
2. THE Enrichment_Service SHALL use an upsert strategy (INSERT ... ON CONFLICT UPDATE) to ensure idempotent writes.
3. WHEN the Enrichment_Service updates an existing record, THE Enrichment_Service SHALL update the `updatedAt` timestamp.

### Requirement 10: Fork Isolation

**User Story:** As a developer maintaining this fork, I want all extension artifacts to be clearly separated from upstream code, so that merging upstream changes remains conflict-free.

#### Acceptance Criteria

1. THE extension tables SHALL use the `ext_` prefix in their table names.
2. THE extension service files SHALL be placed in dedicated directories separate from upstream service files.
3. WHEN upstream files are modified to integrate the extension, THE modifications SHALL include a `// FORK:` comment explaining the change.
4. THE extension feature SHALL be additive-only and SHALL NOT modify existing upstream database tables or enum values.

-- Personal digital product platform foundation.
-- Additive and safe to apply while the legacy Astro site is still serving traffic.

CREATE TABLE IF NOT EXISTS `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`url` text NOT NULL,
	`name` text NOT NULL,
	`media_type` text NOT NULL,
	`mime_type` text,
	`size` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`duration_seconds` integer,
	`checksum` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `assets_key_unique` ON `assets` (`key`);

CREATE INDEX IF NOT EXISTS `assets_media_type_idx` ON `assets` (`media_type`);

CREATE INDEX IF NOT EXISTS `assets_checksum_idx` ON `assets` (`checksum`);

CREATE TABLE IF NOT EXISTS `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`path` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`cover_asset_id` text,
	`current_revision_id` text,
	`published_revision_id` text,
	`author_id` text,
	`published_at` integer,
	`scheduled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cover_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX IF NOT EXISTS `resources_path_unique` ON `resources` (`path`);

CREATE INDEX IF NOT EXISTS `resources_type_status_published_idx` ON `resources` (`type`,`status`,`published_at`);

CREATE INDEX IF NOT EXISTS `resources_visibility_idx` ON `resources` (`visibility`);

CREATE INDEX IF NOT EXISTS `resources_author_idx` ON `resources` (`author_id`);

CREATE UNIQUE INDEX IF NOT EXISTS `resources_type_slug_unique` ON `resources` (`type`,`slug`);

CREATE TABLE IF NOT EXISTS `resource_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`path` text NOT NULL,
	`description` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`content_format` text DEFAULT 'markdown' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`source_hash` text,
	`change_summary` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX IF NOT EXISTS `resource_revisions_resource_version_unique` ON `resource_revisions` (`resource_id`,`version`);

CREATE INDEX IF NOT EXISTS `resource_revisions_resource_created_idx` ON `resource_revisions` (`resource_id`,`created_at`);

CREATE TABLE IF NOT EXISTS `resource_routes` (
	`path` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`canonical` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `resource_routes_resource_idx` ON `resource_routes` (`resource_id`);

CREATE TABLE IF NOT EXISTS `redirects` (
	`from_path` text PRIMARY KEY NOT NULL,
	`to_path` text NOT NULL,
	`status_code` integer DEFAULT 301 NOT NULL,
	`created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `articles` (
	`resource_id` text PRIMARY KEY NOT NULL,
	`toc` integer DEFAULT true NOT NULL,
	`share` integer DEFAULT true NOT NULL,
	`giscus` integer DEFAULT true NOT NULL,
	`searchable` integer DEFAULT true NOT NULL,
	`reading_minutes` real,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `documents` (
	`resource_id` text PRIMARY KEY NOT NULL,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`repository` text,
	`source_path` text,
	`commit` text,
	`sync_status` text DEFAULT 'idle' NOT NULL,
	`synced_at` integer,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `documents_source_unique` ON `documents` (`repository`,`source_path`);

CREATE TABLE IF NOT EXISTS `resource_albums` (
	`resource_id` text PRIMARY KEY NOT NULL,
	`artist` text NOT NULL,
	`color` text,
	`release_date` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `tracks` (
	`resource_id` text PRIMARY KEY NOT NULL,
	`album_resource_id` text NOT NULL,
	`audio_asset_id` text,
	`external_url` text,
	`source_type` text DEFAULT 'upload' NOT NULL,
	`duration` text,
	`duration_seconds` integer,
	`track_number` integer DEFAULT 1 NOT NULL,
	`lyrics` text,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`album_resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`audio_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE INDEX IF NOT EXISTS `tracks_album_number_idx` ON `tracks` (`album_resource_id`,`track_number`);

CREATE TABLE IF NOT EXISTS `resource_relations` (
	`source_resource_id` text NOT NULL,
	`target_resource_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	PRIMARY KEY(`source_resource_id`, `target_resource_id`, `relation_type`),
	FOREIGN KEY (`source_resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `resource_relations_target_idx` ON `resource_relations` (`target_resource_id`,`relation_type`);

CREATE TABLE IF NOT EXISTS `collections` (
	`resource_id` text PRIMARY KEY NOT NULL,
	`layout` text DEFAULT 'list' NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `collection_items` (
	`collection_resource_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`section` text,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`collection_resource_id`, `resource_id`),
	FOREIGN KEY (`collection_resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `collection_items_resource_idx` ON `collection_items` (`resource_id`);

CREATE TABLE IF NOT EXISTS `resource_categories` (
	`resource_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`resource_id`, `category_id`),
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `resource_tags` (
	`resource_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`resource_id`, `tag_id`),
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `resource_assets` (
	`resource_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`role` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`resource_id`, `asset_id`, `role`),
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `resource_assets_asset_idx` ON `resource_assets` (`asset_id`);

CREATE TABLE IF NOT EXISTS `products` (
	`resource_id` text PRIMARY KEY NOT NULL,
	`sku` text,
	`product_type` text NOT NULL,
	`access_mode` text DEFAULT 'free' NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `products_sku_unique` ON `products` (`sku`);

CREATE TABLE IF NOT EXISTS `product_items` (
	`product_resource_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`required` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`product_resource_id`, `resource_id`),
	FOREIGN KEY (`product_resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `product_items_resource_idx` ON `product_items` (`resource_id`);

CREATE TABLE IF NOT EXISTS `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_resource_id` text NOT NULL,
	`source` text NOT NULL,
	`starts_at` integer NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `entitlements_user_active_idx` ON `entitlements` (`user_id`,`product_resource_id`,`revoked_at`,`expires_at`);

CREATE TABLE IF NOT EXISTS `platform_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resource_id` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`input_json` text DEFAULT '{}' NOT NULL,
	`output_json` text,
	`error` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE INDEX IF NOT EXISTS `platform_jobs_status_created_idx` ON `platform_jobs` (`status`,`created_at`);

CREATE INDEX IF NOT EXISTS `platform_jobs_resource_idx` ON `platform_jobs` (`resource_id`);

CREATE TABLE IF NOT EXISTS `publication_events` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`revision_id` text,
	`event_type` text NOT NULL,
	`actor_id` text,
	`data_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`revision_id`) REFERENCES `resource_revisions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE INDEX IF NOT EXISTS `publication_events_resource_created_idx` ON `publication_events` (`resource_id`,`created_at`);

-- The search index is maintained explicitly when a resource is published.
CREATE VIRTUAL TABLE IF NOT EXISTS `resource_search` USING fts5(
  `resource_id` UNINDEXED,
  `title`,
  `description`,
  `content`,
  `tokens`,
  tokenize = 'unicode61 remove_diacritics 2'
);

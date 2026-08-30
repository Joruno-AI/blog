-- Large imports are assembled outside the public read model. The final
-- cut-over is one guarded D1 batch, so an interrupted/retried job never exposes
-- a half-imported catalog.

CREATE TABLE IF NOT EXISTS `content_import_staging` (
	`job_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_key` text NOT NULL,
	`ordinal` integer NOT NULL,
	`payload_json` text NOT NULL,
	`content_text` text,
	`baseline_revision_id` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`job_id`, `entity_type`, `entity_key`),
	FOREIGN KEY (`job_id`) REFERENCES `platform_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `content_import_staging_job_ordinal_idx`
	ON `content_import_staging` (`job_id`, `ordinal`);

CREATE TABLE IF NOT EXISTS `content_import_commits` (
	`job_id` text PRIMARY KEY NOT NULL,
	`committed_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `platform_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);

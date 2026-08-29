CREATE TABLE `document_podcasts` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`article_path` text NOT NULL,
	`title` text NOT NULL,
	`repository` text NOT NULL,
	`commit` text NOT NULL,
	`audio_url` text,
	`narrator` text,
	`duration` integer,
	`size` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`script` text,
	`source_hash` text,
	`error` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`generated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_podcasts_source_path_unique` ON `document_podcasts` (`source_id`,`article_path`);

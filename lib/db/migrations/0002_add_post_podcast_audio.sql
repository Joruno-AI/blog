ALTER TABLE `posts` ADD `podcast_audio_url` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_narrator` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_duration` integer;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_size` integer;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_status` text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_script` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_source_hash` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_error` text;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_attempts` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `podcast_generated_at` integer;

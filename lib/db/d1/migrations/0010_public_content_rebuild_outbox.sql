-- Durable transactional outbox for rebuilding the public Next.js projection.
-- `submitted_generation` records GitHub accepting repository_dispatch;
-- `deployed_generation` advances only after production smoke tests acknowledge
-- that exact generation. A missing acknowledgement is therefore retryable.

CREATE TABLE IF NOT EXISTS `public_content_rebuild_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`generation` integer DEFAULT 0 NOT NULL,
	`submitted_generation` integer DEFAULT 0 NOT NULL,
	`deployed_generation` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer NOT NULL,
	`lease_id` text,
	`lease_generation` integer,
	`lease_expires_at` integer,
	`last_reason` text NOT NULL,
	`last_resource_id` text,
	`last_error` text,
	`last_submitted_at` integer,
	`last_deployed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CHECK (`id` = 'public-content'),
	CHECK (`generation` >= `submitted_generation`),
	CHECK (`submitted_generation` >= `deployed_generation`),
	CHECK (`status` IN ('pending', 'processing', 'submitted', 'deployed'))
);

CREATE INDEX IF NOT EXISTS `public_content_rebuild_outbox_ready_idx`
	ON `public_content_rebuild_outbox` (`status`, `available_at`, `lease_expires_at`);

-- All source triggers write through this view so generation/upsert semantics
-- live in one place and remain transactional with the CMS write.
CREATE VIEW IF NOT EXISTS `public_content_rebuild_signal` AS
	SELECT
		CAST(NULL AS text) AS `reason`,
		CAST(NULL AS text) AS `resource_id`
	WHERE 0;

CREATE TRIGGER IF NOT EXISTS `public_content_rebuild_signal_insert`
INSTEAD OF INSERT ON `public_content_rebuild_signal`
BEGIN
	INSERT INTO `public_content_rebuild_outbox` (
		`id`,
		`generation`,
		`submitted_generation`,
		`deployed_generation`,
		`status`,
		`attempts`,
		`available_at`,
		`last_reason`,
		`last_resource_id`,
		`created_at`,
		`updated_at`
	) VALUES (
		'public-content',
		1,
		0,
		0,
		'pending',
		0,
		unixepoch(),
		NEW.`reason`,
		NEW.`resource_id`,
		unixepoch(),
		unixepoch()
	)
	ON CONFLICT (`id`) DO UPDATE SET
		`generation` = `generation` + 1,
		`status` = CASE
			WHEN `status` = 'processing' THEN 'processing'
			ELSE 'pending'
		END,
		`attempts` = CASE WHEN `status` = 'processing' THEN `attempts` ELSE 0 END,
		`available_at` = CASE WHEN `status` = 'processing' THEN `available_at` ELSE unixepoch() END,
		`last_reason` = excluded.`last_reason`,
		`last_resource_id` = excluded.`last_resource_id`,
		`last_error` = CASE WHEN `status` = 'processing' THEN `last_error` ELSE NULL END,
		`updated_at` = unixepoch();
END;

-- Resource lifecycle fields are read directly by the generator. Published
-- revision fields are handled by the revision triggers below. Both sides of
-- UPDATE qualification preserve public -> private/unpublished removals.
CREATE TRIGGER IF NOT EXISTS `public_content_resources_insert`
AFTER INSERT ON `resources`
WHEN NEW.`status` = 'published'
	AND NEW.`visibility` = 'public'
	AND EXISTS (
		SELECT 1 FROM `resource_revisions` AS rr
		WHERE rr.`id` = NEW.`published_revision_id`
			AND rr.`visibility` = 'public'
			AND (
				NEW.`type` IN ('article', 'short', 'project', 'photo')
				OR (NEW.`type` = 'document' AND (
					rr.`path` LIKE '/changelog/%' OR rr.`path` LIKE '/streams/%'
				))
				OR (NEW.`type` = 'album' AND (
					EXISTS (
						SELECT 1 FROM `resource_albums` AS album
						WHERE album.`resource_id` = NEW.`id`
					)
					OR EXISTS (
						SELECT 1 FROM `tracks` AS track
						JOIN `resources` AS track_resource ON track_resource.`id` = track.`resource_id`
						JOIN `resource_revisions` AS track_revision ON track_revision.`id` = track_resource.`published_revision_id`
						WHERE track.`album_resource_id` = NEW.`id`
							AND track_resource.`type` = 'track'
							AND track_resource.`status` = 'published'
							AND track_resource.`visibility` = 'public'
							AND track_revision.`visibility` = 'public'
					)
				))
				OR (NEW.`type` = 'track' AND EXISTS (
					SELECT 1 FROM `tracks` AS track
					JOIN `resources` AS album_resource ON album_resource.`id` = track.`album_resource_id`
					JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
					JOIN `resource_revisions` AS album_revision ON album_revision.`id` = album_resource.`published_revision_id`
					WHERE track.`resource_id` = NEW.`id`
						AND album_resource.`type` = 'album'
						AND album_resource.`status` = 'published'
						AND album_resource.`visibility` = 'public'
						AND album_revision.`visibility` = 'public'
				))
			)
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('resource-inserted', NEW.`id`);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_resources_update`
AFTER UPDATE ON `resources`
WHEN (
		OLD.`type` IS NOT NEW.`type`
		OR OLD.`status` IS NOT NEW.`status`
		OR OLD.`visibility` IS NOT NEW.`visibility`
		OR OLD.`published_revision_id` IS NOT NEW.`published_revision_id`
		OR (
			OLD.`published_at` IS NOT NEW.`published_at`
			AND (OLD.`type` IN ('article', 'short', 'project', 'photo', 'document')
				OR NEW.`type` IN ('article', 'short', 'project', 'photo', 'document'))
		)
		OR (
			OLD.`cover_asset_id` IS NOT NEW.`cover_asset_id`
			AND (
				OLD.`type` IN ('article', 'short', 'project', 'photo', 'document')
				OR NEW.`type` IN ('article', 'short', 'project', 'photo', 'document')
				OR ((OLD.`type` = 'album' OR NEW.`type` = 'album') AND EXISTS (
					SELECT 1 FROM `resource_albums` AS album
					WHERE album.`resource_id` = NEW.`id`
				))
			)
		)
		OR (
			OLD.`created_at` IS NOT NEW.`created_at`
			AND (OLD.`type` = 'album' OR NEW.`type` = 'album')
			AND EXISTS (
				SELECT 1 FROM `resource_albums` AS album
				WHERE album.`resource_id` = NEW.`id`
			)
		)
	)
	AND (
		(
			OLD.`status` = 'published'
			AND OLD.`visibility` = 'public'
			AND EXISTS (
				SELECT 1 FROM `resource_revisions` AS rr
				WHERE rr.`id` = OLD.`published_revision_id`
					AND rr.`visibility` = 'public'
					AND (
						OLD.`type` IN ('article', 'short', 'project', 'photo')
						OR (OLD.`type` = 'document' AND (
							rr.`path` LIKE '/changelog/%' OR rr.`path` LIKE '/streams/%'
						))
						OR (OLD.`type` = 'album' AND (
							EXISTS (
								SELECT 1 FROM `resource_albums` AS album
								WHERE album.`resource_id` = OLD.`id`
							)
							OR EXISTS (
								SELECT 1 FROM `tracks` AS track
								JOIN `resources` AS track_resource ON track_resource.`id` = track.`resource_id`
								JOIN `resource_revisions` AS track_revision ON track_revision.`id` = track_resource.`published_revision_id`
								WHERE track.`album_resource_id` = OLD.`id`
									AND track_resource.`type` = 'track'
									AND track_resource.`status` = 'published'
									AND track_resource.`visibility` = 'public'
									AND track_revision.`visibility` = 'public'
							)
						))
						OR (OLD.`type` = 'track' AND EXISTS (
							SELECT 1 FROM `tracks` AS track
							JOIN `resources` AS album_resource ON album_resource.`id` = track.`album_resource_id`
					JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
							JOIN `resource_revisions` AS album_revision ON album_revision.`id` = album_resource.`published_revision_id`
							WHERE track.`resource_id` = OLD.`id`
								AND album_resource.`type` = 'album'
								AND album_resource.`status` = 'published'
								AND album_resource.`visibility` = 'public'
								AND album_revision.`visibility` = 'public'
						))
					)
			)
		)
		OR (
			NEW.`status` = 'published'
			AND NEW.`visibility` = 'public'
			AND EXISTS (
				SELECT 1 FROM `resource_revisions` AS rr
				WHERE rr.`id` = NEW.`published_revision_id`
					AND rr.`visibility` = 'public'
					AND (
						NEW.`type` IN ('article', 'short', 'project', 'photo')
						OR (NEW.`type` = 'document' AND (
							rr.`path` LIKE '/changelog/%' OR rr.`path` LIKE '/streams/%'
						))
						OR (NEW.`type` = 'album' AND (
							EXISTS (
								SELECT 1 FROM `resource_albums` AS album
								WHERE album.`resource_id` = NEW.`id`
							)
							OR EXISTS (
								SELECT 1 FROM `tracks` AS track
								JOIN `resources` AS track_resource ON track_resource.`id` = track.`resource_id`
								JOIN `resource_revisions` AS track_revision ON track_revision.`id` = track_resource.`published_revision_id`
								WHERE track.`album_resource_id` = NEW.`id`
									AND track_resource.`type` = 'track'
									AND track_resource.`status` = 'published'
									AND track_resource.`visibility` = 'public'
									AND track_revision.`visibility` = 'public'
							)
						))
						OR (NEW.`type` = 'track' AND EXISTS (
							SELECT 1 FROM `tracks` AS track
							JOIN `resources` AS album_resource ON album_resource.`id` = track.`album_resource_id`
					JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
							JOIN `resource_revisions` AS album_revision ON album_revision.`id` = album_resource.`published_revision_id`
							WHERE track.`resource_id` = NEW.`id`
								AND album_resource.`type` = 'album'
								AND album_resource.`status` = 'published'
								AND album_resource.`visibility` = 'public'
								AND album_revision.`visibility` = 'public'
						))
					)
			)
		)
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('resource-updated', NEW.`id`);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_resources_delete`
BEFORE DELETE ON `resources`
WHEN OLD.`status` = 'published'
	AND OLD.`visibility` = 'public'
	AND EXISTS (
		SELECT 1 FROM `resource_revisions` AS rr
		WHERE rr.`id` = OLD.`published_revision_id`
			AND rr.`visibility` = 'public'
			AND (
				OLD.`type` IN ('article', 'short', 'project', 'photo')
				OR (OLD.`type` = 'document' AND (
					rr.`path` LIKE '/changelog/%' OR rr.`path` LIKE '/streams/%'
				))
				OR (OLD.`type` = 'album' AND (
					EXISTS (
						SELECT 1 FROM `resource_albums` AS album
						WHERE album.`resource_id` = OLD.`id`
					)
					OR EXISTS (
						SELECT 1 FROM `tracks` AS track
						JOIN `resources` AS track_resource ON track_resource.`id` = track.`resource_id`
						JOIN `resource_revisions` AS track_revision ON track_revision.`id` = track_resource.`published_revision_id`
						WHERE track.`album_resource_id` = OLD.`id`
							AND track_resource.`type` = 'track'
							AND track_resource.`status` = 'published'
							AND track_resource.`visibility` = 'public'
							AND track_revision.`visibility` = 'public'
					)
				))
				OR (OLD.`type` = 'track' AND EXISTS (
					SELECT 1 FROM `tracks` AS track
					JOIN `resources` AS album_resource ON album_resource.`id` = track.`album_resource_id`
					JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
					JOIN `resource_revisions` AS album_revision ON album_revision.`id` = album_resource.`published_revision_id`
					WHERE track.`resource_id` = OLD.`id`
						AND album_resource.`type` = 'album'
						AND album_resource.`status` = 'published'
						AND album_resource.`visibility` = 'public'
						AND album_revision.`visibility` = 'public'
				))
			)
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('resource-deleted', OLD.`id`);
END;

-- Only fields selected from the published revision can invalidate a build.
-- BEFORE UPDATE sees the old public projection as visibility/path is revoked.
CREATE TRIGGER IF NOT EXISTS `public_content_revisions_update`
BEFORE UPDATE ON `resource_revisions`
WHEN EXISTS (
	SELECT 1 FROM `resources` AS r
	WHERE r.`published_revision_id` = OLD.`id`
		AND r.`status` = 'published'
		AND r.`visibility` = 'public'
		AND (
			(
				(OLD.`visibility` = 'public' OR NEW.`visibility` = 'public')
				AND (
					OLD.`title` IS NOT NEW.`title`
					OR OLD.`slug` IS NOT NEW.`slug`
					OR OLD.`path` IS NOT NEW.`path`
					OR OLD.`description` IS NOT NEW.`description`
					OR OLD.`visibility` IS NOT NEW.`visibility`
					OR OLD.`content` IS NOT NEW.`content`
					OR OLD.`content_format` IS NOT NEW.`content_format`
					OR OLD.`metadata_json` IS NOT NEW.`metadata_json`
					OR OLD.`version` IS NOT NEW.`version`
				)
				AND (
					r.`type` IN ('article', 'short', 'project', 'photo')
					OR (r.`type` = 'document' AND (
						OLD.`path` LIKE '/changelog/%' OR OLD.`path` LIKE '/streams/%'
						OR NEW.`path` LIKE '/changelog/%' OR NEW.`path` LIKE '/streams/%'
					))
				)
			)
			OR (
				r.`type` = 'album'
				AND (OLD.`visibility` = 'public' OR NEW.`visibility` = 'public')
				AND (
					(
						EXISTS (
							SELECT 1 FROM `resource_albums` AS album
							WHERE album.`resource_id` = r.`id`
						)
						AND (
							OLD.`title` IS NOT NEW.`title`
							OR OLD.`slug` IS NOT NEW.`slug`
							OR OLD.`description` IS NOT NEW.`description`
							OR OLD.`visibility` IS NOT NEW.`visibility`
							OR OLD.`metadata_json` IS NOT NEW.`metadata_json`
						)
					)
					OR (
						OLD.`visibility` IS NOT NEW.`visibility`
						AND EXISTS (
							SELECT 1 FROM `tracks` AS track
							JOIN `resources` AS track_resource ON track_resource.`id` = track.`resource_id`
							JOIN `resource_revisions` AS track_revision ON track_revision.`id` = track_resource.`published_revision_id`
							WHERE track.`album_resource_id` = r.`id`
								AND track_resource.`type` = 'track'
								AND track_resource.`status` = 'published'
								AND track_resource.`visibility` = 'public'
								AND track_revision.`visibility` = 'public'
						)
					)
				)
			)
			OR (
				r.`type` = 'track'
				AND (OLD.`visibility` = 'public' OR NEW.`visibility` = 'public')
				AND (
					OLD.`title` IS NOT NEW.`title`
					OR OLD.`visibility` IS NOT NEW.`visibility`
					OR OLD.`content` IS NOT NEW.`content`
					OR OLD.`metadata_json` IS NOT NEW.`metadata_json`
				)
				AND EXISTS (
					SELECT 1 FROM `tracks` AS track
					JOIN `resources` AS album_resource ON album_resource.`id` = track.`album_resource_id`
					JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
					JOIN `resource_revisions` AS album_revision ON album_revision.`id` = album_resource.`published_revision_id`
					WHERE track.`resource_id` = r.`id`
						AND album_resource.`type` = 'album'
						AND album_resource.`status` = 'published'
						AND album_resource.`visibility` = 'public'
						AND album_revision.`visibility` = 'public'
				)
			)
		)
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('published-revision-updated', OLD.`resource_id`);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_revisions_delete`
BEFORE DELETE ON `resource_revisions`
WHEN OLD.`visibility` = 'public'
	AND EXISTS (
		SELECT 1 FROM `resources` AS r
		WHERE r.`published_revision_id` = OLD.`id`
			AND r.`status` = 'published'
			AND r.`visibility` = 'public'
			AND (
				r.`type` IN ('article', 'short', 'project', 'photo')
				OR (r.`type` = 'document' AND (
					OLD.`path` LIKE '/changelog/%' OR OLD.`path` LIKE '/streams/%'
				))
				OR (r.`type` = 'album' AND (
					EXISTS (
						SELECT 1 FROM `resource_albums` AS album
						WHERE album.`resource_id` = r.`id`
					)
					OR EXISTS (
						SELECT 1 FROM `tracks` AS track
						JOIN `resources` AS track_resource ON track_resource.`id` = track.`resource_id`
						JOIN `resource_revisions` AS track_revision ON track_revision.`id` = track_resource.`published_revision_id`
						WHERE track.`album_resource_id` = r.`id`
							AND track_resource.`type` = 'track'
							AND track_resource.`status` = 'published'
							AND track_resource.`visibility` = 'public'
							AND track_revision.`visibility` = 'public'
					)
				))
				OR (r.`type` = 'track' AND EXISTS (
					SELECT 1 FROM `tracks` AS track
					JOIN `resources` AS album_resource ON album_resource.`id` = track.`album_resource_id`
					JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
					JOIN `resource_revisions` AS album_revision ON album_revision.`id` = album_resource.`published_revision_id`
					WHERE track.`resource_id` = r.`id`
						AND album_resource.`type` = 'album'
						AND album_resource.`status` = 'published'
						AND album_resource.`visibility` = 'public'
						AND album_revision.`visibility` = 'public'
				))
			)
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('published-revision-deleted', OLD.`resource_id`);
END;

-- Category rows matter only when a public article's published metadata points
-- to them, directly or through the parent chain used to build category paths.
CREATE TRIGGER IF NOT EXISTS `public_content_categories_insert`
AFTER INSERT ON `categories`
WHEN EXISTS (
	WITH RECURSIVE `referenced_categories`(`id`) AS (
		SELECT DISTINCT json_extract(CASE WHEN json_valid(rr.`metadata_json`) THEN rr.`metadata_json` ELSE '{}' END, '$.categoryId')
		FROM `resources` AS r
		JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
		WHERE r.`type` = 'article' AND r.`status` = 'published'
			AND r.`visibility` = 'public' AND rr.`visibility` = 'public'
			AND json_valid(rr.`metadata_json`)
			AND json_type(rr.`metadata_json`, '$.categoryId') = 'text'
		UNION
		SELECT c.`parent_id`
		FROM `categories` AS c
		JOIN `referenced_categories` AS referenced ON referenced.`id` = c.`id`
		WHERE c.`parent_id` IS NOT NULL
	)
	SELECT 1 FROM `referenced_categories` WHERE `id` = NEW.`id`
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('category-inserted', NULL);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_categories_update`
BEFORE UPDATE ON `categories`
WHEN (
		OLD.`id` IS NOT NEW.`id`
		OR OLD.`name` IS NOT NEW.`name`
		OR OLD.`slug` IS NOT NEW.`slug`
		OR OLD.`parent_id` IS NOT NEW.`parent_id`
	)
	AND EXISTS (
	WITH RECURSIVE `referenced_categories`(`id`) AS (
		SELECT DISTINCT json_extract(CASE WHEN json_valid(rr.`metadata_json`) THEN rr.`metadata_json` ELSE '{}' END, '$.categoryId')
		FROM `resources` AS r
		JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
		WHERE r.`type` = 'article' AND r.`status` = 'published'
			AND r.`visibility` = 'public' AND rr.`visibility` = 'public'
			AND json_valid(rr.`metadata_json`)
			AND json_type(rr.`metadata_json`, '$.categoryId') = 'text'
		UNION
		SELECT c.`parent_id`
		FROM `categories` AS c
		JOIN `referenced_categories` AS referenced ON referenced.`id` = c.`id`
		WHERE c.`parent_id` IS NOT NULL
	)
	SELECT 1 FROM `referenced_categories` WHERE `id` IN (OLD.`id`, NEW.`id`)
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('category-updated', NULL);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_categories_delete`
BEFORE DELETE ON `categories`
WHEN EXISTS (
	WITH RECURSIVE `referenced_categories`(`id`) AS (
		SELECT DISTINCT json_extract(CASE WHEN json_valid(rr.`metadata_json`) THEN rr.`metadata_json` ELSE '{}' END, '$.categoryId')
		FROM `resources` AS r
		JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
		WHERE r.`type` = 'article' AND r.`status` = 'published'
			AND r.`visibility` = 'public' AND rr.`visibility` = 'public'
			AND json_valid(rr.`metadata_json`)
			AND json_type(rr.`metadata_json`, '$.categoryId') = 'text'
		UNION
		SELECT c.`parent_id`
		FROM `categories` AS c
		JOIN `referenced_categories` AS referenced ON referenced.`id` = c.`id`
		WHERE c.`parent_id` IS NOT NULL
	)
	SELECT 1 FROM `referenced_categories` WHERE `id` = OLD.`id`
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('category-deleted', NULL);
END;

-- Tag names are looked up only for tagIds in public article metadata.
CREATE TRIGGER IF NOT EXISTS `public_content_tags_insert`
AFTER INSERT ON `tags`
WHEN EXISTS (
	SELECT 1
	FROM `resources` AS r
	JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
	JOIN json_each(CASE WHEN json_valid(rr.`metadata_json`) THEN rr.`metadata_json` ELSE '{}' END, '$.tagIds') AS tag
	WHERE r.`type` = 'article' AND r.`status` = 'published'
		AND r.`visibility` = 'public' AND rr.`visibility` = 'public'
		AND json_valid(rr.`metadata_json`)
		AND tag.`type` = 'text' AND tag.`value` = NEW.`id`
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('tag-inserted', NULL);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_tags_update`
BEFORE UPDATE ON `tags`
WHEN (OLD.`id` IS NOT NEW.`id` OR OLD.`name` IS NOT NEW.`name`)
	AND EXISTS (
	SELECT 1
	FROM `resources` AS r
	JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
	JOIN json_each(CASE WHEN json_valid(rr.`metadata_json`) THEN rr.`metadata_json` ELSE '{}' END, '$.tagIds') AS tag
	WHERE r.`type` = 'article' AND r.`status` = 'published'
		AND r.`visibility` = 'public' AND rr.`visibility` = 'public'
		AND json_valid(rr.`metadata_json`)
		AND tag.`type` = 'text' AND tag.`value` IN (OLD.`id`, NEW.`id`)
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('tag-updated', NULL);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_tags_delete`
BEFORE DELETE ON `tags`
WHEN EXISTS (
	SELECT 1
	FROM `resources` AS r
	JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
	JOIN json_each(CASE WHEN json_valid(rr.`metadata_json`) THEN rr.`metadata_json` ELSE '{}' END, '$.tagIds') AS tag
	WHERE r.`type` = 'article' AND r.`status` = 'published'
		AND r.`visibility` = 'public' AND rr.`visibility` = 'public'
		AND json_valid(rr.`metadata_json`)
		AND tag.`type` = 'text' AND tag.`value` = OLD.`id`
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('tag-deleted', NULL);
END;

-- Public music album fallback fields.
CREATE TRIGGER IF NOT EXISTS `public_content_resource_albums_insert`
AFTER INSERT ON `resource_albums`
WHEN EXISTS (
	SELECT 1 FROM `resources` AS r
	JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
	WHERE r.`id` = NEW.`resource_id` AND r.`type` = 'album'
		AND r.`status` = 'published' AND r.`visibility` = 'public'
		AND rr.`visibility` = 'public'
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('album-projection-inserted', NEW.`resource_id`);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_resource_albums_update`
AFTER UPDATE ON `resource_albums`
WHEN (
		OLD.`resource_id` IS NOT NEW.`resource_id`
		OR OLD.`artist` IS NOT NEW.`artist`
		OR OLD.`color` IS NOT NEW.`color`
		OR OLD.`release_date` IS NOT NEW.`release_date`
		OR OLD.`sort_order` IS NOT NEW.`sort_order`
	)
	AND EXISTS (
		SELECT 1 FROM `resources` AS r
		JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
		WHERE r.`id` IN (OLD.`resource_id`, NEW.`resource_id`) AND r.`type` = 'album'
			AND r.`status` = 'published' AND r.`visibility` = 'public'
			AND rr.`visibility` = 'public'
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('album-projection-updated', NEW.`resource_id`);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_resource_albums_delete`
BEFORE DELETE ON `resource_albums`
WHEN EXISTS (
	SELECT 1 FROM `resources` AS r
	JOIN `resource_revisions` AS rr ON rr.`id` = r.`published_revision_id`
	WHERE r.`id` = OLD.`resource_id` AND r.`type` = 'album'
		AND r.`status` = 'published' AND r.`visibility` = 'public'
		AND rr.`visibility` = 'public'
)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('album-projection-deleted', OLD.`resource_id`);
END;

-- A track is projected only when both it and its owning album are public.
CREATE TRIGGER IF NOT EXISTS `public_content_tracks_insert`
AFTER INSERT ON `tracks`
WHEN EXISTS (
	SELECT 1 FROM `resources` AS track_resource
	JOIN `resource_revisions` AS track_revision
		ON track_revision.`id` = track_resource.`published_revision_id`
	WHERE track_resource.`id` = NEW.`resource_id`
		AND track_resource.`type` = 'track'
		AND track_resource.`status` = 'published'
		AND track_resource.`visibility` = 'public'
		AND track_revision.`visibility` = 'public'
)
	AND EXISTS (
		SELECT 1 FROM `resources` AS album_resource
		JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
		JOIN `resource_revisions` AS album_revision
			ON album_revision.`id` = album_resource.`published_revision_id`
		WHERE album_resource.`id` = NEW.`album_resource_id`
			AND album_resource.`type` = 'album'
			AND album_resource.`status` = 'published'
			AND album_resource.`visibility` = 'public'
			AND album_revision.`visibility` = 'public'
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('track-projection-inserted', NEW.`resource_id`);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_tracks_update`
AFTER UPDATE ON `tracks`
WHEN (
		OLD.`resource_id` IS NOT NEW.`resource_id`
		OR OLD.`album_resource_id` IS NOT NEW.`album_resource_id`
		OR OLD.`audio_asset_id` IS NOT NEW.`audio_asset_id`
		OR OLD.`external_url` IS NOT NEW.`external_url`
		OR OLD.`source_type` IS NOT NEW.`source_type`
		OR OLD.`duration` IS NOT NEW.`duration`
		OR OLD.`duration_seconds` IS NOT NEW.`duration_seconds`
		OR OLD.`track_number` IS NOT NEW.`track_number`
	)
	AND (
		(
			EXISTS (
				SELECT 1 FROM `resources` AS track_resource
				JOIN `resource_revisions` AS track_revision
					ON track_revision.`id` = track_resource.`published_revision_id`
				WHERE track_resource.`id` = OLD.`resource_id`
					AND track_resource.`type` = 'track'
					AND track_resource.`status` = 'published'
					AND track_resource.`visibility` = 'public'
					AND track_revision.`visibility` = 'public'
			)
			AND EXISTS (
				SELECT 1 FROM `resources` AS album_resource
		JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
				JOIN `resource_revisions` AS album_revision
					ON album_revision.`id` = album_resource.`published_revision_id`
				WHERE album_resource.`id` = OLD.`album_resource_id`
					AND album_resource.`type` = 'album'
					AND album_resource.`status` = 'published'
					AND album_resource.`visibility` = 'public'
					AND album_revision.`visibility` = 'public'
			)
		)
		OR (
			EXISTS (
				SELECT 1 FROM `resources` AS track_resource
				JOIN `resource_revisions` AS track_revision
					ON track_revision.`id` = track_resource.`published_revision_id`
				WHERE track_resource.`id` = NEW.`resource_id`
					AND track_resource.`type` = 'track'
					AND track_resource.`status` = 'published'
					AND track_resource.`visibility` = 'public'
					AND track_revision.`visibility` = 'public'
			)
			AND EXISTS (
				SELECT 1 FROM `resources` AS album_resource
		JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
				JOIN `resource_revisions` AS album_revision
					ON album_revision.`id` = album_resource.`published_revision_id`
				WHERE album_resource.`id` = NEW.`album_resource_id`
					AND album_resource.`type` = 'album'
					AND album_resource.`status` = 'published'
					AND album_resource.`visibility` = 'public'
					AND album_revision.`visibility` = 'public'
			)
		)
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('track-projection-updated', NEW.`resource_id`);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_tracks_delete`
BEFORE DELETE ON `tracks`
WHEN EXISTS (
	SELECT 1 FROM `resources` AS track_resource
	JOIN `resource_revisions` AS track_revision
		ON track_revision.`id` = track_resource.`published_revision_id`
	WHERE track_resource.`id` = OLD.`resource_id`
		AND track_resource.`type` = 'track'
		AND track_resource.`status` = 'published'
		AND track_resource.`visibility` = 'public'
		AND track_revision.`visibility` = 'public'
)
	AND EXISTS (
		SELECT 1 FROM `resources` AS album_resource
		JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
		JOIN `resource_revisions` AS album_revision
			ON album_revision.`id` = album_resource.`published_revision_id`
		WHERE album_resource.`id` = OLD.`album_resource_id`
			AND album_resource.`type` = 'album'
			AND album_resource.`status` = 'published'
			AND album_resource.`visibility` = 'public'
			AND album_revision.`visibility` = 'public'
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('track-projection-deleted', OLD.`resource_id`);
END;

-- The generator reads asset.url only for a public album cover or a public
-- track's audio. Content/photo cover IDs are projected, not their asset rows.
CREATE TRIGGER IF NOT EXISTS `public_content_assets_update`
AFTER UPDATE ON `assets`
WHEN OLD.`url` IS NOT NEW.`url`
	AND (
		EXISTS (
			SELECT 1 FROM `resources` AS album_resource
		JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
			JOIN `resource_revisions` AS album_revision
				ON album_revision.`id` = album_resource.`published_revision_id`
			JOIN `resource_albums` AS album
				ON album.`resource_id` = album_resource.`id`
			WHERE album_resource.`cover_asset_id` = NEW.`id`
				AND album_resource.`type` = 'album'
				AND album_resource.`status` = 'published'
				AND album_resource.`visibility` = 'public'
				AND album_revision.`visibility` = 'public'
		)
		OR EXISTS (
			SELECT 1 FROM `tracks` AS track
			JOIN `resources` AS track_resource ON track_resource.`id` = track.`resource_id`
			JOIN `resource_revisions` AS track_revision
				ON track_revision.`id` = track_resource.`published_revision_id`
			JOIN `resources` AS album_resource ON album_resource.`id` = track.`album_resource_id`
					JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
			JOIN `resource_revisions` AS album_revision
				ON album_revision.`id` = album_resource.`published_revision_id`
			WHERE track.`audio_asset_id` = NEW.`id`
				AND track_resource.`type` = 'track'
				AND track_resource.`status` = 'published'
				AND track_resource.`visibility` = 'public'
				AND track_revision.`visibility` = 'public'
				AND album_resource.`type` = 'album'
				AND album_resource.`status` = 'published'
				AND album_resource.`visibility` = 'public'
				AND album_revision.`visibility` = 'public'
		)
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('public-asset-updated', NULL);
END;

CREATE TRIGGER IF NOT EXISTS `public_content_assets_delete`
BEFORE DELETE ON `assets`
WHEN EXISTS (
		SELECT 1 FROM `resources` AS album_resource
		JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
		JOIN `resource_revisions` AS album_revision
			ON album_revision.`id` = album_resource.`published_revision_id`
		JOIN `resource_albums` AS album ON album.`resource_id` = album_resource.`id`
		WHERE album_resource.`cover_asset_id` = OLD.`id`
			AND album_resource.`type` = 'album'
			AND album_resource.`status` = 'published'
			AND album_resource.`visibility` = 'public'
			AND album_revision.`visibility` = 'public'
	)
	OR EXISTS (
		SELECT 1 FROM `tracks` AS track
		JOIN `resources` AS track_resource ON track_resource.`id` = track.`resource_id`
		JOIN `resource_revisions` AS track_revision
			ON track_revision.`id` = track_resource.`published_revision_id`
		JOIN `resources` AS album_resource ON album_resource.`id` = track.`album_resource_id`
					JOIN `resource_albums` AS album_projection ON album_projection.`resource_id` = album_resource.`id`
		JOIN `resource_revisions` AS album_revision
			ON album_revision.`id` = album_resource.`published_revision_id`
		WHERE track.`audio_asset_id` = OLD.`id`
			AND track_resource.`type` = 'track'
			AND track_resource.`status` = 'published'
			AND track_resource.`visibility` = 'public'
			AND track_revision.`visibility` = 'public'
			AND album_resource.`type` = 'album'
			AND album_resource.`status` = 'published'
			AND album_resource.`visibility` = 'public'
			AND album_revision.`visibility` = 'public'
	)
BEGIN
	INSERT INTO `public_content_rebuild_signal` (`reason`, `resource_id`)
	VALUES ('public-asset-deleted', NULL);
END;

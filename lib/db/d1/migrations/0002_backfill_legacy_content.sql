-- Idempotent bridge from the legacy CMS tables into the platform model.
-- Existing platform rows are never overwritten, so re-running this migration
-- cannot destroy revisions created by the unified Studio.

INSERT OR IGNORE INTO `assets` (
  `id`, `key`, `url`, `name`, `media_type`, `mime_type`, `size`,
  `metadata_json`, `created_at`, `updated_at`
)
SELECT
  'asset:' || `id`,
  CASE
    WHEN instr(`url`, '.r2.dev/') > 0
      THEN substr(`url`, instr(`url`, '.r2.dev/') + 8)
    ELSE 'legacy-media/' || `id`
  END,
  `url`,
  `name`,
  CASE
    WHEN `type` LIKE 'image/%' THEN 'image'
    WHEN `type` LIKE 'audio/%' THEN 'audio'
    WHEN `type` LIKE 'video/%' THEN 'video'
    WHEN `type` IN ('application/zip', 'application/x-tar', 'application/gzip') THEN 'archive'
    WHEN `type` LIKE 'application/%' OR `type` LIKE 'text/%' THEN 'document'
    ELSE 'other'
  END,
  `type`,
  `size`,
  json_object('legacyMediaId', `id`),
  `created_at`,
  `created_at`
FROM `media`;

INSERT OR IGNORE INTO `resources` (
  `id`, `type`, `title`, `slug`, `path`, `description`, `status`,
  `visibility`, `current_revision_id`, `published_revision_id`, `author_id`,
  `published_at`, `created_at`, `updated_at`
)
SELECT
  'article:' || `id`,
  'article',
  `title`,
  `slug`,
  '/blog/' || trim(`slug`, '/'),
  coalesce(`excerpt`, `subtitle`),
  CASE WHEN `draft` = 1 THEN 'draft' ELSE 'published' END,
  'public',
  'revision:article:' || `id` || ':1',
  CASE WHEN `draft` = 1 THEN NULL ELSE 'revision:article:' || `id` || ':1' END,
  `author_id`,
  CASE WHEN `draft` = 1 THEN NULL ELSE `pub_date` END,
  `created_at`,
  `updated_at`
FROM `posts`;

INSERT OR IGNORE INTO `resource_revisions` (
  `id`, `resource_id`, `version`, `title`, `slug`, `path`, `description`,
  `visibility`, `content`, `content_format`, `metadata_json`, `change_summary`,
  `created_by`, `created_at`
)
SELECT
  'revision:article:' || `id` || ':1',
  'article:' || `id`,
  1,
  `title`,
  `slug`,
  '/blog/' || trim(`slug`, '/'),
  coalesce(`excerpt`, `subtitle`),
  'public',
  `content`,
  'markdown',
  json_object(
    'legacyPostId', `id`,
    'subtitle', `subtitle`,
    'ogImage', `og_image`,
    'radio', json(CASE WHEN `radio` = 1 THEN 'true' ELSE 'false' END),
    'video', json(CASE WHEN `video` = 1 THEN 'true' ELSE 'false' END),
    'platform', `platform`,
    'categoryId', `category_id`,
    'tagIds', json(coalesce((
      SELECT json_group_array(pt.`tag_id`)
      FROM `post_tags` pt
      WHERE pt.`post_id` = `posts`.`id`
    ), '[]')),
    'toc', json(CASE WHEN `toc` = 1 THEN 'true' ELSE 'false' END),
    'share', json(CASE WHEN `share` = 1 THEN 'true' ELSE 'false' END),
    'giscus', json(CASE WHEN `giscus` = 1 THEN 'true' ELSE 'false' END),
    'search', json(CASE WHEN `search` = 1 THEN 'true' ELSE 'false' END),
    'minutesRead', `minutes_read`
  ),
  'Imported from the legacy posts table',
  `author_id`,
  `updated_at`
FROM `posts`;

INSERT OR IGNORE INTO `articles` (
  `resource_id`, `toc`, `share`, `giscus`, `searchable`, `reading_minutes`
)
SELECT
  'article:' || `id`, `toc`, `share`, `giscus`, `search`, `minutes_read`
FROM `posts`;

INSERT OR IGNORE INTO `resource_routes` (`path`, `resource_id`, `canonical`, `created_at`)
SELECT
  '/blog/' || trim(`slug`, '/'),
  'article:' || `id`,
  1,
  `created_at`
FROM `posts`;

INSERT OR IGNORE INTO `resource_categories` (`resource_id`, `category_id`)
SELECT 'article:' || `id`, `category_id`
FROM `posts`
WHERE `category_id` IS NOT NULL;

INSERT OR IGNORE INTO `resource_tags` (`resource_id`, `tag_id`)
SELECT 'article:' || `post_id`, `tag_id`
FROM `post_tags`;

INSERT OR IGNORE INTO `resources` (
  `id`, `type`, `title`, `slug`, `path`, `description`, `status`,
  `visibility`, `cover_asset_id`, `current_revision_id`, `published_revision_id`,
  `published_at`, `created_at`, `updated_at`
)
SELECT
  'album:' || a.`id`,
  'album',
  a.`name`,
  a.`slug`,
  '/music/albums/' || trim(a.`slug`, '/'),
  a.`description`,
  CASE WHEN a.`published` = 1 THEN 'published' ELSE 'draft' END,
  'public',
  (SELECT 'asset:' || m.`id` FROM `media` m WHERE m.`url` = a.`cover` LIMIT 1),
  'revision:album:' || a.`id` || ':1',
  CASE WHEN a.`published` = 1 THEN 'revision:album:' || a.`id` || ':1' ELSE NULL END,
  CASE WHEN a.`published` = 1 THEN coalesce(a.`release_date`, a.`created_at`) ELSE NULL END,
  a.`created_at`,
  a.`updated_at`
FROM `albums` a;

INSERT OR IGNORE INTO `resource_revisions` (
  `id`, `resource_id`, `version`, `title`, `slug`, `path`, `description`,
  `visibility`, `content`, `content_format`, `metadata_json`, `change_summary`,
  `created_at`
)
SELECT
  'revision:album:' || `id` || ':1',
  'album:' || `id`,
  1,
  `name`,
  `slug`,
  '/music/albums/' || trim(`slug`, '/'),
  `description`,
  'public',
  coalesce(`description`, ''),
  'markdown',
  json_object('legacyAlbumId', `id`, 'cover', `cover`),
  'Imported from the legacy albums table',
  `updated_at`
FROM `albums`;

INSERT OR IGNORE INTO `resource_albums` (
  `resource_id`, `artist`, `color`, `release_date`, `sort_order`
)
SELECT 'album:' || `id`, `artist`, `color`, `release_date`, `order`
FROM `albums`;

INSERT OR IGNORE INTO `resource_routes` (`path`, `resource_id`, `canonical`, `created_at`)
SELECT
  '/music/albums/' || trim(`slug`, '/'),
  'album:' || `id`,
  1,
  `created_at`
FROM `albums`;

INSERT OR IGNORE INTO `resources` (
  `id`, `type`, `title`, `slug`, `path`, `description`, `status`,
  `visibility`, `current_revision_id`, `published_revision_id`, `published_at`,
  `created_at`, `updated_at`
)
SELECT
  'track:' || s.`id`,
  'track',
  s.`name`,
  s.`id`,
  '/music/tracks/' || s.`id`,
  NULL,
  CASE WHEN a.`published` = 1 THEN 'published' ELSE 'draft' END,
  'public',
  'revision:track:' || s.`id` || ':1',
  CASE WHEN a.`published` = 1 THEN 'revision:track:' || s.`id` || ':1' ELSE NULL END,
  CASE WHEN a.`published` = 1 THEN coalesce(a.`release_date`, s.`created_at`) ELSE NULL END,
  s.`created_at`,
  s.`created_at`
FROM `songs` s
JOIN `albums` a ON a.`id` = s.`album_id`;

INSERT OR IGNORE INTO `resource_revisions` (
  `id`, `resource_id`, `version`, `title`, `slug`, `path`, `visibility`,
  `content`, `content_format`, `metadata_json`, `change_summary`, `created_at`
)
SELECT
  'revision:track:' || `id` || ':1',
  'track:' || `id`,
  1,
  `name`,
  `id`,
  '/music/tracks/' || `id`,
  'public',
  coalesce(`lyrics`, ''),
  'text',
  json_object('legacySongId', `id`),
  'Imported from the legacy songs table',
  `created_at`
FROM `songs`;

INSERT OR IGNORE INTO `tracks` (
  `resource_id`, `album_resource_id`, `audio_asset_id`, `external_url`,
  `source_type`, `duration`, `duration_seconds`, `track_number`, `lyrics`
)
SELECT
  'track:' || s.`id`,
  'album:' || s.`album_id`,
  (SELECT 'asset:' || m.`id` FROM `media` m WHERE m.`url` = s.`url` LIMIT 1),
  s.`external_url`,
  s.`source_type`,
  s.`duration`,
  s.`duration_seconds`,
  s.`track_number`,
  s.`lyrics`
FROM `songs` s;

INSERT OR IGNORE INTO `resource_relations` (
  `source_resource_id`, `target_resource_id`, `relation_type`, `sort_order`
)
SELECT
  'track:' || `id`,
  'album:' || `album_id`,
  'part_of',
  `track_number`
FROM `songs`;

INSERT OR IGNORE INTO `resource_routes` (`path`, `resource_id`, `canonical`, `created_at`)
SELECT '/music/tracks/' || `id`, 'track:' || `id`, 1, `created_at`
FROM `songs`;

-- FTS virtual tables do not have a unique constraint, so explicitly remove
-- seeded rows before rebuilding the searchable projection.
DELETE FROM `resource_search`
WHERE `resource_id` IN (
  SELECT `id` FROM `resources`
  WHERE `type` IN ('article', 'album', 'track')
);

INSERT INTO `resource_search` (`resource_id`, `title`, `description`, `content`, `tokens`)
SELECT
  r.`id`,
  rev.`title`,
  coalesce(rev.`description`, ''),
  rev.`content`,
  lower(rev.`title` || ' ' || coalesce(rev.`description`, ''))
FROM `resources` r
JOIN `resource_revisions` rev ON rev.`id` = r.`published_revision_id`
WHERE r.`status` = 'published'
  AND r.`visibility` IN ('public', 'unlisted')
  AND r.`type` IN ('article', 'album', 'track');

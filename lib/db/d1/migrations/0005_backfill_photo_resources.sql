-- Promote legacy image media into first-class public photo resources while
-- keeping the Asset row as the R2 object authority.

INSERT OR IGNORE INTO `resources` (
  `id`, `type`, `title`, `slug`, `path`, `description`, `status`,
  `visibility`, `cover_asset_id`, `current_revision_id`,
  `published_revision_id`, `published_at`, `created_at`, `updated_at`
)
SELECT
  'photo:' || m.`id`,
  'photo',
  '影像 · ' || strftime('%Y-%m-%d', m.`created_at`, 'unixepoch') || ' · ' || upper(substr(m.`id`, 1, 6)),
  m.`id`,
  '/photos/' || m.`id`,
  NULL,
  'published',
  'public',
  'asset:' || m.`id`,
  'revision:photo:' || m.`id` || ':1',
  'revision:photo:' || m.`id` || ':1',
  m.`created_at`,
  m.`created_at`,
  m.`created_at`
FROM `media` m
WHERE m.`type` LIKE 'image/%';

INSERT OR IGNORE INTO `resource_revisions` (
  `id`, `resource_id`, `version`, `title`, `slug`, `path`, `visibility`,
  `content`, `content_format`, `metadata_json`, `change_summary`, `created_at`
)
SELECT
  'revision:photo:' || m.`id` || ':1',
  'photo:' || m.`id`,
  1,
  '影像 · ' || strftime('%Y-%m-%d', m.`created_at`, 'unixepoch') || ' · ' || upper(substr(m.`id`, 1, 6)),
  m.`id`,
  '/photos/' || m.`id`,
  'public',
  '',
  'markdown',
  json_object(
    'legacyMediaId', m.`id`,
    'originalName', m.`name`,
    'assetId', 'asset:' || m.`id`,
    'url', m.`url`,
    'mimeType', m.`type`
  ),
  'Imported from the legacy media table',
  m.`created_at`
FROM `media` m
WHERE m.`type` LIKE 'image/%';

INSERT OR IGNORE INTO `resource_routes` (`path`, `resource_id`, `canonical`, `created_at`)
SELECT '/photos/' || m.`id`, 'photo:' || m.`id`, 1, m.`created_at`
FROM `media` m
WHERE m.`type` LIKE 'image/%';

INSERT OR IGNORE INTO `resource_assets` (`resource_id`, `asset_id`, `role`, `sort_order`)
SELECT 'photo:' || m.`id`, 'asset:' || m.`id`, 'cover', 0
FROM `media` m
WHERE m.`type` LIKE 'image/%';

DELETE FROM `resource_search`
WHERE `resource_id` IN (SELECT `id` FROM `resources` WHERE `type` = 'photo');

INSERT INTO `resource_search` (`resource_id`, `title`, `description`, `content`, `tokens`)
SELECT
  r.`id`, rev.`title`, coalesce(rev.`description`, ''), rev.`content`, lower(rev.`title`)
FROM `resources` r
JOIN `resource_revisions` rev ON rev.`id` = r.`published_revision_id`
WHERE r.`type` = 'photo' AND r.`status` = 'published';

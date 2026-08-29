-- Rebuild the published search projection after article revision metadata was
-- enriched. Articles with search=false stay publicly addressable but are not
-- discoverable through FTS.
DELETE FROM `resource_search`;

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
  AND (
    r.`type` <> 'article'
    OR coalesce(json_extract(rev.`metadata_json`, '$.search'), 1) = 1
  );

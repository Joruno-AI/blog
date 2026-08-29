-- Enrich revisions created by the legacy bridge with every public article
-- projection field. New Studio revisions already carry these values. Keeping
-- them on the revision prevents an unpublished Studio edit from leaking
-- taxonomy or display settings into the public API.

UPDATE `resource_revisions`
SET `metadata_json` = json_set(
  `metadata_json`,
  '$.categoryId', (
    SELECT rc.`category_id`
    FROM `resource_categories` rc
    WHERE rc.`resource_id` = `resource_revisions`.`resource_id`
    ORDER BY rc.`category_id`
    LIMIT 1
  ),
  '$.tagIds', json(coalesce((
    SELECT json_group_array(rt.`tag_id`)
    FROM `resource_tags` rt
    WHERE rt.`resource_id` = `resource_revisions`.`resource_id`
  ), '[]')),
  '$.toc', json(CASE WHEN coalesce((
    SELECT a.`toc` FROM `articles` a
    WHERE a.`resource_id` = `resource_revisions`.`resource_id`
  ), 1) = 1 THEN 'true' ELSE 'false' END),
  '$.share', json(CASE WHEN coalesce((
    SELECT a.`share` FROM `articles` a
    WHERE a.`resource_id` = `resource_revisions`.`resource_id`
  ), 1) = 1 THEN 'true' ELSE 'false' END),
  '$.giscus', json(CASE WHEN coalesce((
    SELECT a.`giscus` FROM `articles` a
    WHERE a.`resource_id` = `resource_revisions`.`resource_id`
  ), 1) = 1 THEN 'true' ELSE 'false' END),
  '$.search', json(CASE WHEN coalesce((
    SELECT a.`searchable` FROM `articles` a
    WHERE a.`resource_id` = `resource_revisions`.`resource_id`
  ), 1) = 1 THEN 'true' ELSE 'false' END),
  '$.minutesRead', (
    SELECT a.`reading_minutes` FROM `articles` a
    WHERE a.`resource_id` = `resource_revisions`.`resource_id`
  )
)
WHERE `resource_id` IN (
  SELECT `id` FROM `resources` WHERE `type` = 'article'
)
AND json_type(`metadata_json`, '$.categoryId') IS NULL;

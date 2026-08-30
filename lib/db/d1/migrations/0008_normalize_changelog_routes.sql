-- Astro removes periods from changelog route params (`3.0.0.md` -> `/changelog/300`).
-- Normalize previously imported document identities without touching their IDs,
-- publication pointers, or history. The statements are intentionally idempotent.

UPDATE `resource_routes`
SET `path` = replace(`path`, '.', '')
WHERE `resource_id` IN (
	SELECT `resource_id`
	FROM `documents`
	WHERE `source_path` LIKE 'src/content/changelog/%'
)
AND `path` LIKE '/changelog/%';

UPDATE `resource_revisions`
SET
	`slug` = replace(`slug`, '.', ''),
	`path` = replace(`path`, '.', ''),
	`metadata_json` = json_set(`metadata_json`, '$.ogImage', json('false'))
WHERE `resource_id` IN (
	SELECT `resource_id`
	FROM `documents`
	WHERE `source_path` LIKE 'src/content/changelog/%'
);

UPDATE `resources`
SET
	`slug` = replace(`slug`, '.', ''),
	`path` = replace(`path`, '.', '')
WHERE `id` IN (
	SELECT `resource_id`
	FROM `documents`
	WHERE `source_path` LIKE 'src/content/changelog/%'
);

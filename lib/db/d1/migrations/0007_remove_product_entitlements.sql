-- The unified project intentionally ships the existing publishing features
-- without a product, membership, or entitlement domain.
UPDATE resource_revisions SET visibility = 'private' WHERE visibility IN ('member', 'paid');
UPDATE resources SET visibility = 'private' WHERE visibility IN ('member', 'paid');

DELETE FROM resources WHERE type = 'product';

DROP TABLE IF EXISTS entitlements;
DROP TABLE IF EXISTS product_items;
DROP TABLE IF EXISTS products;

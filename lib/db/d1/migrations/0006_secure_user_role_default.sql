-- The legacy CMS schema defaulted new users to `editor`. Better Auth now
-- writes `viewer` explicitly and rejects role input, while this trigger keeps
-- direct/default inserts fail-closed on databases created from the old schema.
CREATE TRIGGER IF NOT EXISTS `user_default_role_viewer`
AFTER INSERT ON `user`
WHEN NEW.`role` = 'editor'
BEGIN
  UPDATE `user`
  SET `role` = 'viewer'
  WHERE `id` = NEW.`id`;
END;

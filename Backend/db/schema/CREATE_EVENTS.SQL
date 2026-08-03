CREATE EVENT IF NOT EXISTS ev_cleanup_expired_user_permissions
ON SCHEDULE EVERY 1 MINUTE
DO
  DELETE FROM user_permission
  WHERE valid_to IS NOT NULL
    AND valid_to < NOW();
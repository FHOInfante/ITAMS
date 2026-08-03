CREATE INDEX idx_auditlog_type_date
    ON audit_log (interaction_type, interaction_date DESC);

CREATE INDEX idx_auditlog_target_date
    ON audit_log (target_table, target_id, interaction_date DESC);

CREATE INDEX idx_auditlog_date
    ON audit_log (interaction_date DESC);

CREATE INDEX idx_category_group_value
    ON category (category_group, category_value);

CREATE INDEX idx_computer_received_date
    ON computer (received_date);

CREATE INDEX idx_software_expiry_date
    ON software (expiry_date);

CREATE INDEX idx_software_purchase_date
    ON software (purchase_date);

CREATE INDEX idx_userpermission_temp_validto
    ON user_permission (is_temporary, valid_to);

CREATE INDEX idx_ups_received_date
    ON ups (received_date);

CREATE INDEX idx_netdevice_received_date
    ON network_device (received_date);

CREATE INDEX idx_printer_received_date
    ON printer (received_date);
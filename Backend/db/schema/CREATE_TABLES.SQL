CREATE TABLE IF NOT EXISTS user (
    user_id     INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    user_name   VARCHAR(255),
    user_email  VARCHAR(255) UNIQUE,
    user_emp_id INT(5) UNSIGNED ZEROFILL UNIQUE NOT NULL,
    user_role   VARCHAR(32) DEFAULT 'IT Helpdesk',
    user_status VARCHAR(16) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS user_credential (
    user_credential_id  INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    user_id             INT(5) UNSIGNED ZEROFILL NOT NULL,
    user_username       VARCHAR(255) UNIQUE NOT NULL,
    password_hash       VARCHAR(255),
    is_password_default BOOLEAN NOT NULL DEFAULT TRUE,

    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS permission (
    permission_id   INT(2) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    permission_name VARCHAR(64) NOT NULL UNIQUE,
    permission_desc VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS user_permission (
    user_id         INT(5) UNSIGNED ZEROFILL NOT NULL,
    permission_id   INT(2) UNSIGNED ZEROFILL NOT NULL,
    valid_from      DATETIME NULL DEFAULT NULL,
    valid_to        DATETIME NULL DEFAULT NULL,
    is_temporary    BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, permission_id),

    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permission(permission_id) ON DELETE CASCADE,

    CONSTRAINT chk_valid_range CHECK (
        valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from
    ),
    CONSTRAINT chk_temporary_has_dates CHECK (
        is_temporary = FALSE OR (valid_from IS NOT NULL AND valid_to IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS department (
    department_id   INT(2) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS end_user (
    eu_id           INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    eu_name         VARCHAR(255),
    eu_emp_id       INT(5) UNSIGNED ZEROFILL NOT NULL UNIQUE,
    eu_division     VARCHAR(64),
    eu_department   INT(2) UNSIGNED ZEROFILL NOT NULL,
    eu_location     VARCHAR(8),
    eu_email        VARCHAR(255) UNIQUE,
    eu_contact_no   VARCHAR(32),
    eu_status       VARCHAR(16) DEFAULT 'Active',

    FOREIGN KEY (eu_department) REFERENCES department(department_id)
);

CREATE TABLE IF NOT EXISTS computer (
    computer_id             INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    computer_name           VARCHAR(64),
    asset_tag               VARCHAR(64) UNIQUE,
    serial_no               VARCHAR(64) NOT NULL UNIQUE,
    model                   VARCHAR(64),
    brand                   VARCHAR(64),
    device_type             VARCHAR(64),
    operating_system        VARCHAR(64),
    computer_status         VARCHAR(16) DEFAULT 'Spare',
    asset_condition         VARCHAR(16) DEFAULT 'New',
    received_date           DATE,
    warranty_expiry         DATE,
    vendor                  VARCHAR(255),
    assigned_user           INT(5) UNSIGNED ZEROFILL,
    assigned_date           DATE,
    to_return_by            DATE DEFAULT NULL,
    processor               VARCHAR(128),
    ram_size                VARCHAR(32),
    storage_type            VARCHAR(16),
    storage_capacity        VARCHAR(32),
    ip_address              VARCHAR(45),
    mac_address             VARCHAR(17),
    network_connectivity    VARCHAR(16),
    has_vpn_access          BOOLEAN DEFAULT FALSE,
    anydesk_ip              VARCHAR(45),
    remarks                 TEXT,
    cost                    DECIMAL(12, 2),

    FOREIGN KEY (assigned_user) REFERENCES end_user(eu_id)
);

CREATE TABLE IF NOT EXISTS software (
    software_id         INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    software_name       VARCHAR(128),
    vendor              VARCHAR(255),
    license_type        VARCHAR(64),
    purchase_date       DATE,
    subscription_id     VARCHAR(128),
    renewal_date        DATE,
    expiry_date         DATE,
    cost                DECIMAL(12, 2),
    previous_cost       DECIMAL(12, 2),
    software_status     VARCHAR(20) DEFAULT 'Active',
    remarks             TEXT,
    assigned_user       INT(5) UNSIGNED ZEROFILL,
    assigned_date       DATE,

    FOREIGN KEY (assigned_user) REFERENCES end_user(eu_id)
);

CREATE TABLE IF NOT EXISTS peripheral (
    peripheral_id   INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    peripheral_name VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS computer_peripheral (
    computer_id     INT(5) UNSIGNED ZEROFILL NOT NULL,
    peripheral_id   INT(5) UNSIGNED ZEROFILL NOT NULL,
    PRIMARY KEY (computer_id, peripheral_id),

    FOREIGN KEY (computer_id) REFERENCES computer(computer_id) ON DELETE CASCADE,
    FOREIGN KEY (peripheral_id) REFERENCES peripheral(peripheral_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS program (
    program_id      INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    program_name    VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS computer_program (
    computer_id     INT(5) UNSIGNED ZEROFILL NOT NULL,
    program_id      INT(5) UNSIGNED ZEROFILL NOT NULL,
    PRIMARY KEY(computer_id, program_id),

    FOREIGN KEY (computer_id) REFERENCES computer(computer_id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES program(program_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS category (
    category_id     INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    category_group  VARCHAR(64) NOT NULL,
    category_value  VARCHAR(128) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,

    UNIQUE (category_group, category_value)
);

CREATE TABLE IF NOT EXISTS audit_log (
    audit_log_id        INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
    user_id             INT(5) UNSIGNED ZEROFILL NOT NULL,
    interaction_date    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    interaction_type    VARCHAR(64),
    target_table        VARCHAR(64)         NULL DEFAULT NULL,
    target_id           INT UNSIGNED        NULL DEFAULT NULL,
    interaction_detail  TEXT,

    FOREIGN KEY (user_id) REFERENCES user(user_id)
);

CREATE TABLE IF NOT EXISTS audit_log_detail (
    detail_id           INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
    audit_log_id        INT UNSIGNED        NOT NULL,
    snapshot_before     LONGTEXT,
    snapshot_after      LONGTEXT,

    FOREIGN KEY (audit_log_id) REFERENCES audit_log(audit_log_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS network_device (
    network_device_id   INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    network_device_name VARCHAR(64),
    asset_tag           VARCHAR(64) UNIQUE,
    asset_location      VARCHAR(8),
    serial_no           VARCHAR(64) NOT NULL UNIQUE,
    brand               VARCHAR(64),
    vendor              VARCHAR(255),
    model               VARCHAR(64),
    device_type         VARCHAR(64),
    ip_address          VARCHAR(45),
    mac_address         VARCHAR(17),
    port_count          TINYINT UNSIGNED,
    firmware_version    VARCHAR(64),
    asset_status        VARCHAR(16) DEFAULT 'Spare',
    asset_condition     VARCHAR(16) DEFAULT 'New',
    received_date       DATE,
    warranty_expiry     DATE,
    date_deployed       DATE,
    cost                DECIMAL(12, 2),
    remarks             TEXT
);

CREATE TABLE IF NOT EXISTS printer (
    printer_id          INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    printer_name        VARCHAR(64),
    department          INT(2) UNSIGNED ZEROFILL NOT NULL,
    asset_tag           VARCHAR(64) UNIQUE,
    asset_location      VARCHAR(8),
    serial_no           VARCHAR(64) NOT NULL UNIQUE,
    brand               VARCHAR(64),
    vendor              VARCHAR(255),
    model               VARCHAR(64),
    printer_type        VARCHAR(64),
    connectivity        VARCHAR(16),
    ip_address          VARCHAR(45),
    mac_address         VARCHAR(17),
    is_color            BOOLEAN DEFAULT FALSE,
    asset_status        VARCHAR(16) DEFAULT 'Spare',
    asset_condition     VARCHAR(16) DEFAULT 'New',
    received_date       DATE,
    warranty_expiry     DATE,
    date_deployed       DATE,
    cost                DECIMAL(12, 2),
    remarks             TEXT,

    FOREIGN KEY (department) REFERENCES department(department_id)
);

CREATE TABLE IF NOT EXISTS ups (
    ups_id              INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    computer_assigned_to INT(5) UNSIGNED ZEROFILL,
    asset_tag           VARCHAR(64) UNIQUE,
    serial_no           VARCHAR(64) NOT NULL UNIQUE,
    brand               VARCHAR(64),
    vendor              VARCHAR(255),
    model               VARCHAR(64),
    capacity_va         SMALLINT UNSIGNED,
    battery_replace_date DATE,
    asset_status        VARCHAR(16) DEFAULT 'Spare',
    asset_condition     VARCHAR(16) DEFAULT 'New',
    received_date       DATE,
    warranty_expiry     DATE,
    date_deployed       DATE,
    cost                DECIMAL(12, 2),
    remarks             TEXT,

    FOREIGN KEY (computer_assigned_to) REFERENCES computer(computer_id)
);

CREATE TABLE IF NOT EXISTS purchase_request (
    pr_id               INT(5) UNSIGNED ZEROFILL AUTO_INCREMENT PRIMARY KEY,
    pr_no               INT(12) NOT NULL UNIQUE,
    pr_status           VARCHAR(20) DEFAULT 'In Process',
    date_requested      DATE,
    date_received       DATE,
    requested_by        VARCHAR(255),
    received_by         VARCHAR(255),
    remarks             TEXT
);

CREATE TABLE IF NOT EXISTS purchase_request_item (
    item_id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pr_id               INT(5) UNSIGNED ZEROFILL NOT NULL,
    item_description    TEXT,
    item_quantity       SMALLINT UNSIGNED DEFAULT 1,
    item_status         VARCHAR(20) DEFAULT 'In Process',
    unit_price          DECIMAL(10, 2) UNSIGNED DEFAULT 0.00,
    CONSTRAINT fk_pr_item FOREIGN KEY (pr_id) REFERENCES purchase_request(pr_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor (
    vendor_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vendor_name     VARCHAR(255) NOT NULL UNIQUE
);
-- ============================================================
--  Initialize Permission List Based on User Permission Matrix
-- ============================================================
INSERT INTO permission (permission_id, permission_name, permission_desc) VALUES
-- View Audit Trails
(1,  'View Audit Trails - Computer',             'User is able to view audit trail logs for computer assets.'),
(2,  'View Audit Trails - Software',             'User is able to view audit trail logs for software assets.'),
(3,  'View Audit Trails - Printer',              'User is able to view audit trail logs for printer assets.'),
(4,  'View Audit Trails - UPS',                  'User is able to view audit trail logs for UPS assets.'),
(5,  'View Audit Trails - Network Device',       'User is able to view audit trail logs for network device assets.'),
(6,  'View Audit Trails - System',               'User is able to view system-level audit trail logs.'),
-- Manage PR (View)
(7,  'View Purchase Requests',                   'User is able to view purchase requests in the system.'),
-- Administrative (View)
(8,  'View System Users',                        'User is able to view system user accounts.'),
-- Add Asset
(9,  'Add Asset - Computer',                     'User is able to add computer assets to the system.'),
(10, 'Add Asset - Software',                     'User is able to add software license records to the system.'),
(11, 'Add Asset - Printer',                      'User is able to add printer assets to the system.'),
(12, 'Add Asset - UPS',                          'User is able to add UPS assets to the system.'),
(13, 'Add Asset - Network Device',               'User is able to add network device assets to the system.'),
-- Manage PR
(14, 'Create Purchase Requests',                 'User is able to create new purchase requests.'),
-- File Maintenance (Add)
(15, 'Add New Department',                       'User is able to add new department records.'),
(16, 'Add New Peripheral',                       'User is able to add new peripheral records.'),
(17, 'Add New Program',                          'User is able to add new program entries.'),
(18, 'Add New Dropdown Option',                  'User is able to add new dropdown/category options.'),
(19, 'Add New Vendor',                           'User is able to add new vendor records.'),
-- Manage End User (Add)
(20, 'Add New End Users',                        'User is able to add new end user records.'),
-- Administrative (Add)
(21, 'Add New System User',                      'User is able to create new system user accounts.'),
-- Assign Asset
(22, 'Assign Asset - Computer',                  'User is able to assign and unassign computers to end users.'),
(23, 'Assign Asset - Software',                  'User is able to assign and unassign software licenses to end users.'),
-- Edit Asset
(24, 'Edit Asset - Computer',                    'User is able to edit computer asset information.'),
(25, 'Edit Asset - Software',                    'User is able to edit software license records.'),
(26, 'Edit Asset - Printer',                     'User is able to edit printer asset information.'),
(27, 'Edit Asset - UPS',                         'User is able to edit UPS asset information.'),
(28, 'Edit Asset - Network Device',              'User is able to edit network device asset information.'),
-- Edit Network Fields
(29, 'Edit Asset - Computer (Network Fields)',   'User is able to edit network-related fields of computer assets.'),
(30, 'Edit Asset - Printer (Network Fields)',    'User is able to edit network-related fields of printer assets.'),
-- File Maintenance (Edit)
(31, 'Edit Department Details',                  'User is able to edit existing department records.'),
(32, 'Edit Peripheral Details',                  'User is able to edit existing peripheral records.'),
(33, 'Edit Program Details',                     'User is able to edit existing program entries.'),
(34, 'Edit Dropdown Option Status',              'User is able to activate or deactivate dropdown/category options.'),
(35, 'Edit Vendor Details',                      'User is able to edit existing vendor records.'),
-- Manage End User (Edit)
(36, 'Edit End User Details',                    'User is able to edit existing end user records.'),
-- Manage PR (Edit)
(37, 'Edit Purchase Requests',                   'User is able to edit existing purchase requests and their line items.'),
-- Administrative (Edit)
(38, 'Edit System User Account',                 'User is able to edit system user account details and roles.'),
-- Administrative (Special Access)
(39, 'Grant Special Access',                     'User is able to grant temporary or special permissions to other system users.'),
(40, 'Revoke Special Access',                    'User is able to revoke temporary or special permissions from system users.'),
(41, 'Reset System User Password',               'User is able to reset passwords for system user accounts.'),
-- Administrative (Reports)
(42, 'Generate Report',                          'User is able to generate and download asset reports.');

-- ============================================================
--  Initialize Department List
-- ============================================================
INSERT INTO department (department_name) VALUES
("Facilities Management Department"),
("Hemodialysis Department"),
("Physical Medicine and Rehabilitation Department"),
("Outpatient Department"),
("OSH Clinic"),
("Billing Department"),
("Cashier Department"),
("Admission Department"),
("Eye Center Department"),
("Emergency Department"),
("Laboratory Department"),
("Heart Station Department"),
("IT Department"),
("ENT Department"),
("CathLab Department"),
("ICU Department"),
("OR/DR Department"),
("CPU Department"),
("CCU Department"),
("CVU Department"),
("NICU Department"),
("GNU5th Department"),
("GNU6th Department"),
("GNU7th Department"),
("Wellness Department"),
("MSG Department");

-- ============================================================
--  Initialize Super Admin User
-- ============================================================
INSERT INTO user (user_id, user_name, user_email, user_emp_id, user_role) VALUES
(1, 'Admin User', 'admin_user@email.com', 0, 'IT Manager');

INSERT INTO user_credential (user_id, user_username, password_hash, is_password_default) VALUES
(1, 'admin', '$2b$10$WDOkDkaIPw7vj3AjUDEwfOJToy96FtFIWIOuuERPEz/LcdQBjN2za', 0);

INSERT INTO user_permission (user_id, permission_id) VALUES
(1,  1),(1,  2),(1,  3),(1,  4),(1,  5),
(1,  6),(1,  7),(1,  8),(1,  9),(1, 10),
(1, 11),(1, 12),(1, 13),(1, 14),(1, 15),
(1, 16),(1, 17),(1, 18),(1, 19),(1, 20),
(1, 21),(1, 22),(1, 23),(1, 24),(1, 25),
(1, 26),(1, 27),(1, 28),(1, 29),(1, 30),
(1, 31),(1, 32),(1, 33),(1, 34),(1, 35),
(1, 36),(1, 37),(1, 38),(1, 39),(1, 40),
(1, 41),(1, 42);

-- ============================================================
--  Initialize Values for Dropdown Options / File Maintenance
-- ============================================================
INSERT INTO peripheral (peripheral_id, peripheral_name) VALUES
(1, 'Mouse'),
(2, 'Keyboard'),
(3, 'Monitor');

INSERT INTO program (program_id, program_name) VALUES
(1, 'Microsoft Office 365'),
(2, 'Microsoft Teams'),
(3, 'BizBox'),
(4, 'AnyDesk');

INSERT INTO category (category_id, category_group, category_value) VALUES
(1, 'computer.brand', 'Asus'),
(2, 'computer.brand', 'Lenovo'),
(3, 'computer.brand', 'HP'),
(4, 'computer.brand', 'Dell'),
(5, 'computer.device_type', 'Laptop'),
(6, 'computer.device_type', 'PC'),
(7, 'computer.device_type', 'AIO'),
(8, 'computer.ram_size', '8GB'),
(9, 'computer.ram_size', '16GB'),
(10, 'computer.ram_size', '32GB'),
(11, 'computer.storage_type', 'HDD'),
(12, 'computer.storage_type', 'SSD'),
(13, 'computer.storage_type', 'M.2'),
(14, 'computer.storage_capacity', '256GB'),
(15, 'computer.storage_capacity', '512GB'),
(16, 'computer.storage_capacity', '1TB'),
(17, 'computer.storage_capacity', '2TB'),
(18, 'printer.brand', 'HP'),
(19, 'printer.brand', 'Canon'),
(20, 'printer.brand', 'Epson'),
(21, 'printer.brand', 'Brother'),
(22, 'printer.printer_type', 'Inkjet'),
(23, 'printer.printer_type', 'Laser'),
(24, 'network_device.device_type', 'Router'),
(25, 'network_device.device_type', 'Switch'),
(26, 'network_device.device_type', 'Firewall'),
(27, 'software.license_type', 'Perpetual'),
(28, 'software.license_type', 'Subscription');
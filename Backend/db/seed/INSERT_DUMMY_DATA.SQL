-- ============================================================
--  Vendors (25)
-- ============================================================
INSERT INTO vendor (vendor_id, vendor_name) VALUES
(1,  'TechSource Philippines Inc.'),
(2,  'Digital Hub Solutions Corp.'),
(3,  'MedTech Supply Co.'),
(4,  'ClearPath IT Distributors'),
(5,  'ProNet Systems Philippines'),
(6,  'Pinnacle Hardware Solutions'),
(7,  'Horizon IT Supply Chain'),
(8,  'BlueStar Technology Corp.'),
(9,  'Apex Office Supplies Inc.'),
(10, 'FastLane Network Solutions'),
(11, 'CoreTech Philippines'),
(12, 'DataBridge IT Corp.'),
(13, 'SilverLine Computers Inc.'),
(14, 'Nexus IT Distribution'),
(15, 'PrimeTech Supply Co.'),
(16, 'AlphaNet Solutions Corp.'),
(17, 'BrightEdge IT Philippines'),
(18, 'Vertex Computer Systems'),
(19, 'TrueLink Network Corp.'),
(20, 'Catalyst Technology Inc.'),
(21, 'OmniTech Distributors'),
(22, 'SpeedNet IT Supply'),
(23, 'CloudBridge Philippines Inc.'),
(24, 'UniSource Technology Corp.'),
(25, 'IronCast IT Solutions');
 
-- ============================================================
--  End Users (25)
-- ============================================================
INSERT INTO end_user (eu_id, eu_name, eu_emp_id, eu_division, eu_department, eu_location, eu_email, eu_contact_no, eu_status) VALUES
(1,  'Maria Santos',        10001, 'Operations',       6,  '4F', 'msantos@hospital.ph',      '09171234501', 'Active'),
(2,  'Jose Reyes',          10002, 'Operations',       7,  '4F', 'jreyes@hospital.ph',       '09181234502', 'Active'),
(3,  'Ana Cruz',            10003, 'Clinical Services',11, '3F', 'acruz@hospital.ph',        '09191234503', 'Active'),
(4,  'Ramon dela Torre',    10004, 'Clinical Services',16, '6F', 'rdelatorre@hospital.ph',   '09171234504', 'Active'),
(5,  'Liza Mercado',        10005, 'Administration',   8,  'GF', 'lmercado@hospital.ph',     '09181234505', 'Active'),
(6,  'Edwin Flores',        10006, 'IT',               13, '2F', 'eflores@hospital.ph',      '09191234506', 'Active'),
(7,  'Carla Bautista',      10007, 'Clinical Services',10, 'GF', 'cbautista@hospital.ph',    '09171234507', 'Active'),
(8,  'Noel Domingo',        10008, 'Operations',       6,  '4F', 'ndomingo@hospital.ph',     NULL,          'Active'),
(9,  'Patricia Villanueva', 10009, 'Administration',   8,  'GF', 'pvillanueva@hospital.ph',  '09181234509', 'Active'),
(10, 'Roberto Lim',         10010, 'Clinical Services',12, '3F', 'rlim@hospital.ph',         '09191234510', 'Active'),
(11, 'Sophia Garcia',       10011, 'Clinical Services',16, '6F', 'sgarcia@hospital.ph',      '09171234511', 'Active'),
(12, 'Mark Ocampo',         10012, 'IT',               13, '2F', 'mocampo@hospital.ph',      '09181234512', 'Active'),
(13, 'Jennilyn Tan',        10013, 'Administration',   9,  '5F', 'jtan@hospital.ph',         NULL,          'Active'),
(14, 'Francis Aquino',      10014, 'Clinical Services',17, '7F', 'faquino@hospital.ph',      '09191234514', 'Active'),
(15, 'Diana Lopez',         10015, 'Operations',       7,  '4F', 'dlopez@hospital.ph',       '09171234515', 'Active'),
(16, 'Kenneth Pascual',     10016, 'Clinical Services',11, '3F', 'kpascual@hospital.ph',     '09181234516', 'Active'),
(17, 'Rowena Castillo',     10017, 'Administration',   5,  'GF', 'rcastillo@hospital.ph',    '09191234517', 'Active'),
(18, 'Allan Navarro',       10018, 'IT',               13, '2F', 'anavarro@hospital.ph',     NULL,          'Active'),
(19, 'Cecilia Ramos',       10019, 'Clinical Services',19, '7F', 'cramos@hospital.ph',       '09171234519', 'Active'),
(20, 'Vincent Torres',      10020, 'Clinical Services',21, '8F', 'vtorres@hospital.ph',      '09181234520', 'Active'),
(21, 'Maricel Delos Reyes', 10021, 'Operations',       6,  '4F', NULL,                       '09191234521', 'Active'),
(22, 'Danilo Espiritu',     10022, 'Clinical Services',22, '5F', 'despiritu@hospital.ph',    '09171234522', 'Active'),
(23, 'Alma Mendoza',        10023, 'Administration',   8,  'GF', 'amendoza@hospital.ph',     '09181234523', 'Resigned'),
(24, 'Jaime Rivera',        10024, 'Clinical Services',15, 'B1', 'jrivera@hospital.ph',      NULL,          'Active'),
(25, 'Teresita Chua',       10025, 'IT',               13, '2F', 'tchua@hospital.ph',        '09191234525', 'Active');
 
-- ============================================================
--  Computers (50)
--  Statuses: Active (assigned), Spare/Defective/Repair (unassigned)
-- ============================================================
INSERT INTO computer (
    computer_id, computer_name, asset_tag, serial_no, model, brand, device_type,
    operating_system, computer_status, asset_condition, received_date, warranty_expiry,
    vendor, assigned_user, assigned_date, to_return_by,
    processor, ram_size, storage_type, storage_capacity,
    ip_address, mac_address, network_connectivity, has_vpn_access,
    anydesk_ip, remarks, cost
) VALUES
-- Active / Assigned computers (eu_id 1–25)
(1,  'PC-BIL-001', 'AT-C-001', 'SN-C-00001', 'ProBook 450 G9',       'HP',   'Laptop', 'Windows 11 Pro',  'Active',    'Used', '2022-03-15', '2025-03-15', 'TechSource Philippines Inc.',    1,  '2022-04-01', NULL,         'Intel Core i5-1235U', '8GB',  'SSD',  '512GB', '192.168.1.101', 'AA:BB:CC:DD:EE:01', 'LAN',        FALSE, '192.168.1.101', NULL,                        45000.00),
(2,  'PC-CSH-001', 'AT-C-002', 'SN-C-00002', 'Latitude 5530',         'Dell', 'Laptop', 'Windows 11 Pro',  'Active',    'Used', '2022-05-20', '2025-05-20', 'Digital Hub Solutions Corp.',    2,  '2022-06-01', NULL,         'Intel Core i5-1245U', '16GB', 'M.2',  '512GB', '192.168.1.102', 'AA:BB:CC:DD:EE:02', 'LAN',        FALSE, '192.168.1.102', NULL,                        52000.00),
(3,  'PC-LAB-001', 'AT-C-003', 'SN-C-00003', 'EliteBook 840 G9',     'HP',   'Laptop', 'Windows 10 Pro',  'Active',    'Used', '2021-08-10', '2024-08-10', 'TechSource Philippines Inc.',    3,  '2021-09-01', NULL,         'Intel Core i7-1255U', '16GB', 'M.2',  '512GB', '192.168.1.103', 'AA:BB:CC:DD:EE:03', 'WIFI & LAN', TRUE,  '192.168.1.103', NULL,                        68000.00),
(4,  'PC-ICU-001', 'AT-C-004', 'SN-C-00004', 'OptiPlex 7090',         'Dell', 'PC',     'Windows 10 Pro',  'Active',    'Used', '2021-06-15', '2024-06-15', 'Pinnacle Hardware Solutions',    4,  '2021-07-01', NULL,         'Intel Core i7-10700',  '16GB', 'SSD',  '1TB',   '192.168.2.101', 'AA:BB:CC:DD:EE:04', 'LAN',        FALSE, NULL,            NULL,                        55000.00),
(5,  'PC-ADM-001', 'AT-C-005', 'SN-C-00005', 'VivoPC VC66',           'Asus', 'AIO',    'Windows 11 Pro',  'Active',    'New',  '2023-01-10', '2026-01-10', 'CoreTech Philippines',           5,  '2023-02-01', NULL,         'Intel Core i5-12400',  '8GB',  'SSD',  '512GB', '192.168.1.105', 'AA:BB:CC:DD:EE:05', 'LAN',        FALSE, NULL,            NULL,                        42000.00),
(6,  'PC-IT-001',  'AT-C-006', 'SN-C-00006', 'ZenBook 14',            'Asus', 'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2023-03-22', '2026-03-22', 'SilverLine Computers Inc.',      6,  '2023-04-01', NULL,         'Intel Core i7-1255U', '16GB', 'M.2',  '1TB',   '192.168.1.106', 'AA:BB:CC:DD:EE:06', 'WIFI & LAN', TRUE,  '192.168.1.106', 'IT Staff Laptop',           72000.00),
(7,  'PC-EMR-001', 'AT-C-007', 'SN-C-00007', 'Aspire 5',              'Acer', 'Laptop', 'Windows 10 Pro',  'Active',    'Used', '2020-11-05', '2023-11-05', 'Digital Hub Solutions Corp.',    7,  '2021-01-15', NULL,         'Intel Core i5-1035G1','8GB',  'HDD',  '1TB',   '192.168.1.107', 'AA:BB:CC:DD:EE:07', 'WIFI',       FALSE, NULL,            'Battery needs replacement', 38000.00),
(8,  'PC-BIL-002', 'AT-C-008', 'SN-C-00008', 'ProBook 445 G8',       'HP',   'Laptop', 'Windows 11 Pro',  'Active',    'Used', '2022-07-18', '2025-07-18', 'TechSource Philippines Inc.',    8,  '2022-08-01', NULL,         'AMD Ryzen 5 5600U',   '8GB',  'SSD',  '512GB', '192.168.1.108', 'AA:BB:CC:DD:EE:08', 'LAN',        FALSE, '192.168.1.108', NULL,                        46000.00),
(9,  'PC-ADM-002', 'AT-C-009', 'SN-C-00009', 'Inspiron 15',           'Dell', 'Laptop', 'Windows 10 Pro',  'Active',    'Used', '2021-09-30', '2024-09-30', 'Nexus IT Distribution',          9,  '2021-10-15', NULL,         'Intel Core i5-1135G7','16GB', 'SSD',  '512GB', '192.168.1.109', 'AA:BB:CC:DD:EE:09', 'WIFI & LAN', FALSE, NULL,            NULL,                        50000.00),
(10, 'PC-HRT-001', 'AT-C-010', 'SN-C-00010', 'EliteDesk 800 G6',     'HP',   'PC',     'Windows 10 Pro',  'Active',    'Used', '2021-04-12', '2024-04-12', 'Pinnacle Hardware Solutions',    10, '2021-05-01', NULL,         'Intel Core i5-10500', '8GB',  'SSD',  '256GB', '192.168.2.102', 'AA:BB:CC:DD:EE:10', 'LAN',        FALSE, NULL,            NULL,                        40000.00),
(11, 'PC-ICU-002', 'AT-C-011', 'SN-C-00011', 'OptiPlex 3090',         'Dell', 'AIO',    'Windows 10 Pro',  'Active',    'Used', '2021-10-25', '2024-10-25', 'Digital Hub Solutions Corp.',    11, '2021-11-01', NULL,         'Intel Core i5-10500T','16GB', 'SSD',  '512GB', '192.168.2.103', 'AA:BB:CC:DD:EE:11', 'LAN',        FALSE, NULL,            NULL,                        58000.00),
(12, 'PC-IT-002',  'AT-C-012', 'SN-C-00012', 'ZenBook Pro 15',        'Asus', 'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2023-06-10', '2026-06-10', 'SilverLine Computers Inc.',      12, '2023-07-01', NULL,         'Intel Core i9-12900H','32GB', 'M.2',  '1TB',   '192.168.1.112', 'AA:BB:CC:DD:EE:12', 'WIFI & LAN', TRUE,  '192.168.1.112', 'Senior IT Staff',           95000.00),
(13, 'PC-EYE-001', 'AT-C-013', 'SN-C-00013', 'TravelMate P4',         'Acer', 'Laptop', 'Windows 10 Pro',  'Active',    'Used', '2022-02-14', '2025-02-14', 'CoreTech Philippines',           13, '2022-03-01', NULL,         'Intel Core i5-1235U', '8GB',  'SSD',  '512GB', '192.168.1.113', 'AA:BB:CC:DD:EE:13', 'LAN',        FALSE, NULL,            NULL,                        44000.00),
(14, 'PC-OPR-001', 'AT-C-014', 'SN-C-00014', 'ProBook 650 G8',       'HP',   'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2023-05-05', '2026-05-05', 'TechSource Philippines Inc.',    14, '2023-06-01', NULL,         'Intel Core i5-1145G7','16GB', 'M.2',  '512GB', '192.168.1.114', 'AA:BB:CC:DD:EE:14', 'WIFI & LAN', FALSE, '192.168.1.114', NULL,                        60000.00),
(15, 'PC-CSH-002', 'AT-C-015', 'SN-C-00015', 'Latitude 3520',         'Dell', 'Laptop', 'Windows 10 Pro',  'Active',    'Used', '2022-09-20', '2025-09-20', 'Nexus IT Distribution',          15, '2022-10-01', NULL,         'Intel Core i3-1115G4','8GB',  'HDD',  '1TB',   '192.168.1.115', 'AA:BB:CC:DD:EE:15', 'LAN',        FALSE, NULL,            'Old unit, monitor flickering',38000.00),
(16, 'PC-LAB-002', 'AT-C-016', 'SN-C-00016', 'EliteBook 845 G9',     'HP',   'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2023-04-18', '2026-04-18', 'TechSource Philippines Inc.',    16, '2023-05-01', NULL,         'AMD Ryzen 7 6850U',   '16GB', 'M.2',  '512GB', '192.168.1.116', 'AA:BB:CC:DD:EE:16', 'WIFI & LAN', TRUE,  '192.168.1.116', NULL,                        75000.00),
(17, 'PC-OSH-001', 'AT-C-017', 'SN-C-00017', 'VivoBook 15',           'Asus', 'Laptop', 'Windows 10 Pro',  'Active',    'Used', '2021-12-01', '2024-12-01', 'CoreTech Philippines',           17, '2022-01-01', NULL,         'Intel Core i5-1135G7','8GB',  'SSD',  '512GB', '192.168.1.117', 'AA:BB:CC:DD:EE:17', 'WIFI',       FALSE, NULL,            NULL,                        40000.00),
(18, 'PC-IT-003',  'AT-C-018', 'SN-C-00018', 'EliteBook 840 G10',    'HP',   'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2024-01-15', '2027-01-15', 'TechSource Philippines Inc.',    18, '2024-02-01', NULL,         'Intel Core i7-1355U', '16GB', 'M.2',  '1TB',   '192.168.1.118', 'AA:BB:CC:DD:EE:18', 'WIFI & LAN', TRUE,  '192.168.1.118', 'IT Network Admin Unit',     80000.00),
(19, 'PC-CCU-001', 'AT-C-019', 'SN-C-00019', 'OptiPlex 7010',         'Dell', 'PC',     'Windows 11 Pro',  'Active',    'New',  '2023-08-10', '2026-08-10', 'Digital Hub Solutions Corp.',    19, '2023-09-01', NULL,         'Intel Core i5-12500', '16GB', 'SSD',  '512GB', '192.168.2.105', 'AA:BB:CC:DD:EE:19', 'LAN',        FALSE, NULL,            NULL,                        48000.00),
(20, 'PC-NIC-001', 'AT-C-020', 'SN-C-00020', 'ProDesk 400 G9',       'HP',   'PC',     'Windows 11 Pro',  'Active',    'New',  '2023-09-05', '2026-09-05', 'Pinnacle Hardware Solutions',    20, '2023-10-01', NULL,         'Intel Core i5-12500', '8GB',  'SSD',  '512GB', '192.168.2.106', 'AA:BB:CC:DD:EE:20', 'LAN',        FALSE, NULL,            NULL,                        43000.00),
(21, 'PC-BIL-003', 'AT-C-021', 'SN-C-00021', 'Aspire Vero',           'Acer', 'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2023-10-20', '2026-10-20', 'SilverLine Computers Inc.',      21, '2023-11-01', NULL,         'Intel Core i5-1235U', '8GB',  'M.2',  '512GB', '192.168.1.121', 'AA:BB:CC:DD:EE:21', 'LAN',        FALSE, NULL,            NULL,                        45500.00),
(22, 'PC-GNU-001', 'AT-C-022', 'SN-C-00022', 'VivoBook 16',           'Asus', 'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2023-11-15', '2026-11-15', 'CoreTech Philippines',           22, '2023-12-01', NULL,         'Intel Core i7-1255U', '16GB', 'M.2',  '1TB',   '192.168.1.122', 'AA:BB:CC:DD:EE:22', 'WIFI & LAN', FALSE, '192.168.1.122', NULL,                        62000.00),
(23, 'PC-OSH-002', 'AT-C-023', 'SN-C-00023', 'Latitude 5540',         'Dell', 'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2024-02-10', '2027-02-10', 'Nexus IT Distribution',          23, '2024-03-01', NULL,         'Intel Core i5-1345U', '16GB', 'SSD',  '512GB', '192.168.1.123', 'AA:BB:CC:DD:EE:23', 'WIFI',       FALSE, NULL,            NULL,                        55000.00),
(24, 'PC-CAT-001', 'AT-C-024', 'SN-C-00024', 'EliteBook 635 G11',    'HP',   'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2024-03-05', '2027-03-05', 'TechSource Philippines Inc.',    24, '2024-04-01', NULL,         'AMD Ryzen 5 8540U',   '16GB', 'M.2',  '512GB', '192.168.1.124', 'AA:BB:CC:DD:EE:24', 'WIFI & LAN', TRUE,  '192.168.1.124', NULL,                        70000.00),
(25, 'PC-IT-004',  'AT-C-025', 'SN-C-00025', 'ZenBook 15',            'Asus', 'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2024-01-20', '2027-01-20', 'SilverLine Computers Inc.',      25, '2024-02-15', NULL,         'Intel Core i7-13700H','32GB', 'M.2',  '2TB',   '192.168.1.125', 'AA:BB:CC:DD:EE:25', 'WIFI & LAN', TRUE,  '192.168.1.125', 'IT Manager Unit',           98000.00),
-- Spare / Repair / Defective (unassigned)
(26, 'PC-SPARE-01','AT-C-026', 'SN-C-00026', 'ProBook 450 G8',       'HP',   'Laptop', 'Windows 10 Pro',  'Spare',     'Used', '2021-05-10', '2024-05-10', 'TechSource Philippines Inc.',    NULL, NULL, NULL,   'Intel Core i5-1135G7','8GB',  'SSD',  '512GB', '0.0.0.0',       '00:00:00:00:00:26', 'LAN',        FALSE, NULL,            'Spare unit',                NULL),
(27, 'PC-SPARE-02','AT-C-027', 'SN-C-00027', 'Aspire 3',              'Acer', 'Laptop', 'Windows 10 Home', 'Spare',     'Used', '2020-09-15', '2023-09-15', 'Digital Hub Solutions Corp.',    NULL, NULL, NULL,   'Intel Core i3-1005G1','8GB',  'HDD',  '1TB',   '0.0.0.0',       '00:00:00:00:00:27', 'WIFI',       FALSE, NULL,            'Assigned to pool',          NULL),
(28, 'PC-REP-001', 'AT-C-028', 'SN-C-00028', 'Latitude 5430',         'Dell', 'Laptop', 'Windows 10 Pro',  'Repair',    'Used', '2021-03-20', '2024-03-20', 'Nexus IT Distribution',          NULL, NULL, NULL,   'Intel Core i5-1235U', '8GB',  'SSD',  '512GB', '0.0.0.0',       '00:00:00:00:00:28', 'LAN',        FALSE, NULL,            'Screen cracked, for repair',NULL),
(29, 'PC-DEF-001', 'AT-C-029', 'SN-C-00029', 'EliteDesk 800 G5',     'HP',   'PC',     'Windows 10 Pro',  'Defective', 'Used', '2019-11-10', '2022-11-10', 'Pinnacle Hardware Solutions',    NULL, NULL, NULL,   'Intel Core i5-9500',  '8GB',  'HDD',  '1TB',   '0.0.0.0',       '00:00:00:00:00:29', 'LAN',        FALSE, NULL,            'Motherboard failure',       NULL),
(30, 'PC-REP-002', 'AT-C-030', 'SN-C-00030', 'VivoBook S15',          'Asus', 'Laptop', 'Windows 11 Pro',  'Repair',    'Used', '2022-08-05', '2025-08-05', 'CoreTech Philippines',           NULL, NULL, NULL,   'AMD Ryzen 5 5600H',   '16GB', 'SSD',  '512GB', '0.0.0.0',       '00:00:00:00:00:30', 'WIFI & LAN', FALSE, NULL,            'Keyboard malfunction',      NULL),
(31, 'PC-SPARE-03','AT-C-031', 'SN-C-00031', 'OptiPlex 3080',         'Dell', 'PC',     'Windows 10 Pro',  'Spare',     'Used', '2020-06-10', '2023-06-10', 'Digital Hub Solutions Corp.',    NULL, NULL, NULL,   'Intel Core i5-10500', '8GB',  'SSD',  '256GB', '0.0.0.0',       '00:00:00:00:00:31', 'LAN',        FALSE, NULL,            'Available for deployment',  NULL),
(32, 'PC-DEF-002', 'AT-C-032', 'SN-C-00032', 'TravelMate B3',         'Acer', 'Laptop', 'Windows 10 Home', 'Defective', 'Used', '2019-07-22', '2022-07-22', 'SilverLine Computers Inc.',      NULL, NULL, NULL,   'Intel Celeron N4020',  '4GB',  'HDD',  '256GB', '0.0.0.0',       '00:00:00:00:00:32', 'WIFI',       FALSE, NULL,            'Water damage',              NULL),
(33, 'PC-SPARE-04','AT-C-033', 'SN-C-00033', 'EliteBook 830 G8',     'HP',   'Laptop', 'Windows 11 Pro',  'Spare',     'New',  '2023-07-10', '2026-07-10', 'TechSource Philippines Inc.',    NULL, NULL, NULL,   'Intel Core i5-1145G7','16GB', 'M.2',  '512GB', '0.0.0.0',       '00:00:00:00:00:33', 'LAN',        FALSE, NULL,            'New spare unit',            65000.00),
(34, 'PC-SPARE-05','AT-C-034', 'SN-C-00034', 'Inspiron 5510',         'Dell', 'Laptop', 'Windows 11 Pro',  'Spare',     'New',  '2023-12-01', '2026-12-01', 'Nexus IT Distribution',          NULL, NULL, NULL,   'Intel Core i5-11320H','8GB',  'SSD',  '512GB', '0.0.0.0',       '00:00:00:00:00:34', 'WIFI & LAN', FALSE, NULL,            'New spare unit',            47000.00),
(35, 'PC-REP-003', 'AT-C-035', 'SN-C-00035', 'VivoPC Mini',           'Asus', 'PC',     'Windows 10 Pro',  'Repair',    'Used', '2020-02-18', '2023-02-18', 'CoreTech Philippines',           NULL, NULL, NULL,   'Intel Core i3-10100', '8GB',  'HDD',  '1TB',   '0.0.0.0',       '00:00:00:00:00:35', 'LAN',        FALSE, NULL,            'PSU replacement needed',    NULL),
-- Loaner units with to_return_by
(36, 'PC-LOAN-01', 'AT-C-036', 'SN-C-00036', 'ProBook 440 G10',      'HP',   'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2023-11-10', '2026-11-10', 'TechSource Philippines Inc.',    1,  '2024-06-01', '2024-07-31', 'Intel Core i5-1335U', '16GB', 'M.2',  '512GB', '192.168.1.136', 'AA:BB:CC:DD:EE:36', 'WIFI & LAN', FALSE, NULL,            'Loaner unit',               62000.00),
(37, 'PC-LOAN-02', 'AT-C-037', 'SN-C-00037', 'Latitude 3540',         'Dell', 'Laptop', 'Windows 11 Pro',  'Active',    'New',  '2024-01-05', '2027-01-05', 'Digital Hub Solutions Corp.',    5,  '2024-05-10', '2024-08-10', 'Intel Core i3-1315U', '8GB',  'SSD',  '256GB', '192.168.1.137', 'AA:BB:CC:DD:EE:37', 'LAN',        FALSE, NULL,            'Loaner unit',               39000.00),
-- More spares and variety
(38, 'PC-SPARE-06','AT-C-038', 'SN-C-00038', 'Aspire TC-1780',        'Acer', 'PC',     'Windows 11 Home', 'Spare',     'New',  '2024-03-10', '2027-03-10', 'SilverLine Computers Inc.',      NULL, NULL, NULL,   'Intel Core i5-13400', '8GB',  'SSD',  '512GB', '0.0.0.0',       '00:00:00:00:00:38', 'LAN',        FALSE, NULL,            'New spare unit',            40000.00),
(39, 'PC-DEF-003', 'AT-C-039', 'SN-C-00039', 'EliteDesk 600 G6',     'HP',   'PC',     'Windows 10 Pro',  'Defective', 'Used', '2020-03-15', '2023-03-15', 'Pinnacle Hardware Solutions',    NULL, NULL, NULL,   'Intel Core i5-10500T','8GB',  'HDD',  '1TB',   '0.0.0.0',       '00:00:00:00:00:39', 'LAN',        FALSE, NULL,            'HDD failure',               NULL),
(40, 'PC-SPARE-07','AT-C-040', 'SN-C-00040', 'ZenBook 13',            'Asus', 'Laptop', 'Windows 11 Pro',  'Spare',     'Used', '2022-10-10', '2025-10-10', 'CoreTech Philippines',           NULL, NULL, NULL,   'Intel Core i5-1240P', '8GB',  'M.2',  '512GB', '0.0.0.0',       '00:00:00:00:00:40', 'WIFI',       FALSE, NULL,            'Spare unit',                NULL),
(41, 'PC-REP-004', NULL,        'SN-C-00041', 'Latitude 5320',         'Dell', 'Laptop', 'Windows 10 Pro',  'Repair',    'Used', '2021-07-05', '2024-07-05', 'Nexus IT Distribution',          NULL, NULL, NULL,   'Intel Core i5-1145G7','8GB',  'SSD',  '256GB', '0.0.0.0',       '00:00:00:00:00:41', 'LAN',        FALSE, NULL,            'Charging port damaged',     NULL),
(42, 'PC-SPARE-08','AT-C-042', 'SN-C-00042', 'ProBook 455 G9',       'HP',   'Laptop', 'Windows 11 Pro',  'Spare',     'New',  '2023-09-20', '2026-09-20', 'TechSource Philippines Inc.',    NULL, NULL, NULL,   'AMD Ryzen 5 5625U',   '16GB', 'M.2',  '512GB', '0.0.0.0',       '00:00:00:00:00:42', 'LAN',        FALSE, NULL,            'Spare unit',                58000.00),
(43, 'PC-DEF-004', NULL,        'SN-C-00043', 'Aspire E15',            'Acer', 'Laptop', 'Windows 10 Home', 'Defective', 'Used', '2018-04-20', '2021-04-20', 'Digital Hub Solutions Corp.',    NULL, NULL, NULL,   'Intel Core i5-8250U', '8GB',  'HDD',  '1TB',   '0.0.0.0',       '00:00:00:00:00:43', 'WIFI',       FALSE, NULL,            'Beyond repair',             NULL),
(44, 'PC-SPARE-09','AT-C-044', 'SN-C-00044', 'OptiPlex 5080',         'Dell', 'PC',     'Windows 10 Pro',  'Spare',     'Used', '2021-01-15', '2024-01-15', 'SilverLine Computers Inc.',      NULL, NULL, NULL,   'Intel Core i7-10700', '16GB', 'SSD',  '1TB',   '0.0.0.0',       '00:00:00:00:00:44', 'LAN',        FALSE, NULL,            'Spare unit, good condition',NULL),
(45, 'PC-REP-005', 'AT-C-045', 'SN-C-00045', 'EliteBook 650 G9',     'HP',   'Laptop', 'Windows 11 Pro',  'Repair',    'Used', '2022-04-08', '2025-04-08', 'Pinnacle Hardware Solutions',    NULL, NULL, NULL,   'Intel Core i5-1235U', '8GB',  'M.2',  '512GB', '0.0.0.0',       '00:00:00:00:00:45', 'WIFI & LAN', FALSE, NULL,            'Awaiting parts',            NULL),
(46, 'PC-SPARE-10','AT-C-046', 'SN-C-00046', 'VivoBook Pro 15',       'Asus', 'Laptop', 'Windows 11 Pro',  'Spare',     'New',  '2024-04-01', '2027-04-01', 'CoreTech Philippines',           NULL, NULL, NULL,   'AMD Ryzen 7 7745HX',  '32GB', 'M.2',  '1TB',   '0.0.0.0',       '00:00:00:00:00:46', 'WIFI & LAN', FALSE, NULL,            'New high-spec spare',       88000.00),
(47, 'PC-DEF-005', NULL,        'SN-C-00047', 'Latitude 3510',         'Dell', 'Laptop', 'Windows 10 Pro',  'Defective', 'Used', '2020-05-25', '2023-05-25', 'Nexus IT Distribution',          NULL, NULL, NULL,   'Intel Core i5-10210U','8GB',  'HDD',  '512GB', '0.0.0.0',       '00:00:00:00:00:47', 'LAN',        FALSE, NULL,            'Fan failure, overheating',  NULL),
(48, 'PC-SPARE-11','AT-C-048', 'SN-C-00048', 'ProBook 470 G10',      'HP',   'Laptop', 'Windows 11 Pro',  'Spare',     'New',  '2024-02-20', '2027-02-20', 'TechSource Philippines Inc.',    NULL, NULL, NULL,   'Intel Core i7-1355U', '16GB', 'M.2',  '1TB',   '0.0.0.0',       '00:00:00:00:00:48', 'WIFI & LAN', FALSE, NULL,            'High-end spare unit',       82000.00),
(49, 'PC-REP-006', 'AT-C-049', 'SN-C-00049', 'Aspire Nitro 5',        'Acer', 'Laptop', 'Windows 11 Pro',  'Repair',    'Used', '2022-06-12', '2025-06-12', 'SilverLine Computers Inc.',      NULL, NULL, NULL,   'Intel Core i5-12500H','8GB',  'SSD',  '512GB', '0.0.0.0',       '00:00:00:00:00:49', 'WIFI',       FALSE, NULL,            'Display backlight failure', NULL),
(50, 'PC-SPARE-12','AT-C-050', 'SN-C-00050', 'OptiPlex 7010',         'Dell', 'PC',     'Windows 11 Pro',  'Spare',     'New',  '2024-05-01', '2027-05-01', 'Digital Hub Solutions Corp.',    NULL, NULL, NULL,   'Intel Core i7-12700', '32GB', 'SSD',  '1TB',   '0.0.0.0',       '00:00:00:00:00:50', 'LAN',        FALSE, NULL,            'New high-spec spare',       90000.00);
 
-- ============================================================
--  Computer Peripherals (junction)
-- ============================================================
INSERT INTO computer_peripheral (computer_id, peripheral_id) VALUES
-- Active assigned computers get peripherals
(1,1),(1,2),(1,3),
(2,1),(2,2),
(3,1),(3,2),(3,3),
(4,1),(4,2),(4,3),
(5,1),(5,2),(5,3),
(6,1),(6,2),(6,3),
(7,1),(7,2),
(8,1),(8,2),(8,3),
(9,1),(9,2),
(10,1),(10,2),(10,3),
(11,1),(11,2),(11,3),
(12,1),(12,2),(12,3),
(13,1),(13,2),
(14,1),(14,2),(14,3),
(15,1),(15,2),
(16,1),(16,2),(16,3),
(17,1),(17,2),
(18,1),(18,2),(18,3),
(19,1),(19,2),(19,3),
(20,1),(20,2),(20,3),
(21,1),(21,2),
(22,1),(22,2),(22,3),
(23,1),(23,2),
(24,1),(24,2),(24,3),
(25,1),(25,2),(25,3),
-- Spare units with some peripherals
(33,1),(33,2),(33,3),
(34,1),(34,2),
(42,1),(42,2),(42,3);
 
-- ============================================================
--  Computer Programs (junction)
-- ============================================================
INSERT INTO computer_program (computer_id, program_id) VALUES
(1,1),(1,2),(1,3),(1,4),
(2,1),(2,2),(2,3),
(3,1),(3,2),(3,4),
(4,1),(4,2),(4,3),
(5,1),(5,2),(5,3),
(6,1),(6,2),(6,3),(6,4),
(7,1),(7,2),
(8,1),(8,2),(8,3),
(9,1),(9,2),(9,3),
(10,1),(10,2),(10,3),
(11,1),(11,2),(11,3),(11,4),
(12,1),(12,2),(12,3),(12,4),
(13,1),(13,2),(13,3),
(14,1),(14,2),(14,3),(14,4),
(15,1),(15,2),
(16,1),(16,2),(16,3),(16,4),
(17,1),(17,2),(17,3),
(18,1),(18,2),(18,3),(18,4),
(19,1),(19,2),(19,3),
(20,1),(20,2),(20,3),
(21,1),(21,2),(21,3),
(22,1),(22,2),(22,3),(22,4),
(23,1),(23,2),(23,3),
(24,1),(24,2),(24,3),(24,4),
(25,1),(25,2),(25,3),(25,4),
(33,1),(33,2),
(34,1);
 
-- ============================================================
--  Software (50)
-- ============================================================
INSERT INTO software (
    software_id, software_name, vendor, license_type, purchase_date,
    subscription_id, renewal_date, expiry_date, cost, previous_cost,
    software_status, remarks, assigned_user, assigned_date
) VALUES
-- Assigned software (Active)
(1,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0001', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        1,  '2023-01-15'),
(2,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0002', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        2,  '2023-01-15'),
(3,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0003', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        3,  '2023-01-15'),
(4,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0004', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        4,  '2023-01-15'),
(5,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0005', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        5,  '2023-01-15'),
(6,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0006', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        6,  '2023-01-15'),
(7,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0007', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        7,  '2023-01-15'),
(8,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0008', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        8,  '2023-01-15'),
(9,  'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0009', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        9,  '2023-01-15'),
(10, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0010', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        10, '2023-01-15'),
(11, 'BizBox ERP',                      'BizBox Technologies',      'Subscription', '2022-06-01', 'SUB-BBX-0001',  '2025-06-01', '2025-06-01', 5000.00,  4500.00,  'Active',      'Hospital ERP System',       1,  '2022-06-15'),
(12, 'BizBox ERP',                      'BizBox Technologies',      'Subscription', '2022-06-01', 'SUB-BBX-0002',  '2025-06-01', '2025-06-01', 5000.00,  4500.00,  'Active',      'Hospital ERP System',       2,  '2022-06-15'),
(13, 'BizBox ERP',                      'BizBox Technologies',      'Subscription', '2022-06-01', 'SUB-BBX-0003',  '2025-06-01', '2025-06-01', 5000.00,  4500.00,  'Active',      'Hospital ERP System',       8,  '2022-06-15'),
(14, 'BizBox ERP',                      'BizBox Technologies',      'Subscription', '2022-06-01', 'SUB-BBX-0004',  '2025-06-01', '2025-06-01', 5000.00,  4500.00,  'Active',      'Hospital ERP System',       15, '2022-06-15'),
(15, 'BizBox ERP',                      'BizBox Technologies',      'Subscription', '2022-06-01', 'SUB-BBX-0005',  '2025-06-01', '2025-06-01', 5000.00,  4500.00,  'Active',      'Hospital ERP System',       21, '2022-06-15'),
(16, 'Adobe Acrobat Pro DC',            'Adobe Systems',            'Subscription', '2023-04-01', 'SUB-ADB-0001',  '2025-04-01', '2025-04-01', 2200.00,  2000.00,  'Active',      NULL,                        6,  '2023-04-10'),
(17, 'Adobe Acrobat Pro DC',            'Adobe Systems',            'Subscription', '2023-04-01', 'SUB-ADB-0002',  '2025-04-01', '2025-04-01', 2200.00,  2000.00,  'Active',      NULL,                        12, '2023-04-10'),
(18, 'Adobe Acrobat Pro DC',            'Adobe Systems',            'Subscription', '2023-04-01', 'SUB-ADB-0003',  '2025-04-01', '2025-04-01', 2200.00,  2000.00,  'Active',      NULL,                        18, '2023-04-10'),
(19, 'Kaspersky Endpoint Security',     'Kaspersky Lab',            'Subscription', '2022-09-01', 'SUB-KSP-0001',  '2025-09-01', '2025-09-01', 1200.00,  1100.00,  'Active',      NULL,                        6,  '2022-09-15'),
(20, 'Kaspersky Endpoint Security',     'Kaspersky Lab',            'Subscription', '2022-09-01', 'SUB-KSP-0002',  '2025-09-01', '2025-09-01', 1200.00,  1100.00,  'Active',      NULL,                        12, '2022-09-15'),
(21, 'Kaspersky Endpoint Security',     'Kaspersky Lab',            'Subscription', '2022-09-01', 'SUB-KSP-0003',  '2025-09-01', '2025-09-01', 1200.00,  1100.00,  'Active',      NULL,                        18, '2022-09-15'),
(22, 'Kaspersky Endpoint Security',     'Kaspersky Lab',            'Subscription', '2022-09-01', 'SUB-KSP-0004',  '2025-09-01', '2025-09-01', 1200.00,  1100.00,  'Active',      NULL,                        25, '2022-09-15'),
(23, 'AutoCAD LT 2024',                 'Autodesk Inc.',            'Subscription', '2023-07-01', 'SUB-ACD-0001',  '2025-07-01', '2025-07-01', 8500.00,  7800.00,  'Active',      'Used by Facilities',        NULL, NULL),
(24, 'AutoCAD LT 2024',                 'Autodesk Inc.',            'Subscription', '2023-07-01', 'SUB-ACD-0002',  '2025-07-01', '2025-07-01', 8500.00,  NULL,     'Active',      'Unassigned spare license',  NULL, NULL),
(25, 'ManageEngine ADAudit Plus',       'Zoho Corp.',               'Subscription', '2022-11-01', 'SUB-MEA-0001',  '2025-11-01', '2025-11-01', 12000.00, 10000.00, 'Active',      'AD Monitoring Tool',        6,  '2022-11-15'),
(26, 'ManageEngine OpManager',          'Zoho Corp.',               'Subscription', '2022-11-01', 'SUB-MEO-0001',  '2025-11-01', '2025-11-01', 15000.00, 13500.00, 'Active',      'Network Monitoring',        18, '2022-11-15'),
(27, 'SolarWinds Network Perf. Monitor','SolarWinds Inc.',          'Subscription', '2021-05-01', 'SUB-SWN-0001',  '2024-05-01', '2024-05-01', 18000.00, 16500.00, 'For Renewal', 'Renewal pending approval',  18, '2021-05-15'),
(28, 'GFI LanGuard',                    'GFI Software',             'Subscription', '2023-03-01', 'SUB-GFI-0001',  '2025-03-01', '2025-03-01', 9000.00,  8200.00,  'Active',      'Vulnerability scanner',     6,  '2023-03-10'),
(29, 'Veeam Backup & Replication',      'Veeam Software',           'Subscription', '2022-08-01', 'SUB-VBR-0001',  '2025-08-01', '2025-08-01', 22000.00, 20000.00, 'Active',      'Backup solution',           6,  '2022-08-15'),
(30, 'Microsoft SQL Server 2019',       'Microsoft Philippines',    'Perpetual',    '2020-03-01', 'LIC-SQL-0001',  '2030-03-01', '2030-03-01', 85000.00, NULL,     'Active',      'Core DB Server license',    NULL, NULL),
(31, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0011', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        11, '2023-01-15'),
(32, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0012', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        12, '2023-01-15'),
(33, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0013', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        13, '2023-01-15'),
(34, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0014', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        14, '2023-01-15'),
(35, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0015', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        16, '2023-01-15'),
(36, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0016', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        17, '2023-01-15'),
(37, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0017', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        19, '2023-01-15'),
(38, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0018', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        20, '2023-01-15'),
(39, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0019', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        22, '2023-01-15'),
(40, 'Microsoft 365 Business Standard', 'Microsoft Philippines',    'Subscription', '2023-01-01', 'SUB-M365-0020', '2025-01-01', '2025-01-01', 1800.00,  1500.00,  'Active',      NULL,                        24, '2023-01-15'),
(41, 'Symantec Endpoint Protection',    'Broadcom Inc.',            'Subscription', '2020-05-01', 'SUB-SEP-0001',  '2023-05-01', '2023-05-01', 3500.00,  3200.00,  'Expired',     'Replaced by Kaspersky',     NULL, NULL),
(42, 'Symantec Endpoint Protection',    'Broadcom Inc.',            'Subscription', '2020-05-01', 'SUB-SEP-0002',  '2023-05-01', '2023-05-01', 3500.00,  3200.00,  'Expired',     'Replaced by Kaspersky',     NULL, NULL),
(43, 'Webroot SecureAnywhere',          'OpenText Corp.',           'Subscription', '2019-09-01', 'SUB-WEB-0001',  '2022-09-01', '2022-09-01', 2800.00,  2500.00,  'Discontinued','Phase out complete',        NULL, NULL),
(44, 'Windows Server 2019 Standard',    'Microsoft Philippines',    'Perpetual',    '2020-01-15', 'LIC-WSS-0001',  '2030-01-15', '2030-01-15', 45000.00, NULL,     'Active',      '2-VM license',              NULL, NULL),
(45, 'Windows Server 2019 Standard',    'Microsoft Philippines',    'Perpetual',    '2020-01-15', 'LIC-WSS-0002',  '2030-01-15', '2030-01-15', 45000.00, NULL,     'Active',      '2-VM license',              NULL, NULL),
(46, 'TeamViewer Corporate',            'TeamViewer GmbH',          'Subscription', '2022-01-01', 'SUB-TVM-0001',  '2025-01-01', '2025-01-01', 8000.00,  7200.00,  'For Renewal', 'Remote support tool',       6,  '2022-01-10'),
(47, 'Acronis Cyber Backup',            'Acronis International',    'Subscription', '2023-02-01', 'SUB-ACB-0001',  '2025-02-01', '2025-02-01', 7500.00,  6800.00,  'Active',      'Endpoint backup',           6,  '2023-02-15'),
(48, 'PRTG Network Monitor',            'Paessler AG',              'Subscription', '2022-07-01', 'SUB-PRG-0001',  '2025-07-01', '2025-07-01', 11000.00, 9500.00,  'Active',      'Network monitoring',        18, '2022-07-10'),
(49, 'Cisco Packet Tracer',             'Cisco Systems',            'Perpetual',    '2021-03-01', 'LIC-CPT-0001',  '2031-03-01', '2031-03-01', 0.00,     NULL,     'Active',      'Free educational license',  6,  '2021-03-15'),
(50, 'ManageEngine ServiceDesk Plus',   'Zoho Corp.',               'Subscription', '2023-06-01', 'SUB-SDP-0001',  '2025-06-01', '2025-06-01', 20000.00, 18000.00, 'Active',      'IT Helpdesk ticketing',     25, '2023-06-15');
 
-- ============================================================
--  Printers (25)
-- ============================================================
INSERT INTO printer (
    printer_id, printer_name, department, asset_tag, asset_location,
    serial_no, brand, vendor, model, printer_type, connectivity,
    ip_address, mac_address, is_color, asset_status, asset_condition,
    received_date, warranty_expiry, date_deployed, cost, remarks
) VALUES
(1,  'PRT-BIL-001', 6,  'AT-P-001', '4F', 'PN-P-00001', 'HP',     'TechSource Philippines Inc.',  'LaserJet Pro M404dn',     'Laser',   'LAN',        '192.168.3.101', 'BB:CC:DD:EE:FF:01', FALSE, 'Active',    'Used', '2021-06-10', '2024-06-10', '2021-07-01', 18000.00, NULL),
(2,  'PRT-CSH-001', 7,  'AT-P-002', '4F', 'PN-P-00002', 'Canon',  'Digital Hub Solutions Corp.',  'imageCLASS MF455dw',      'Laser',   'LAN & WIFI', '192.168.3.102', 'BB:CC:DD:EE:FF:02', FALSE, 'Active',    'Used', '2022-03-15', '2025-03-15', '2022-04-01', 22000.00, NULL),
(3,  'PRT-LAB-001', 11, 'AT-P-003', '3F', 'PN-P-00003', 'Epson',  'TechSource Philippines Inc.',  'EcoTank L5290',           'Inkjet',  'LAN & WIFI', '192.168.3.103', 'BB:CC:DD:EE:FF:03', TRUE,  'Active',    'New',  '2023-04-20', '2026-04-20', '2023-05-01', 15000.00, 'Color printing for lab reports'),
(4,  'PRT-ICU-001', 16, 'AT-P-004', '6F', 'PN-P-00004', 'HP',     'Pinnacle Hardware Solutions',  'LaserJet Enterprise M507n','Laser',   'LAN',        '192.168.3.104', 'BB:CC:DD:EE:FF:04', FALSE, 'Active',    'Used', '2021-09-05', '2024-09-05', '2021-10-01', 35000.00, NULL),
(5,  'PRT-ADM-001', 8,  'AT-P-005', 'GF', 'PN-P-00005', 'Brother','CoreTech Philippines',          'MFC-L3770CDW',            'Laser',   'LAN & WIFI', '192.168.3.105', 'BB:CC:DD:EE:FF:05', TRUE,  'Active',    'New',  '2023-08-10', '2026-08-10', '2023-09-01', 28000.00, NULL),
(6,  'PRT-IT-001',  13, 'AT-P-006', '2F', 'PN-P-00006', 'HP',     'TechSource Philippines Inc.',  'Color LaserJet Pro M283fdw','Laser',  'LAN & WIFI', '192.168.3.106', 'BB:CC:DD:EE:FF:06', TRUE,  'Active',    'New',  '2023-02-18', '2026-02-18', '2023-03-01', 32000.00, 'IT Department color printer'),
(7,  'PRT-EMR-001', 10, 'AT-P-007', 'GF', 'PN-P-00007', 'Epson',  'Digital Hub Solutions Corp.',  'WorkForce WF-7310',       'Inkjet',  'WIFI',       '192.168.3.107', 'BB:CC:DD:EE:FF:07', TRUE,  'Active',    'Used', '2022-06-25', '2025-06-25', '2022-07-01', 12000.00, NULL),
(8,  'PRT-OPD-001', 4,  'AT-P-008', '3F', 'PN-P-00008', 'Canon',  'Nexus IT Distribution',        'PIXMA G6070',             'Inkjet',  'LAN & WIFI', '192.168.3.108', 'BB:CC:DD:EE:FF:08', TRUE,  'Active',    'Used', '2022-01-14', '2025-01-14', '2022-02-01', 11000.00, NULL),
(9,  'PRT-NIC-001', 21, 'AT-P-009', '8F', 'PN-P-00009', 'HP',     'Pinnacle Hardware Solutions',  'LaserJet Pro M148dw',     'Laser',   'WIFI',       NULL,            NULL,                FALSE, 'Active',    'Used', '2021-11-20', '2024-11-20', '2021-12-01', 16000.00, 'WIFI only, no static IP'),
(10, 'PRT-GNU5-001',22, 'AT-P-010', '5F', 'PN-P-00010', 'Brother','SilverLine Computers Inc.',    'HL-L2395DW',              'Laser',   'WIFI',       NULL,            NULL,                FALSE, 'Active',    'New',  '2024-01-10', '2027-01-10', '2024-02-01', 14000.00, NULL),
(11, 'PRT-GNU6-001',23, 'AT-P-011', '6F', 'PN-P-00011', 'Canon',  'CoreTech Philippines',          'imageCLASS MF264dw',      'Laser',   'WIFI',       NULL,            NULL,                FALSE, 'Active',    'New',  '2024-02-05', '2027-02-05', '2024-03-01', 13000.00, NULL),
(12, 'PRT-CCU-001', 19, 'AT-P-012', '7F', 'PN-P-00012', 'HP',     'TechSource Philippines Inc.',  'LaserJet Pro M15w',       'Laser',   'WIFI',       NULL,            NULL,                FALSE, 'Active',    'Used', '2022-05-12', '2025-05-12', '2022-06-01', 8500.00,  NULL),
(13, 'PRT-CVU-001', 20, 'AT-P-013', '7F', 'PN-P-00013', 'Epson',  'Digital Hub Solutions Corp.',  'EcoTank L3250',           'Inkjet',  'WIFI',       NULL,            NULL,                TRUE,  'Active',    'New',  '2023-10-15', '2026-10-15', '2023-11-01', 9000.00,  'Color printing for reports'),
(14, 'PRT-CAT-001', 15, 'AT-P-014', 'B1', 'PN-P-00014', 'Brother','Nexus IT Distribution',        'MFC-J4340DW',             'Inkjet',  'LAN & WIFI', '192.168.3.114', 'BB:CC:DD:EE:FF:14', TRUE,  'Active',    'New',  '2023-12-01', '2026-12-01', '2024-01-01', 17000.00, NULL),
(15, 'PRT-FAC-001', 1,  'AT-P-015', 'B2', 'PN-P-00015', 'HP',     'TechSource Philippines Inc.',  'OfficeJet Pro 9025e',     'Inkjet',  'LAN & WIFI', '192.168.3.115', 'BB:CC:DD:EE:FF:15', TRUE,  'Active',    'Used', '2022-08-10', '2025-08-10', '2022-09-01', 13500.00, NULL),
-- Spare / Repair / Defective
(16, 'PRT-SPARE-01',13, 'AT-P-016', '2F', 'PN-P-00016', 'HP',     'TechSource Philippines Inc.',  'LaserJet Pro M28w',       'Laser',   'WIFI',       NULL,            NULL,                FALSE, 'Spare',     'Used', '2020-07-15', '2023-07-15', NULL,         NULL,     'Spare unit, toner low'),
(17, 'PRT-SPARE-02',13, 'AT-P-017', '2F', 'PN-P-00017', 'Canon',  'Digital Hub Solutions Corp.',  'imageCLASS LBP6030',      'Laser',   'USB',        NULL,            NULL,                FALSE, 'Spare',     'Used', '2019-04-20', '2022-04-20', NULL,         NULL,     'Old spare unit'),
(18, 'PRT-REP-001', 6,  'AT-P-018', '4F', 'PN-P-00018', 'Epson',  'Pinnacle Hardware Solutions',  'L3150',                   'Inkjet',  'WIFI',       NULL,            NULL,                TRUE,  'Repair',    'Used', '2021-03-10', '2024-03-10', '2021-04-01', NULL,     'Paper jam mechanism broken'),
(19, 'PRT-DEF-001', 7,  'AT-P-019', '4F', 'PN-P-00019', 'Brother','CoreTech Philippines',          'DCP-T520W',               'Inkjet',  'WIFI',       NULL,            NULL,                TRUE,  'Defective', 'Used', '2019-11-15', '2022-11-15', '2019-12-01', NULL,     'Print head failure, beyond repair'),
(20, 'PRT-REP-002', 11, 'AT-P-020', '3F', 'PN-P-00020', 'HP',     'TechSource Philippines Inc.',  'LaserJet P1102w',         'Laser',   'WIFI',       NULL,            NULL,                FALSE, 'Repair',    'Used', '2018-06-20', '2021-06-20', '2018-07-01', NULL,     'Fuser unit needs replacement'),
(21, 'PRT-SPARE-03',13, NULL,        '2F', 'PN-P-00021', 'Epson',  'SilverLine Computers Inc.',    'EcoTank L4260',           'Inkjet',  'LAN & WIFI', NULL,            NULL,                TRUE,  'Spare',     'New',  '2024-04-01', '2027-04-01', NULL,         15000.00, 'New spare, ready for deployment'),
(22, 'PRT-DEF-002', 8,  NULL,        'GF', 'PN-P-00022', 'Canon',  'Nexus IT Distribution',        'PIXMA TS3340',            'Inkjet',  'WIFI',       NULL,            NULL,                TRUE,  'Defective', 'Used', '2020-08-05', '2023-08-05', '2020-09-01', NULL,     'Logic board failure'),
(23, 'PRT-WEL-001', 25, 'AT-P-023', 'GF', 'PN-P-00023', 'HP',     'Pinnacle Hardware Solutions',  'DeskJet 2723e',           'Inkjet',  'WIFI',       NULL,            NULL,                TRUE,  'Active',    'New',  '2024-03-20', '2027-03-20', '2024-04-01', 7500.00,  NULL),
(24, 'PRT-HEM-001', 2,  'AT-P-024', '3F', 'PN-P-00024', 'Brother','CoreTech Philippines',          'HL-L2340DW',              'Laser',   'WIFI',       NULL,            NULL,                FALSE, 'Active',    'New',  '2024-05-01', '2027-05-01', '2024-06-01', 12500.00, NULL),
(25, 'PRT-MSG-001', 26, 'AT-P-025', 'GF', 'PN-P-00025', 'Canon',  'TechSource Philippines Inc.',  'imageCLASS MF236n',       'Laser',   'LAN',        '192.168.3.125', 'BB:CC:DD:EE:FF:25', FALSE, 'Active',    'Used', '2021-07-08', '2024-07-08', '2021-08-01', 14000.00, NULL);
 
-- ============================================================
--  UPS (50)
-- ============================================================
INSERT INTO ups (
    ups_id, computer_assigned_to, asset_tag, serial_no,
    brand, vendor, model, capacity_va, battery_replace_date,
    asset_status, asset_condition, received_date, warranty_expiry,
    date_deployed, cost, remarks
) VALUES
-- Active UPS assigned to computers
(1,  1,  'AT-U-001', 'SN-U-00001', 'APC',        'TechSource Philippines Inc.',  'Back-UPS 1100VA',       1100, '2024-01-01', 'Active', 'Used', '2022-03-15', '2025-03-15', '2022-04-01', 5500.00,  NULL),
(2,  2,  'AT-U-002', 'SN-U-00002', 'APC',        'TechSource Philippines Inc.',  'Back-UPS 650VA',         650, '2024-02-01', 'Active', 'Used', '2022-05-20', '2025-05-20', '2022-06-01', 3800.00,  NULL),
(3,  3,  'AT-U-003', 'SN-U-00003', 'Cyberpower', 'CoreTech Philippines',         'CP1000AVRLCD',          1000, NULL,         'Active', 'Used', '2021-08-10', '2024-08-10', '2021-09-01', 4200.00,  NULL),
(4,  4,  'AT-U-004', 'SN-U-00004', 'APC',        'Pinnacle Hardware Solutions',  'Smart-UPS 1500VA',      1500, '2023-06-01', 'Active', 'Used', '2021-06-15', '2024-06-15', '2021-07-01', 12000.00, NULL),
(5,  5,  'AT-U-005', 'SN-U-00005', 'Eaton',      'DataBridge IT Corp.',          '5P 1000VA',             1000, NULL,         'Active', 'New',  '2023-01-10', '2026-01-10', '2023-02-01', 7500.00,  NULL),
(6,  6,  'AT-U-006', 'SN-U-00006', 'APC',        'TechSource Philippines Inc.',  'Back-UPS Pro 1500VA',   1500, '2024-03-01', 'Active', 'New',  '2023-03-22', '2026-03-22', '2023-04-01', 9000.00,  NULL),
(7,  7,  'AT-U-007', 'SN-U-00007', 'Cyberpower', 'SilverLine Computers Inc.',    'CP850AVRLCD',            850, NULL,         'Active', 'Used', '2020-11-05', '2023-11-05', '2021-01-15', 3600.00,  'Battery may need replacement'),
(8,  8,  'AT-U-008', 'SN-U-00008', 'APC',        'TechSource Philippines Inc.',  'Back-UPS 1100VA',       1100, '2024-04-01', 'Active', 'Used', '2022-07-18', '2025-07-18', '2022-08-01', 5500.00,  NULL),
(9,  9,  'AT-U-009', 'SN-U-00009', 'Eaton',      'DataBridge IT Corp.',          '3S 550VA',               550, NULL,         'Active', 'Used', '2021-09-30', '2024-09-30', '2021-10-15', 2800.00,  NULL),
(10, 10, 'AT-U-010', 'SN-U-00010', 'APC',        'TechSource Philippines Inc.',  'Back-UPS 650VA',         650, '2023-10-01', 'Active', 'Used', '2021-04-12', '2024-04-12', '2021-05-01', 3800.00,  NULL),
(11, 11, 'AT-U-011', 'SN-U-00011', 'Cyberpower', 'CoreTech Philippines',         'CP1000AVRLCD',          1000, NULL,         'Active', 'Used', '2021-10-25', '2024-10-25', '2021-11-01', 4200.00,  NULL),
(12, 12, 'AT-U-012', 'SN-U-00012', 'APC',        'TechSource Philippines Inc.',  'Smart-UPS 1500VA',      1500, '2024-06-01', 'Active', 'New',  '2023-06-10', '2026-06-10', '2023-07-01', 12000.00, NULL),
(13, 13, 'AT-U-013', 'SN-U-00013', 'APC',        'Pinnacle Hardware Solutions',  'Back-UPS 1100VA',       1100, '2024-01-15', 'Active', 'Used', '2022-02-14', '2025-02-14', '2022-03-01', 5500.00,  NULL),
(14, 14, 'AT-U-014', 'SN-U-00014', 'Eaton',      'DataBridge IT Corp.',          '5P 1550VA',             1550, NULL,         'Active', 'New',  '2023-05-05', '2026-05-05', '2023-06-01', 11000.00, NULL),
(15, 15, 'AT-U-015', 'SN-U-00015', 'APC',        'TechSource Philippines Inc.',  'Back-UPS 650VA',         650, '2023-11-01', 'Active', 'Used', '2022-09-20', '2025-09-20', '2022-10-01', 3800.00,  NULL),
(16, 16, 'AT-U-016', 'SN-U-00016', 'Cyberpower', 'SilverLine Computers Inc.',    'CP1350AVRLCD',          1350, NULL,         'Active', 'New',  '2023-04-18', '2026-04-18', '2023-05-01', 6800.00,  NULL),
(17, 17, 'AT-U-017', 'SN-U-00017', 'APC',        'CoreTech Philippines',         'Back-UPS 850VA',         850, '2024-02-01', 'Active', 'Used', '2021-12-01', '2024-12-01', '2022-01-01', 4500.00,  NULL),
(18, 18, 'AT-U-018', 'SN-U-00018', 'Eaton',      'DataBridge IT Corp.',          '9SX 1000VA',            1000, NULL,         'Active', 'New',  '2024-01-15', '2027-01-15', '2024-02-01', 8500.00,  NULL),
(19, 19, 'AT-U-019', 'SN-U-00019', 'APC',        'TechSource Philippines Inc.',  'Back-UPS 1100VA',       1100, '2024-07-01', 'Active', 'New',  '2023-08-10', '2026-08-10', '2023-09-01', 5500.00,  NULL),
(20, 20, 'AT-U-020', 'SN-U-00020', 'Cyberpower', 'Pinnacle Hardware Solutions',  'CP1000AVRLCD',          1000, NULL,         'Active', 'New',  '2023-09-05', '2026-09-05', '2023-10-01', 4200.00,  NULL),
(21, 21, 'AT-U-021', 'SN-U-00021', 'APC',        'TechSource Philippines Inc.',  'Back-UPS 650VA',         650, '2024-01-01', 'Active', 'New',  '2023-10-20', '2026-10-20', '2023-11-01', 3800.00,  NULL),
(22, 22, 'AT-U-022', 'SN-U-00022', 'Eaton',      'DataBridge IT Corp.',          '5P 1000VA',             1000, NULL,         'Active', 'New',  '2023-11-15', '2026-11-15', '2023-12-01', 7500.00,  NULL),
(23, 23, 'AT-U-023', 'SN-U-00023', 'APC',        'CoreTech Philippines',         'Back-UPS 1100VA',       1100, '2024-08-01', 'Active', 'New',  '2024-02-10', '2027-02-10', '2024-03-01', 5500.00,  NULL),
(24, 24, 'AT-U-024', 'SN-U-00024', 'Cyberpower', 'SilverLine Computers Inc.',    'CP1350AVRLCD',          1350, NULL,         'Active', 'New',  '2024-03-05', '2027-03-05', '2024-04-01', 6800.00,  NULL),
(25, 25, 'AT-U-025', 'SN-U-00025', 'APC',        'TechSource Philippines Inc.',  'Smart-UPS 1500VA',      1500, '2024-09-01', 'Active', 'New',  '2024-01-20', '2027-01-20', '2024-02-15', 12000.00, NULL),
-- Spare / Repair / Defective UPS (unassigned)
(26, NULL,'AT-U-026', 'SN-U-00026', 'APC',       'Pinnacle Hardware Solutions',  'Back-UPS 650VA',         650, NULL,         'Spare',     'Used', '2020-05-10', '2023-05-10', NULL,         NULL,     'Spare unit'),
(27, NULL,'AT-U-027', 'SN-U-00027', 'Cyberpower','CoreTech Philippines',         'CP600LCD',               600, NULL,         'Spare',     'Used', '2020-08-15', '2023-08-15', NULL,         NULL,     'Spare unit'),
(28, NULL,'AT-U-028', 'SN-U-00028', 'APC',       'TechSource Philippines Inc.',  'Back-UPS 1100VA',       1100, NULL,         'Repair',    'Used', '2021-03-10', '2024-03-10', '2021-04-01', NULL,     'Battery swollen'),
(29, NULL,'AT-U-029', 'SN-U-00029', 'Eaton',     'DataBridge IT Corp.',          '3S 700VA',               700, NULL,         'Defective', 'Used', '2019-07-20', '2022-07-20', '2019-08-01', NULL,     'Inverter failure, beyond repair'),
(30, NULL,'AT-U-030', 'SN-U-00030', 'APC',       'TechSource Philippines Inc.',  'Back-UPS 850VA',         850, NULL,         'Spare',     'New',  '2024-04-01', '2027-04-01', NULL,         4500.00,  'New spare unit'),
(31, NULL,'AT-U-031', 'SN-U-00031', 'Cyberpower','SilverLine Computers Inc.',    'CP1000AVRLCD',          1000, NULL,         'Spare',     'New',  '2024-04-01', '2027-04-01', NULL,         4200.00,  'New spare unit'),
(32, NULL,'AT-U-032', 'SN-U-00032', 'APC',       'Pinnacle Hardware Solutions',  'Back-UPS 1100VA',       1100, NULL,         'Repair',    'Used', '2022-06-15', '2025-06-15', '2022-07-01', NULL,     'Overload protection failed'),
(33, NULL,'AT-U-033', 'SN-U-00033', 'Eaton',     'DataBridge IT Corp.',          '5P 850VA',               850, NULL,         'Spare',     'Used', '2021-05-20', '2024-05-20', NULL,         NULL,     'Spare unit'),
(34, NULL,'AT-U-034', 'SN-U-00034', 'APC',       'CoreTech Philippines',         'Back-UPS 650VA',         650, NULL,         'Defective', 'Used', '2018-09-10', '2021-09-10', '2018-10-01', NULL,     'Unit does not power on'),
(35, NULL,'AT-U-035', 'SN-U-00035', 'Cyberpower','TechSource Philippines Inc.',  'CP850AVRLCD',            850, NULL,         'Spare',     'Used', '2022-02-18', '2025-02-18', NULL,         NULL,     'Available for deployment'),
(36, NULL,'AT-U-036', 'SN-U-00036', 'APC',       'TechSource Philippines Inc.',  'Smart-UPS 1000VA',      1000, NULL,         'Spare',     'New',  '2024-05-01', '2027-05-01', NULL,         9000.00,  'New spare unit'),
(37, NULL,'AT-U-037', 'SN-U-00037', 'Eaton',     'DataBridge IT Corp.',          '9SX 700VA',              700, NULL,         'Repair',    'Used', '2020-11-10', '2023-11-10', '2020-12-01', NULL,     'Battery leak, under repair'),
(38, NULL,'AT-U-038', 'SN-U-00038', 'APC',       'SilverLine Computers Inc.',    'Back-UPS Pro 900VA',     900, NULL,         'Spare',     'Used', '2021-08-22', '2024-08-22', NULL,         NULL,     'Good condition spare'),
(39, NULL,'AT-U-039', 'SN-U-00039', 'Cyberpower','Pinnacle Hardware Solutions',  'CP1350AVRLCD',          1350, NULL,         'Defective', 'Used', '2019-04-05', '2022-04-05', '2019-05-01', NULL,     'Surge protection failed'),
(40, NULL,'AT-U-040', 'SN-U-00040', 'APC',       'CoreTech Philippines',         'Back-UPS 1100VA',       1100, NULL,         'Spare',     'New',  '2024-03-15', '2027-03-15', NULL,         5500.00,  'New spare unit'),
(41, NULL,'AT-U-041', 'SN-U-00041', 'Eaton',     'DataBridge IT Corp.',          '5P 1550VA',             1550, NULL,         'Spare',     'New',  '2023-10-01', '2026-10-01', NULL,         11000.00, 'High-capacity spare'),
(42, NULL,'AT-U-042', 'SN-U-00042', 'APC',       'TechSource Philippines Inc.',  'Back-UPS 650VA',         650, NULL,         'Repair',    'Used', '2022-01-10', '2025-01-10', '2022-02-01', NULL,     'Outlet socket damaged'),
(43, NULL,'AT-U-043', 'SN-U-00043', 'Cyberpower','SilverLine Computers Inc.',    'CP600LCD',               600, NULL,         'Spare',     'Used', '2021-06-30', '2024-06-30', NULL,         NULL,     'Spare unit'),
(44, NULL,'AT-U-044', 'SN-U-00044', 'APC',       'Pinnacle Hardware Solutions',  'Back-UPS Pro 1500VA',   1500, NULL,         'Spare',     'New',  '2023-07-15', '2026-07-15', NULL,         9000.00,  'New high-capacity spare'),
(45, NULL,'AT-U-045', 'SN-U-00045', 'Eaton',     'CoreTech Philippines',         '3S 550VA',               550, NULL,         'Defective', 'Used', '2018-03-20', '2021-03-20', '2018-04-01', NULL,     'Transfer switch failure'),
(46, NULL,'AT-U-046', 'SN-U-00046', 'APC',       'TechSource Philippines Inc.',  'Back-UPS 850VA',         850, NULL,         'Spare',     'Used', '2022-10-05', '2025-10-05', NULL,         NULL,     'Available for use'),
(47, NULL,'AT-U-047', 'SN-U-00047', 'Cyberpower','DataBridge IT Corp.',          'CP1000AVRLCD',          1000, NULL,         'Spare',     'New',  '2024-02-28', '2027-02-28', NULL,         4200.00,  'New spare unit'),
(48, NULL,'AT-U-048', 'SN-U-00048', 'APC',       'SilverLine Computers Inc.',    'Smart-UPS 1500VA',      1500, NULL,         'Repair',    'Used', '2020-09-10', '2023-09-10', '2020-10-01', NULL,     'Control board replacement needed'),
(49, NULL,'AT-U-049', 'SN-U-00049', 'Eaton',     'Pinnacle Hardware Solutions',  '5P 1000VA',             1000, NULL,         'Spare',     'Used', '2021-11-15', '2024-11-15', NULL,         NULL,     'Spare unit, tested OK'),
(50, NULL,'AT-U-050', 'SN-U-00050', 'APC',       'TechSource Philippines Inc.',  'Back-UPS 1100VA',       1100, NULL,         'Spare',     'New',  '2024-06-01', '2027-06-01', NULL,         5500.00,  'Latest batch spare');
 
-- ============================================================
--  Network Devices (25)
-- ============================================================
INSERT INTO network_device (
    network_device_id, network_device_name, asset_tag, asset_location,
    serial_no, brand, vendor, model, device_type,
    ip_address, mac_address, port_count, firmware_version,
    asset_status, asset_condition, received_date, warranty_expiry,
    date_deployed, cost, remarks
) VALUES
(1,  'SW-CORE-B2',   'AT-N-001', 'B2', 'SN-N-00001', 'Cisco', 'FastLane Network Solutions',  'Catalyst 2960X-48FPD-L', 'Switch',   '10.0.0.1',    'CC:DD:EE:FF:00:01', 48,  '15.2(7)E7',  'Active',    'Used', '2021-01-15', '2024-01-15', '2021-02-01', 85000.00,  'Core switch, B2 server room'),
(2,  'SW-B1-01',     'AT-N-002', 'B1', 'SN-N-00002', 'Cisco', 'FastLane Network Solutions',  'Catalyst 2960-24TT-L',   'Switch',   '10.0.0.2',    'CC:DD:EE:FF:00:02', 24,  '15.2(7)E4',  'Active',    'Used', '2021-01-15', '2024-01-15', '2021-02-01', 42000.00,  'Distribution switch, B1'),
(3,  'SW-GF-01',     'AT-N-003', 'GF', 'SN-N-00003', 'HP',    'ProNet Systems Philippines',  'Aruba 2530-24G',         'Switch',   '10.0.1.1',    'CC:DD:EE:FF:00:03', 24,  'WB.16.10.24','Active',    'Used', '2020-06-10', '2023-06-10', '2020-07-01', 35000.00,  'Ground floor access switch'),
(4,  'SW-2F-01',     'AT-N-004', '2F', 'SN-N-00004', 'Cisco', 'FastLane Network Solutions',  'Catalyst 2960-24TT-L',   'Switch',   '10.0.2.1',    'CC:DD:EE:FF:00:04', 24,  '15.2(7)E5',  'Active',    'New',  '2023-04-01', '2026-04-01', '2023-05-01', 42000.00,  '2F IT floor switch'),
(5,  'SW-3F-01',     'AT-N-005', '3F', 'SN-N-00005', 'HP',    'ProNet Systems Philippines',  'Aruba 2530-48G',         'Switch',   '10.0.3.1',    'CC:DD:EE:FF:00:05', 48,  'WB.16.10.26','Active',    'Used', '2021-03-20', '2024-03-20', '2021-04-01', 55000.00,  '3F distribution switch'),
(6,  'SW-4F-01',     'AT-N-006', '4F', 'SN-N-00006', 'Cisco', 'FastLane Network Solutions',  'Catalyst 2960-24TT-L',   'Switch',   '10.0.4.1',    'CC:DD:EE:FF:00:06', 24,  '15.2(7)E6',  'Active',    'Used', '2021-05-10', '2024-05-10', '2021-06-01', 42000.00,  '4F billing/cashier switch'),
(7,  'SW-5F-01',     'AT-N-007', '5F', 'SN-N-00007', 'HP',    'ProNet Systems Philippines',  'Aruba 2530-24G',         'Switch',   '10.0.5.1',    'CC:DD:EE:FF:00:07', 24,  'WB.16.10.24','Active',    'Used', '2020-09-15', '2023-09-15', '2020-10-01', 35000.00,  '5F GNU switch'),
(8,  'SW-6F-01',     'AT-N-008', '6F', 'SN-N-00008', 'Cisco', 'FastLane Network Solutions',  'Catalyst 2960-48TT-L',   'Switch',   '10.0.6.1',    'CC:DD:EE:FF:00:08', 48,  '15.2(7)E4',  'Active',    'New',  '2023-06-01', '2026-06-01', '2023-07-01', 58000.00,  '6F ICU/GNU switch'),
(9,  'SW-7F-01',     'AT-N-009', '7F', 'SN-N-00009', 'HP',    'ProNet Systems Philippines',  'Aruba 2530-24G',         'Switch',   '10.0.7.1',    'CC:DD:EE:FF:00:09', 24,  'WB.16.10.25','Active',    'Used', '2022-02-10', '2025-02-10', '2022-03-01', 35000.00,  '7F OR/CCU switch'),
(10, 'SW-8F-01',     'AT-N-010', '8F', 'SN-N-00010', 'Cisco', 'TrueLink Network Corp.',      'Catalyst 2960-24TT-L',   'Switch',   '10.0.8.1',    'CC:DD:EE:FF:00:10', 24,  '15.2(7)E5',  'Active',    'New',  '2023-09-01', '2026-09-01', '2023-10-01', 42000.00,  '8F NICU switch'),
(11, 'RT-EDGE-01',   'AT-N-011', 'B2', 'SN-N-00011', 'Cisco', 'FastLane Network Solutions',  'ISR 4321',               'Router',   '10.0.0.254',  'CC:DD:EE:FF:00:11', NULL,'17.9.3a',   'Active',    'Used', '2020-10-01', '2023-10-01', '2020-11-01', 120000.00, 'Edge/Internet router'),
(12, 'RT-EDGE-02',   'AT-N-012', 'B2', 'SN-N-00012', 'Cisco', 'FastLane Network Solutions',  'ISR 4321',               'Router',   '10.0.0.253',  'CC:DD:EE:FF:00:12', NULL,'17.9.3a',   'Active',    'New',  '2023-10-15', '2026-10-15', '2023-11-01', 120000.00, 'Failover/backup router'),
(13, 'FW-MAIN-01',   'AT-N-013', 'B2', 'SN-N-00013', 'Cisco', 'FastLane Network Solutions',  'ASA 5506-X',             'Firewall', '10.0.0.250',  'CC:DD:EE:FF:00:13', NULL,'9.16.4.14', 'Active',    'Used', '2021-02-15', '2024-02-15', '2021-03-01', 180000.00, 'Main perimeter firewall'),
(14, 'FW-MAIN-02',   'AT-N-014', 'B2', 'SN-N-00014', 'Cisco', 'FastLane Network Solutions',  'ASA 5506-X',             'Firewall', '10.0.0.249',  'CC:DD:EE:FF:00:14', NULL,'9.16.4.14', 'Active',    'New',  '2023-11-01', '2026-11-01', '2023-12-01', 180000.00, 'Redundant firewall unit'),
(15, 'AP-2F-01',     'AT-N-015', '2F', 'SN-N-00015', 'Cisco', 'TrueLink Network Corp.',      'Catalyst 9120AXI',       'Switch',   '192.168.0.11','CC:DD:EE:FF:00:15', NULL,'17.9.3',    'Active',    'New',  '2023-08-10', '2026-08-10', '2023-09-01', 28000.00,  'Wireless AP, 2F IT area'),
(16, 'AP-GF-01',     'AT-N-016', 'GF', 'SN-N-00016', 'HP',    'ProNet Systems Philippines',  'Aruba AP-505',           'Switch',   '192.168.0.12','CC:DD:EE:FF:00:16', NULL,'8.11.2.1',  'Active',    'Used', '2022-04-05', '2025-04-05', '2022-05-01', 18000.00,  'Wireless AP, Ground Floor lobby'),
(17, 'AP-4F-01',     'AT-N-017', '4F', 'SN-N-00017', 'HP',    'ProNet Systems Philippines',  'Aruba AP-505',           'Switch',   '192.168.0.13','CC:DD:EE:FF:00:17', NULL,'8.11.2.1',  'Active',    'Used', '2022-04-05', '2025-04-05', '2022-05-01', 18000.00,  'Wireless AP, 4F billing area'),
(18, 'SW-PO-01',     'AT-N-018', 'PO', 'SN-N-00018', 'HP',    'ProNet Systems Philippines',  'Aruba 2530-24G',         'Switch',   '10.0.10.1',   'CC:DD:EE:FF:00:18', 24,  'WB.16.10.22','Active',    'Used', '2020-11-20', '2023-11-20', '2020-12-01', 35000.00,  'PO (satellite office) switch'),
(19, 'SW-SPARE-01',  'AT-N-019', 'B2', 'SN-N-00019', 'Cisco', 'FastLane Network Solutions',  'Catalyst 2960-24TT-L',   'Switch',   NULL,          NULL,                24,  NULL,         'Spare',     'Used', '2020-01-10', '2023-01-10', NULL,         NULL,      'Spare switch, no firmware update'),
(20, 'SW-SPARE-02',  NULL,        'B2', 'SN-N-00020', 'HP',    'ProNet Systems Philippines',  'Aruba 2530-24G',         'Switch',   NULL,          NULL,                24,  NULL,         'Spare',     'New',  '2024-04-01', '2027-04-01', NULL,         35000.00,  'New spare switch'),
(21, 'RT-SPARE-01',  NULL,        'B2', 'SN-N-00021', 'Cisco', 'TrueLink Network Corp.',      'ISR 4221',               'Router',   NULL,          NULL,                NULL,NULL,         'Spare',     'New',  '2024-05-01', '2027-05-01', NULL,         75000.00,  'Spare router, unopened'),
(22, 'FW-SPARE-01',  NULL,        'B2', 'SN-N-00022', 'Cisco', 'FastLane Network Solutions',  'ASA 5506-X',             'Firewall', NULL,          NULL,                NULL,NULL,         'Spare',     'New',  '2024-05-01', '2027-05-01', NULL,         180000.00, 'Spare firewall unit'),
(23, 'SW-REP-01',    'AT-N-023', 'B2', 'SN-N-00023', 'Cisco', 'FastLane Network Solutions',  'Catalyst 2960-24TT-L',   'Switch',   NULL,          NULL,                24,  NULL,         'Repair',    'Used', '2019-07-15', '2022-07-15', '2019-08-01', NULL,      'Port failure, being repaired'),
(24, 'SW-DEF-01',    'AT-N-024', 'B2', 'SN-N-00024', 'HP',    'ProNet Systems Philippines',  'Aruba 2530-24G',         'Switch',   NULL,          NULL,                24,  NULL,         'Defective', 'Used', '2018-05-10', '2021-05-10', '2018-06-01', NULL,      'Power supply failure, condemned'),
(25, 'AP-5F-01',     'AT-N-025', '5F', 'SN-N-00025', 'HP',    'ProNet Systems Philippines',  'Aruba AP-303',           'Switch',   '192.168.0.14','CC:DD:EE:FF:00:25', NULL,'8.9.1.0',   'Active',    'Used', '2021-07-20', '2024-07-20', '2021-08-01', 12000.00,  'Wireless AP, 5F');
 
-- ============================================================
--  Purchase Requests (10) with Line Items
-- ============================================================
INSERT INTO purchase_request (pr_id, pr_no, pr_status, date_requested, date_received, requested_by, received_by, remarks) VALUES
(1,  202400001, 'Received',    '2024-01-10', '2024-02-05', 'Edwin Flores',      'Mark Ocampo',    'New laptop units for department rollout'),
(2,  202400002, 'Received',    '2024-01-20', '2024-02-20', 'Allan Navarro',     'Edwin Flores',   'Network infrastructure upgrade - additional switches'),
(3,  202400003, 'Received',    '2024-02-05', '2024-03-10', 'Mark Ocampo',       'Allan Navarro',  'UPS replacement batch - aging units'),
(4,  202400004, 'In Process',  '2024-03-01', NULL,          'Edwin Flores',      NULL,             'Annual antivirus license renewal'),
(5,  202400005, 'Received',    '2024-03-15', '2024-04-18', 'Teresita Chua',     'Mark Ocampo',    'Printer units for new departments'),
(6,  202400006, 'On Hold',     '2024-04-01', NULL,          'Allan Navarro',     NULL,             'High-end server procurement - pending budget approval'),
(7,  202400007, 'Received',    '2024-04-10', '2024-05-08', 'Edwin Flores',      'Teresita Chua',  'Spare computer units for helpdesk pool'),
(8,  202400008, 'In Process',  '2024-05-20', NULL,          'Mark Ocampo',       NULL,             'Software license expansion - additional seats'),
(9,  202400009, 'Cancelled',   '2024-06-01', NULL,          'Teresita Chua',     NULL,             'NAS device - cancelled, moved to next FY budget'),
(10, 202400010, 'In Process',  '2024-06-15', NULL,          'Allan Navarro',     NULL,             'Network cabling and patching materials');
 
INSERT INTO purchase_request_item (pr_id, item_description, item_quantity, unit_price) VALUES
-- PR 1: Laptops
(1, 'HP ProBook 450 G10 - Intel Core i5-1335U, 16GB RAM, 512GB M.2 SSD, Windows 11 Pro', 5, 62000.00),
(1, 'Laptop bag - 15.6 inch, padded, with accessories pocket', 5, 850.00),
(1, 'USB-C Docking Station with HDMI and 4x USB ports', 5, 3500.00),
-- PR 2: Network switches
(2, 'Cisco Catalyst 2960-24TT-L 24-Port Fast Ethernet Switch', 3, 42000.00),
(2, 'Cat6 UTP Cable 305m pull-box', 4, 4500.00),
(2, 'RJ45 Crimping Connector (box of 100)', 5, 350.00),
-- PR 3: UPS units
(3, 'APC Back-UPS 1100VA 230V - BX1100C', 10, 5500.00),
(3, 'APC Replacement Battery Cartridge #110', 5, 2800.00),
-- PR 4: Antivirus
(4, 'Kaspersky Endpoint Security for Business - Advanced (1-year, 25 nodes)', 2, 18000.00),
-- PR 5: Printers
(5, 'HP LaserJet Pro M404dn Monochrome Laser Printer', 3, 18000.00),
(5, 'Canon imageCLASS MF264dw Wireless Mono Laser Printer', 2, 13000.00),
(5, 'HP LaserJet 85A Toner Cartridge (Black)', 10, 2200.00),
-- PR 6: Server (On Hold)
(6, 'Dell PowerEdge R750 Rack Server - Dual Xeon, 64GB RAM, 4x 1.2TB SAS', 1, 450000.00),
(6, 'APC Smart-UPS 3000VA Rack Mount 2U', 1, 35000.00),
(6, '19-inch Server Rack Cabinet 42U with PDU', 1, 28000.00),
-- PR 7: Spare computers
(7, 'HP EliteBook 830 G10 - Intel Core i5-1335U, 16GB, 512GB M.2 SSD', 3, 65000.00),
(7, 'Dell OptiPlex 7010 SFF - Intel Core i7-12700, 32GB, 1TB SSD', 2, 90000.00),
-- PR 8: Software licenses
(8, 'Microsoft 365 Business Standard - Annual Subscription (per user)', 10, 1800.00),
(8, 'Adobe Acrobat Pro DC - Annual Subscription (per user)', 3, 2200.00),
-- PR 9: NAS (Cancelled)
(9, 'Synology NAS DS1522+ with 5-Bay, Quad-core 2.6GHz, 8GB RAM', 1, 55000.00),
(9, 'Seagate IronWolf Pro 4TB NAS HDD (5-pack)', 1, 22000.00),
-- PR 10: Cabling materials
(10, 'Cat6 UTP Cable 305m pull-box (grey)', 6, 4500.00),
(10, 'RJ45 Keystone Jack (pack of 50)', 4, 1200.00),
(10, 'Surface Raceway/Cable Trunking 2m (white)', 20, 180.00),
(10, 'Patch Panel 24-port Cat6', 2, 3500.00);   
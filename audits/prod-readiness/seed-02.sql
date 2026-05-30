-- PROD-READINESS-02: Seed dependency-correct test accounts
-- Date: 2026-05-30
-- Environments: RAILWAY only
-- Password for ALL accounts: Test@2026
-- bcrypt hash (10 rounds): $2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO

BEGIN;

-- ============================================================
-- PRE-SEED CLEANUP: Remove 3 zombie groups + 2 stale schools
-- (confirmed 0 owned data in pre-flight)
-- ============================================================

DELETE FROM groups WHERE id IN (
  '434b1d31-6c5c-4514-b9d2-c6eb29891f27',
  '0b00f154-0d2e-4449-a7c6-d4420d62f866',
  '2f6e4aa0-4703-41af-b932-ad9a6e312bc4'
);

DELETE FROM schools WHERE id IN (
  '4ffc18f4-12a5-4687-9d08-c27d938909f7',
  '661d2411-b1ea-4d8e-8a93-d0374780476a'
);

-- ============================================================
-- STEP 1: SCHOOLS (4 total — 2 per region)
-- ============================================================

INSERT INTO schools
  (id, name, type, "regionId", "isActive", "createdAt", "updatedAt")
VALUES
  ('eec19bb5-36ae-4006-a330-031d07654c40', 'Toshkent Maxsus Maktab 1',   'school', '00000000-0000-0000-0000-000000000001', true, NOW(), NOW()),
  ('7b27fadd-3532-4e53-a5e3-79bc652a947f', 'Toshkent Maxsus Maktab 2',   'school', '00000000-0000-0000-0000-000000000001', true, NOW(), NOW()),
  ('2dac6af4-96c9-4c4f-8430-aac62440f4e5', 'Samarqand Maxsus Maktab 1',  'school', '00000000-0000-0000-0000-000000000002', true, NOW(), NOW()),
  ('5334e23c-a749-4808-8b9a-1f8c67aa1938', 'Samarqand Maxsus Maktab 2',  'school', '00000000-0000-0000-0000-000000000002', true, NOW(), NOW());

-- ============================================================
-- STEP 2: GOVERNMENT USERS (3 total)
-- ============================================================

INSERT INTO users
  (id, email, password, "firstName", "lastName", role,
   "isActive", "documentsApproved", status,
   "govLevel", "govType", "govRegionId", "govAccessGrants",
   "mustChangePassword", "notificationPreferences", "createdAt", "updatedAt")
VALUES
  ('e64efc66-4767-4abf-ba87-b822b440c425',
   'gov.republic@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Alisher', 'Nazarov', 'government',
   true, true, 'active',
   'republic', 'main', NULL, NULL,
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('a5e497f8-1015-4405-92f2-a9119eca8246',
   'gov.toshkent@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Bobur', 'Yusupov', 'government',
   true, true, 'active',
   'region', 'main', '00000000-0000-0000-0000-000000000001', NULL,
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('e7916c76-ff93-4a46-9b14-81482e441355',
   'gov.samarqand@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Sardor', 'Karimov', 'government',
   true, true, 'active',
   'region', 'main', '00000000-0000-0000-0000-000000000002', NULL,
   false, '{"email":true,"push":false}', NOW(), NOW());

-- ============================================================
-- STEP 3: SCHOOL USERS (28 total — 7 per school)
-- ============================================================

-- School 1: Toshkent Maxsus Maktab 1
INSERT INTO users
  (id, email, password, "firstName", "lastName", role,
   "isActive", "documentsApproved", status, "schoolId",
   "mustChangePassword", "notificationPreferences", "createdAt", "updatedAt")
VALUES
  ('23ab5921-ab51-4cd4-9267-6ff3b8439a4e',
   'admin1@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Aziz', 'Umarov', 'admin',
   true, true, 'active', 'eec19bb5-36ae-4006-a330-031d07654c40',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('f1b91cd2-d113-46ba-8cf9-cd0cc5019ba1',
   'reception1@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Zilola', 'Raximova', 'reception',
   true, true, 'active', 'eec19bb5-36ae-4006-a330-031d07654c40',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('d77eb37b-0da4-4530-8096-9ea221e9a891',
   'teacher1@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Malika', 'Yunusova', 'teacher',
   true, true, 'active', 'eec19bb5-36ae-4006-a330-031d07654c40',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('4ffa3e08-d35e-457f-a930-7f6d6c562b9f',
   'teacher2@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Nodir', 'Ismoilov', 'teacher',
   true, true, 'active', 'eec19bb5-36ae-4006-a330-031d07654c40',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('e67cf25b-e129-4f3d-89b3-eef89b77c2b0',
   'parent1@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Hulkar', 'Nasirova', 'parent',
   true, true, 'active', 'eec19bb5-36ae-4006-a330-031d07654c40',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('a297d236-5350-42f5-941d-3404c03d281e',
   'parent2@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Dilorom', 'Sobirov', 'parent',
   true, true, 'active', 'eec19bb5-36ae-4006-a330-031d07654c40',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('2ce225a6-c619-4cee-a694-583079418a92',
   'parent3@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Jasur', 'Tursunov', 'parent',
   true, true, 'active', 'eec19bb5-36ae-4006-a330-031d07654c40',
   false, '{"email":true,"push":false}', NOW(), NOW());

-- School 2: Toshkent Maxsus Maktab 2
INSERT INTO users
  (id, email, password, "firstName", "lastName", role,
   "isActive", "documentsApproved", status, "schoolId",
   "mustChangePassword", "notificationPreferences", "createdAt", "updatedAt")
VALUES
  ('c99dba0c-f181-49e4-9186-45580ae77a55',
   'admin2@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Bahrom', 'Solijev', 'admin',
   true, true, 'active', '7b27fadd-3532-4e53-a5e3-79bc652a947f',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('d77d45aa-3acc-4ec2-b286-d9c83d20facc',
   'reception2@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Yulduz', 'Mirzayeva', 'reception',
   true, true, 'active', '7b27fadd-3532-4e53-a5e3-79bc652a947f',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('7152d1eb-059e-4905-90ee-36a561f268be',
   'teacher3@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Feruza', 'Qosimova', 'teacher',
   true, true, 'active', '7b27fadd-3532-4e53-a5e3-79bc652a947f',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('efd5f5c1-ef54-4f70-b75e-966dae73033e',
   'teacher4@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Doniyor', 'Xoliqov', 'teacher',
   true, true, 'active', '7b27fadd-3532-4e53-a5e3-79bc652a947f',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('4797b521-fe3a-4570-9855-0154ad4d9e99',
   'parent4@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Kamola', 'Hasanov', 'parent',
   true, true, 'active', '7b27fadd-3532-4e53-a5e3-79bc652a947f',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('5a4c4628-cd4e-4925-ab02-8351161af8c3',
   'parent5@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Laylo', 'Mirzayev', 'parent',
   true, true, 'active', '7b27fadd-3532-4e53-a5e3-79bc652a947f',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('a8cd6ab5-4e10-4322-a744-351566bf760f',
   'parent6@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Mansur', 'Rahimov', 'parent',
   true, true, 'active', '7b27fadd-3532-4e53-a5e3-79bc652a947f',
   false, '{"email":true,"push":false}', NOW(), NOW());

-- School 3: Samarqand Maxsus Maktab 1
INSERT INTO users
  (id, email, password, "firstName", "lastName", role,
   "isActive", "documentsApproved", status, "schoolId",
   "mustChangePassword", "notificationPreferences", "createdAt", "updatedAt")
VALUES
  ('a878ae4b-cf39-4e03-a39e-24dd016a9f82',
   'admin3@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Vohid', 'Toshmatov', 'admin',
   true, true, 'active', '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('bced0475-2c05-4e16-9b9e-d4c3c7c36b63',
   'reception3@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Xurmo', 'Normatova', 'reception',
   true, true, 'active', '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('188cb980-4835-4a91-9c62-10dd8a4789d7',
   'teacher5@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Shahnoza', 'Ergasheva', 'teacher',
   true, true, 'active', '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('20bf29bf-7efa-43d7-81fd-fe921185c5a2',
   'teacher6@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Erkin', 'Nazarov', 'teacher',
   true, true, 'active', '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('07f21999-66af-47c4-8541-478bd9ce3bad',
   'parent7@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Nafisa', 'Hamidov', 'parent',
   true, true, 'active', '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('6bebc5f6-414f-4fe1-9791-f210af285460',
   'parent8@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Ozoda', 'Karimov', 'parent',
   true, true, 'active', '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('b4a6e261-b92e-4ddf-9599-884135037257',
   'parent9@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Pahlavon', 'Ergashev', 'parent',
   true, true, 'active', '2dac6af4-96c9-4c4f-8430-aac62440f4e5',
   false, '{"email":true,"push":false}', NOW(), NOW());

-- School 4: Samarqand Maxsus Maktab 2
INSERT INTO users
  (id, email, password, "firstName", "lastName", role,
   "isActive", "documentsApproved", status, "schoolId",
   "mustChangePassword", "notificationPreferences", "createdAt", "updatedAt")
VALUES
  ('9b01fa07-4570-41e1-a322-fe128fe0b1da',
   'admin4@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Gulsanam', 'Xolmatova', 'admin',
   true, true, 'active', '5334e23c-a749-4808-8b9a-1f8c67aa1938',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('db104a8b-e691-4138-a7e0-4d044ed3a740',
   'reception4@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Umida', 'Qodirboyeva', 'reception',
   true, true, 'active', '5334e23c-a749-4808-8b9a-1f8c67aa1938',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('56009e7e-1420-451d-8bd9-91f03249d86e',
   'teacher7@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Maftuna', 'Aliyeva', 'teacher',
   true, true, 'active', '5334e23c-a749-4808-8b9a-1f8c67aa1938',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('880e989b-7cfc-4d26-8fcc-399f8ae8f528',
   'teacher8@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Akmal', 'Pulatov', 'teacher',
   true, true, 'active', '5334e23c-a749-4808-8b9a-1f8c67aa1938',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('2f97d75c-5c82-483b-b2a7-4ef1ec29e980',
   'parent10@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Rano', 'Yusupov', 'parent',
   true, true, 'active', '5334e23c-a749-4808-8b9a-1f8c67aa1938',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('d86a143f-2fb3-4a1b-8a00-cf9f7795e78e',
   'parent11@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Sanjar', 'Qodirov', 'parent',
   true, true, 'active', '5334e23c-a749-4808-8b9a-1f8c67aa1938',
   false, '{"email":true,"push":false}', NOW(), NOW()),

  ('248f4087-fd38-4c92-bdda-cf6d2ed55696',
   'parent12@uchqun.uz',
   '$2b$10$.ovwHitQ4P/HBG4RmhrYR.LRGIrOGlFaCtM.d9Gi.yXuCZ0q6KyTO',
   'Tursun', 'Ahmedov', 'parent',
   true, true, 'active', '5334e23c-a749-4808-8b9a-1f8c67aa1938',
   false, '{"email":true,"push":false}', NOW(), NOW());

-- ============================================================
-- STEP 4: GROUPS (8 total — 2 per school, one per teacher)
-- s*_g1 → teacher1 of school, s*_g2 → teacher2 of school
-- ============================================================

INSERT INTO groups
  (id, name, "teacherId", "schoolId", capacity, "createdAt", "updatedAt")
VALUES
  ('11c55e67-ae5b-4b4a-892a-d2aacb7f5c0b', 'A-guruh', 'd77eb37b-0da4-4530-8096-9ea221e9a891', 'eec19bb5-36ae-4006-a330-031d07654c40', 20, NOW(), NOW()),
  ('858467d6-d7d3-4c41-aa90-5f9dfba4471c', 'B-guruh', '4ffa3e08-d35e-457f-a930-7f6d6c562b9f', 'eec19bb5-36ae-4006-a330-031d07654c40', 20, NOW(), NOW()),
  ('0e032c17-c159-4596-8748-ede45861a790', 'A-guruh', '7152d1eb-059e-4905-90ee-36a561f268be', '7b27fadd-3532-4e53-a5e3-79bc652a947f', 20, NOW(), NOW()),
  ('a8e2026f-ce3f-4a46-83e9-d3933d9b84f4', 'B-guruh', 'efd5f5c1-ef54-4f70-b75e-966dae73033e', '7b27fadd-3532-4e53-a5e3-79bc652a947f', 20, NOW(), NOW()),
  ('fc37f4e4-0f4a-436f-ad6f-9abedc8cac22', 'A-guruh', '188cb980-4835-4a91-9c62-10dd8a4789d7', '2dac6af4-96c9-4c4f-8430-aac62440f4e5', 20, NOW(), NOW()),
  ('af7976a0-9c4c-4e56-8d56-a8de89ab15ce', 'B-guruh', '20bf29bf-7efa-43d7-81fd-fe921185c5a2', '2dac6af4-96c9-4c4f-8430-aac62440f4e5', 20, NOW(), NOW()),
  ('500bc2d6-2eb0-4c35-a830-69da26cdeb09', 'A-guruh', '56009e7e-1420-451d-8bd9-91f03249d86e', '5334e23c-a749-4808-8b9a-1f8c67aa1938', 20, NOW(), NOW()),
  ('6e1ce20c-42e6-4931-9a25-dd8577c9cbfc', 'B-guruh', '880e989b-7cfc-4d26-8fcc-399f8ae8f528', '5334e23c-a749-4808-8b9a-1f8c67aa1938', 20, NOW(), NOW());

-- ============================================================
-- STEP 5: CHILDREN (12 total — 3 per school, one per parent)
-- Wiring: child.groupId → group.teacherId (isTeacherAssignedToChild)
-- Layout per school:
--   child1 (parent1) → A-guruh (teacher1)
--   child2 (parent2) → A-guruh (teacher1)
--   child3 (parent3) → B-guruh (teacher2)
-- ============================================================

-- School 1 children
INSERT INTO children
  (id, "parentId", "firstName", "lastName", "dateOfBirth", gender,
   "disabilityType", class, teacher, "schoolId", "groupId",
   "emergencyContact", "createdAt", "updatedAt")
VALUES
  ('08b49ab0-c2f8-4921-b1d0-32554bc2b4ab',
   'e67cf25b-e129-4f3d-89b3-eef89b77c2b0',
   'Asilbek', 'Hulkarovich', '2020-03-15', 'Male',
   'Aqliy rivojlanish orqaligi', '1-sinf', 'Malika Yunusova',
   'eec19bb5-36ae-4006-a330-031d07654c40', '11c55e67-ae5b-4b4a-892a-d2aacb7f5c0b',
   '{}', NOW(), NOW()),

  ('cac33a77-53e5-430f-819e-6cf85d7fa4bb',
   'a297d236-5350-42f5-941d-3404c03d281e',
   'Gulnora', 'Diloromovna', '2019-07-22', 'Female',
   'Nutq rivojlanishidan orqada', '1-sinf', 'Malika Yunusova',
   'eec19bb5-36ae-4006-a330-031d07654c40', '11c55e67-ae5b-4b4a-892a-d2aacb7f5c0b',
   '{}', NOW(), NOW()),

  ('365a0608-7943-427f-8e17-2599899cd93a',
   '2ce225a6-c619-4cee-a694-583079418a92',
   'Muhammadali', 'Jasurovich', '2021-01-10', 'Male',
   'Eshitish qobiliyatining kamayishi', '1-sinf', 'Nodir Ismoilov',
   'eec19bb5-36ae-4006-a330-031d07654c40', '858467d6-d7d3-4c41-aa90-5f9dfba4471c',
   '{}', NOW(), NOW());

-- School 2 children
INSERT INTO children
  (id, "parentId", "firstName", "lastName", "dateOfBirth", gender,
   "disabilityType", class, teacher, "schoolId", "groupId",
   "emergencyContact", "createdAt", "updatedAt")
VALUES
  ('d8b10eb4-8d60-40fc-bb0d-ecaea1d80b12',
   '4797b521-fe3a-4570-9855-0154ad4d9e99',
   'Nodira', 'Kamolaovna', '2020-06-18', 'Female',
   'Ko''rib chiqish qobiliyatining kamayishi', '1-sinf', 'Feruza Qosimova',
   '7b27fadd-3532-4e53-a5e3-79bc652a947f', '0e032c17-c159-4596-8748-ede45861a790',
   '{}', NOW(), NOW()),

  ('4eb13936-d4a8-42f4-bf79-88d8b65a1e70',
   '5a4c4628-cd4e-4925-ab02-8351161af8c3',
   'Otabek', 'Layloevich', '2019-11-05', 'Male',
   'Harakat buzilishi', '1-sinf', 'Feruza Qosimova',
   '7b27fadd-3532-4e53-a5e3-79bc652a947f', '0e032c17-c159-4596-8748-ede45861a790',
   '{}', NOW(), NOW()),

  ('21f7c7ab-0d49-4e5c-a2fb-b263b19b791d',
   'a8cd6ab5-4e10-4322-a744-351566bf760f',
   'Parviz', 'Mansurovich', '2021-04-25', 'Male',
   'Autizm spektri buzilishi', '1-sinf', 'Doniyor Xoliqov',
   '7b27fadd-3532-4e53-a5e3-79bc652a947f', 'a8e2026f-ce3f-4a46-83e9-d3933d9b84f4',
   '{}', NOW(), NOW());

-- School 3 children
INSERT INTO children
  (id, "parentId", "firstName", "lastName", "dateOfBirth", gender,
   "disabilityType", class, teacher, "schoolId", "groupId",
   "emergencyContact", "createdAt", "updatedAt")
VALUES
  ('501f9bb2-5b83-43a7-b2cd-5393c7c0ceab',
   '07f21999-66af-47c4-8541-478bd9ce3bad',
   'Qunduz', 'Nafisaovna', '2020-09-12', 'Female',
   'Aqliy rivojlanish orqaligi', '1-sinf', 'Shahnoza Ergasheva',
   '2dac6af4-96c9-4c4f-8430-aac62440f4e5', 'fc37f4e4-0f4a-436f-ad6f-9abedc8cac22',
   '{}', NOW(), NOW()),

  ('e30dff0f-d718-408c-b100-5c9501ba0daa',
   '6bebc5f6-414f-4fe1-9791-f210af285460',
   'Rustam', 'Ozodinovich', '2019-02-28', 'Male',
   'Nutq rivojlanishidan orqada', '1-sinf', 'Shahnoza Ergasheva',
   '2dac6af4-96c9-4c4f-8430-aac62440f4e5', 'fc37f4e4-0f4a-436f-ad6f-9abedc8cac22',
   '{}', NOW(), NOW()),

  ('d6568750-e0f7-4bd8-aa54-b352bb3f172e',
   'b4a6e261-b92e-4ddf-9599-884135037257',
   'Sarvinoz', 'Pahlavonovna', '2021-08-07', 'Female',
   'Emotsional-iroda buzilishi', '1-sinf', 'Erkin Nazarov',
   '2dac6af4-96c9-4c4f-8430-aac62440f4e5', 'af7976a0-9c4c-4e56-8d56-a8de89ab15ce',
   '{}', NOW(), NOW());

-- School 4 children
INSERT INTO children
  (id, "parentId", "firstName", "lastName", "dateOfBirth", gender,
   "disabilityType", class, teacher, "schoolId", "groupId",
   "emergencyContact", "createdAt", "updatedAt")
VALUES
  ('78d1f578-956c-42c7-81f5-9eafc994219b',
   '2f97d75c-5c82-483b-b2a7-4ef1ec29e980',
   'Tohir', 'Ranoevich', '2020-12-01', 'Male',
   'Eshitish qobiliyatining kamayishi', '1-sinf', 'Maftuna Aliyeva',
   '5334e23c-a749-4808-8b9a-1f8c67aa1938', '500bc2d6-2eb0-4c35-a830-69da26cdeb09',
   '{}', NOW(), NOW()),

  ('c3788fed-4c86-4577-b390-848948c55a7e',
   'd86a143f-2fb3-4a1b-8a00-cf9f7795e78e',
   'Ulugbek', 'Sanjarovich', '2019-05-19', 'Male',
   'Harakat buzilishi', '1-sinf', 'Maftuna Aliyeva',
   '5334e23c-a749-4808-8b9a-1f8c67aa1938', '500bc2d6-2eb0-4c35-a830-69da26cdeb09',
   '{}', NOW(), NOW()),

  ('f52ed345-6de6-4e7c-8a65-e82ba59418c2',
   '248f4087-fd38-4c92-bdda-cf6d2ed55696',
   'Feruza', 'Tursunovna', '2021-10-30', 'Female',
   'Ko''rib chiqish qobiliyatining kamayishi', '1-sinf', 'Akmal Pulatov',
   '5334e23c-a749-4808-8b9a-1f8c67aa1938', '6e1ce20c-42e6-4931-9a25-dd8577c9cbfc',
   '{}', NOW(), NOW());

-- ============================================================
-- VERIFICATION: count all inserted rows
-- ============================================================

SELECT 'schools'  AS tbl, COUNT(*)::int AS n FROM schools;
SELECT 'users'    AS tbl, COUNT(*)::int AS n FROM users;
SELECT 'groups'   AS tbl, COUNT(*)::int AS n FROM groups;
SELECT 'children' AS tbl, COUNT(*)::int AS n FROM children;

COMMIT;

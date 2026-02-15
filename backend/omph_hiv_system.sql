-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 15, 2026 at 05:15 AM
-- Server version: 8.0.45-0ubuntu0.24.04.1
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `omph_hiv_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('ADMIN','NURSE','PATIENT') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PATIENT',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `position` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `id` int NOT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date_of_birth` date NOT NULL,
  `gender` enum('MALE','FEMALE','OTHER') COLLATE utf8mb4_general_ci NOT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `contact_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consent` tinyint(1) NOT NULL DEFAULT '0',
  `hiv_status` enum('REACTIVE','NON_REACTIVE') COLLATE utf8mb4_general_ci NOT NULL,
  `diagnosis_date` date DEFAULT NULL,
  `art_start_date` date DEFAULT NULL,
  `latest_cd4_count` int DEFAULT NULL,
  `latest_viral_load` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointment_types`
--

CREATE TABLE `appointment_types` (
  `id` int NOT NULL,
  `type_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `duration_minutes` int DEFAULT '30',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int NOT NULL,
  `appointment_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `appointment_type_id` int NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `status` enum('SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'SCHEDULED',
  `notes` text COLLATE utf8mb4_general_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `queue`
--

CREATE TABLE `queue` (
  `id` int NOT NULL,
  `appointment_id` int NOT NULL,
  `queue_number` int NOT NULL,
  `priority` tinyint DEFAULT '0',
  `status` enum('WAITING','CALLED','SERVING','COMPLETED','SKIPPED') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'WAITING',
  `called_at` timestamp NULL DEFAULT NULL,
  `served_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `medications`
--

CREATE TABLE `medications` (
  `id` int NOT NULL,
  `medication_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `generic_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dosage_form` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `strength` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `stock_quantity` int DEFAULT '0',
  `reorder_level` int DEFAULT '10',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescriptions`
--

CREATE TABLE `prescriptions` (
  `id` int NOT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `appointment_id` int DEFAULT NULL,
  `medication_id` int NOT NULL,
  `dosage_instructions` text COLLATE utf8mb4_general_ci,
  `quantity_prescribed` int NOT NULL,
  `refills_remaining` int DEFAULT '0',
  `prescribed_by` int NOT NULL,
  `prescribed_date` date NOT NULL,
  `status` enum('ACTIVE','COMPLETED','CANCELLED','EXPIRED') COLLATE utf8mb4_general_ci DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lab_results`
--

CREATE TABLE `lab_results` (
  `id` int NOT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `appointment_id` int DEFAULT NULL,
  `test_type` enum('CD4','VIRAL_LOAD','COMPLETE_BLOOD_COUNT','LIVER_FUNCTION','RENAL_FUNCTION','OTHER') COLLATE utf8mb4_general_ci NOT NULL,
  `test_date` date NOT NULL,
  `result_value` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `result_unit` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_range` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `interpretation` text COLLATE utf8mb4_general_ci,
  `performed_by` int DEFAULT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `action_type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `record_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `patient_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_general_ci,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Insert data (carefully ordered to avoid foreign key issues)
--

-- First, insert the admin user
INSERT INTO `users` (`id`, `username`, `password_hash`, `email`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2b$10$MwWd30/7Xt.LhhFLbzJFaOXTrmBzbKgRkX/4qs6CXXpjhheeOcCd2', NULL, 'ADMIN', 1, '2026-02-15 05:01:05', '2025-11-26 02:59:49', '2026-02-15 05:01:05');

-- Insert admin staff details
INSERT INTO `staff` (`id`, `user_id`, `first_name`, `last_name`, `middle_name`, `position`, `contact_number`) VALUES
(1, 1, 'System', 'Administrator', NULL, 'System Administrator', NULL);

-- Insert appointment types (essential lookup data)
INSERT INTO `appointment_types` (`id`, `type_name`, `description`, `duration_minutes`) VALUES
(1, 'Consultation', 'Regular medical consultation with doctor', 30),
(2, 'Lab Test', 'Blood work and laboratory tests', 20),
(3, 'Medication Refill', 'Regular medication pickup and refill', 15),
(4, 'Counseling', 'Psychological or adherence counseling', 45),
(5, 'Emergency', 'Urgent medical attention', 60);

-- Insert sample medications (essential for system to work)
INSERT INTO `medications` (`id`, `medication_name`, `generic_name`, `dosage_form`, `strength`, `stock_quantity`, `reorder_level`) VALUES
(1, 'Tenofovir/Emtricitabine', 'Truvada', 'Tablet', '300mg/200mg', 150, 30),
(2, 'Dolutegravir', 'Tivicay', 'Tablet', '50mg', 100, 20),
(3, 'Efavirenz', 'Sustiva', 'Capsule', '600mg', 75, 15),
(4, 'Lamivudine', 'Epivir', 'Tablet', '150mg', 200, 40),
(5, 'Zidovudine', 'Retrovir', 'Capsule', '100mg', 120, 25);

-- Reset AUTO_INCREMENT values to avoid conflicts
ALTER TABLE `users` AUTO_INCREMENT = 2;
ALTER TABLE `staff` AUTO_INCREMENT = 2;
ALTER TABLE `appointment_types` AUTO_INCREMENT = 6;
ALTER TABLE `medications` AUTO_INCREMENT = 6;

-- --------------------------------------------------------

--
-- Indexes and constraints
--

-- Indexes for table `users`
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role` (`role`);

-- Indexes for table `staff`
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_name` (`last_name`,`first_name`);

-- Indexes for table `patients`
ALTER TABLE `patients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `patient_id` (`patient_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_patient_id` (`patient_id`),
  ADD KEY `idx_name` (`last_name`,`first_name`),
  ADD KEY `idx_hiv_status` (`hiv_status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`),
  ADD KEY `idx_diagnosis_date` (`diagnosis_date`);

-- Indexes for table `appointment_types`
ALTER TABLE `appointment_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type_name` (`type_name`);

-- Indexes for table `appointments`
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `appointment_number` (`appointment_number`),
  ADD KEY `idx_patient_id` (`patient_id`),
  ADD KEY `idx_appointment_type` (`appointment_type_id`),
  ADD KEY `idx_scheduled_at` (`scheduled_at`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`);

-- Indexes for table `queue`
ALTER TABLE `queue`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_appointment_queue` (`appointment_id`),
  ADD KEY `idx_queue_number_date` (`queue_number`,`created_at`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

-- Indexes for table `medications`
ALTER TABLE `medications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `medication_name` (`medication_name`),
  ADD KEY `idx_stock` (`stock_quantity`),
  ADD KEY `idx_is_active` (`is_active`);

-- Indexes for table `prescriptions`
ALTER TABLE `prescriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_patient_id` (`patient_id`),
  ADD KEY `idx_appointment_id` (`appointment_id`),
  ADD KEY `idx_medication_id` (`medication_id`),
  ADD KEY `idx_prescribed_by` (`prescribed_by`),
  ADD KEY `idx_status` (`status`);

-- Indexes for table `lab_results`
ALTER TABLE `lab_results`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_patient_id` (`patient_id`),
  ADD KEY `idx_appointment_id` (`appointment_id`),
  ADD KEY `idx_test_type` (`test_type`),
  ADD KEY `idx_test_date` (`test_date`),
  ADD KEY `idx_performed_by` (`performed_by`);

-- Indexes for table `audit_logs`
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action_type` (`action_type`),
  ADD KEY `idx_table_name` (`table_name`),
  ADD KEY `idx_patient_id` (`patient_id`),
  ADD KEY `idx_timestamp` (`timestamp`);

-- AUTO_INCREMENT
ALTER TABLE `users` MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `staff` MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `patients` MODIFY `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `appointment_types` MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
ALTER TABLE `appointments` MODIFY `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `queue` MODIFY `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `medications` MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
ALTER TABLE `prescriptions` MODIFY `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `lab_results` MODIFY `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `audit_logs` MODIFY `id` int NOT NULL AUTO_INCREMENT;

-- Foreign key constraints (add these AFTER all tables are created)
ALTER TABLE `staff`
  ADD CONSTRAINT `fk_staff_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `patients`
  ADD CONSTRAINT `fk_patients_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_patients_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_patients_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `appointments`
  ADD CONSTRAINT `fk_appointments_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_type_id` FOREIGN KEY (`appointment_type_id`) REFERENCES `appointment_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `queue`
  ADD CONSTRAINT `fk_queue_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `prescriptions`
  ADD CONSTRAINT `fk_prescriptions_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_medication_id` FOREIGN KEY (`medication_id`) REFERENCES `medications` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prescriptions_prescribed_by` FOREIGN KEY (`prescribed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `lab_results`
  ADD CONSTRAINT `fk_lab_results_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lab_results_appointment_id` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lab_results_performed_by` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
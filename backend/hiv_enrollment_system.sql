-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 26, 2025 at 08:12 AM
-- Server version: 8.0.44-0ubuntu0.24.04.1
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hiv_enrollment_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

CREATE TABLE `admin_users` (
  `id` int NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `password_hash`, `full_name`, `email`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2b$10$MwWd30/7Xt.LhhFLbzJFaOXTrmBzbKgRkX/4qs6CXXpjhheeOcCd2', 'System Administrator', NULL, 1, NULL, '2025-11-26 02:59:49', '2025-11-26 02:59:49');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `patient_id` varchar(255) DEFAULT NULL,
  `description` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_user_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `action_type`, `patient_id`, `description`, `ip_address`, `timestamp`, `admin_user_id`) VALUES
(1, 'PATIENT_UPDATED', 'HIV-1764131544974-3652', 'Patient Jan (HIV-1764131544974-3652) updated', '::ffff:127.0.0.1', '2025-11-26 06:31:33', 1),
(2, 'PATIENT_UPDATED', 'HIV-1764131544974-3652', 'Patient yJan (HIV-1764131544974-3652) updated', '::ffff:127.0.0.1', '2025-11-26 06:34:12', 1),
(3, 'DLT_VERIFICATION', 'HIV-1764131544974-3652', 'DLT verification failed for patient yJan', '::ffff:127.0.0.1', '2025-11-26 06:43:21', 1),
(4, 'DLT_VERIFICATION', 'HIV-1764131544974-3652', 'DLT verification failed for patient yJan', '::ffff:127.0.0.1', '2025-11-26 06:43:28', 1),
(5, 'DLT_VERIFICATION', 'HIV-1764131544974-3652', 'DLT verification failed for patient yJan', '::ffff:127.0.0.1', '2025-11-26 06:43:46', 1),
(6, 'PATIENT_DELETED', 'HIV-P-001', 'Patient John Doe (HIV-P-001) deleted', '::ffff:127.0.0.1', '2025-11-26 06:46:58', 1),
(7, 'PATIENT_DELETED', 'HIV-1764120387540-9339', 'Patient Juli (HIV-1764120387540-9339) deleted', '::ffff:127.0.0.1', '2025-11-26 06:47:06', 1),
(8, 'DLT_VERIFICATION', 'HIV-1764131544974-3652', 'DLT verification failed for patient yJan', '::ffff:127.0.0.1', '2025-11-26 06:47:14', 1),
(9, 'DLT_VERIFICATION', 'HIV-1764131544974-3652', 'DLT verification failed for patient yJan', '::ffff:127.0.0.1', '2025-11-26 06:47:30', 1),
(10, 'PATIENT_CREATED', 'HIV-1764139673442-7719', 'Patient teyq (HIV-1764139673442-7719) enrolled', '::ffff:127.0.0.1', '2025-11-26 06:47:53', 1),
(11, 'PATIENT_CREATED', 'HIV-1764143568018-1731', 'Patient iurqoye (HIV-1764143568018-1731) enrolled', '::ffff:127.0.0.1', '2025-11-26 07:52:48', 1),
(12, 'PATIENT_UPDATED', 'HIV-1764139673442-7719', 'Patient teyq (HIV-1764139673442-7719) updated', '::ffff:127.0.0.1', '2025-11-26 08:06:21', 1),
(13, 'PATIENT_CREATED', 'HIV-1764144545472-4062', 'Patient oruiow (HIV-1764144545472-4062) enrolled', '::ffff:127.0.0.1', '2025-11-26 08:09:05', 1),
(14, 'PATIENT_CREATED', 'HIV-1764144580165-9750', 'Patient iuiyqer (HIV-1764144580165-9750) enrolled', '::ffff:127.0.0.1', '2025-11-26 08:09:40', 1),
(15, 'DLT_VERIFICATION', 'HIV-1764144580165-9750', 'DLT verification failed for patient iuiyqer', '::ffff:127.0.0.1', '2025-11-26 08:09:49', 1),
(16, 'DLT_VERIFICATION', 'HIV-1764144580165-9750', 'DLT verification failed for patient iuiyqer', '::ffff:127.0.0.1', '2025-11-26 08:09:59', 1),
(17, 'DLT_VERIFICATION', 'HIV-1764144580165-9750', 'DLT verification failed for patient iuiyqer', '::ffff:127.0.0.1', '2025-11-26 08:11:00', 1);

-- --------------------------------------------------------

--
-- Table structure for table `biometric_links`
--

CREATE TABLE `biometric_links` (
  `id` int NOT NULL,
  `patient_id` varchar(50) NOT NULL,
  `biometric_type` enum('fingerprint','facial','iris','voice') NOT NULL,
  `biometric_data` text NOT NULL,
  `biometric_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `biometric_links`
--

INSERT INTO `biometric_links` (`id`, `patient_id`, `biometric_type`, `biometric_data`, `biometric_hash`, `created_at`, `updated_at`, `is_active`) VALUES
(1, 'HIV-1764143568018-1731', 'fingerprint', 'biometric_HIV-1764143568018-1731_1764143568070', 'e83fbd265a6508338c6b3db3394cbe647aadfedf063a3fc95f2267827614047c', '2025-11-26 07:52:48', '2025-11-26 07:52:48', 1),
(2, 'HIV-1764144545472-4062', 'fingerprint', 'biometric_HIV-1764144545472-4062_1764144545531', 'b7c490038297f2c38158cbd2b5fae8fa29e720140b1bb5c58b8cfa70d57b6a59', '2025-11-26 08:09:05', '2025-11-26 08:09:05', 1),
(3, 'HIV-1764144580165-9750', 'fingerprint', 'biometric_HIV-1764144580165-9750_1764144580260', '3395617eb62cb7b1411d05e541de8776aec8e661ab9d4b3176486607052b233b', '2025-11-26 08:09:40', '2025-11-26 08:09:40', 1);

-- --------------------------------------------------------

--
-- Table structure for table `dlt_hashes`
--

CREATE TABLE `dlt_hashes` (
  `id` int NOT NULL,
  `patient_id` varchar(50) NOT NULL,
  `data_hash` varchar(64) NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_id` varchar(255) DEFAULT NULL,
  `block_hash` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT '0',
  `verification_timestamp` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `dlt_hashes`
--

INSERT INTO `dlt_hashes` (`id`, `patient_id`, `data_hash`, `timestamp`, `transaction_id`, `block_hash`, `verified`, `verification_timestamp`) VALUES
(5, 'HIV-1764131544974-3652', '0518032b4b143843601a4f5d4572d246bc544fb0d6c409f121798f9183c34948', '2025-11-26 04:32:24', NULL, NULL, 0, '2025-11-26 05:34:57'),
(6, 'HIV-1764144580165-9750', '96ab1d4c217b0913cb3abee69422d55b4a9c7cf8c0709b28d1b16009ea9004d5', '2025-11-26 08:09:40', NULL, NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `id` int NOT NULL,
  `patient_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `date_of_birth` date NOT NULL,
  `contact_info` varchar(500) DEFAULT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `consent` tinyint(1) NOT NULL DEFAULT '0',
  `hiv_status` enum('Reactive','Non-Reactive') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dlt_status` enum('pending','verified','failed') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `patients`
--

INSERT INTO `patients` (`id`, `patient_id`, `name`, `date_of_birth`, `contact_info`, `contact`, `consent`, `hiv_status`, `created_at`, `updated_at`, `dlt_status`) VALUES
(4, 'HIV-1764131544974-3652', 'yJan', '2014-10-26', '090384878366', NULL, 1, 'Non-Reactive', '2025-11-26 04:32:24', '2025-11-26 06:34:20', 'failed'),
(5, 'HIV-1764137980233-6504', 'Kaj', '2025-10-27', '0937823623', NULL, 1, 'Non-Reactive', '2025-11-26 06:19:40', '2025-11-26 06:19:40', 'pending'),
(6, 'HIV-1764139673442-7719', 'teyq', '2025-10-26', '0997843868', NULL, 1, 'Reactive', '2025-11-26 06:47:53', '2025-11-26 08:06:21', 'pending'),
(7, 'HIV-1764143568018-1731', 'iurqoye', '2025-10-27', '0923781264', NULL, 1, 'Reactive', '2025-11-26 07:52:48', '2025-11-26 07:52:48', 'pending'),
(8, 'HIV-1764144545472-4062', 'oruiow', '2025-10-27', '0943476723', NULL, 1, 'Non-Reactive', '2025-11-26 08:09:05', '2025-11-26 08:09:05', 'pending'),
(9, 'HIV-1764144580165-9750', 'iuiyqer', '2025-10-26', '0973825673', NULL, 1, 'Reactive', '2025-11-26 08:09:40', '2025-11-26 08:09:48', 'failed');

-- --------------------------------------------------------

--
-- Stand-in structure for view `patient_details`
-- (See below for the actual view)
--
CREATE TABLE `patient_details` (
);

-- --------------------------------------------------------

--
-- Structure for view `patient_details`
--
DROP TABLE IF EXISTS `patient_details`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `patient_details`  AS SELECT `p`.`patient_id` AS `patient_id`, `p`.`name` AS `name`, `p`.`date_of_birth` AS `date_of_birth`, `p`.`contact` AS `contact`, `p`.`contact_info` AS `contact_info`, `p`.`consent` AS `consent`, (case when (`p`.`consent` = true) then 'YES' else 'NO' end) AS `consent_status`, `p`.`hiv_status` AS `hiv_status`, `p`.`created_at` AS `created_at`, max(`bl`.`biometric_id`) AS `biometric_id`, count(`dh`.`id`) AS `dlt_hash_count`, max((case when (`dh`.`verified` = true) then 1 else 0 end)) AS `dlt_verified`, (case when ((count(`dh`.`id`) > 0) and (max((case when (`dh`.`verified` = true) then 1 else 0 end)) = 1)) then 'verified' when ((count(`dh`.`id`) > 0) and (max((case when (`dh`.`verified` = true) then 1 else 0 end)) = 0)) then 'failed' else 'pending' end) AS `dlt_status` FROM ((`patients` `p` left join `biometric_links` `bl` on(((`p`.`patient_id` = `bl`.`patient_id`) and (`bl`.`is_active` = true)))) left join `dlt_hashes` `dh` on((`p`.`patient_id` = `dh`.`patient_id`))) GROUP BY `p`.`patient_id`, `p`.`name`, `p`.`date_of_birth`, `p`.`contact`, `p`.`contact_info`, `p`.`consent`, `p`.`hiv_status`, `p`.`created_at` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_username` (`username`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_action_type` (`action_type`),
  ADD KEY `idx_patient_id` (`patient_id`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `admin_user_id` (`admin_user_id`);

--
-- Indexes for table `biometric_links`
--
ALTER TABLE `biometric_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_patient_biometric` (`patient_id`,`biometric_type`),
  ADD KEY `idx_patient_id` (`patient_id`),
  ADD KEY `idx_biometric_hash` (`biometric_hash`);

--
-- Indexes for table `dlt_hashes`
--
ALTER TABLE `dlt_hashes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_data_hash` (`data_hash`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_patient_timestamp` (`patient_id`,`timestamp`);

--
-- Indexes for table `patients`
--
ALTER TABLE `patients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `patient_id` (`patient_id`),
  ADD KEY `idx_patient_id` (`patient_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `biometric_links`
--
ALTER TABLE `biometric_links`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `dlt_hashes`
--
ALTER TABLE `dlt_hashes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `patients`
--
ALTER TABLE `patients`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `biometric_links`
--
ALTER TABLE `biometric_links`
  ADD CONSTRAINT `biometric_links_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE;

--
-- Constraints for table `dlt_hashes`
--
ALTER TABLE `dlt_hashes`
  ADD CONSTRAINT `dlt_hashes_ibfk_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

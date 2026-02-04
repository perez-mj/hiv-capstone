-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 04, 2026 at 06:00 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

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
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `email`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2b$10$MwWd30/7Xt.LhhFLbzJFaOXTrmBzbKgRkX/4qs6CXXpjhheeOcCd2', 'System Administrator', NULL, 1, NULL, '2025-11-26 02:59:49', '2025-11-26 02:59:49');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `patient_id` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `action_type`, `patient_id`, `description`, `ip_address`, `timestamp`, `user_id`) VALUES
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
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `id` int(11) NOT NULL,
  `patient_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `date_of_birth` date NOT NULL,
  `contact_info` varchar(500) DEFAULT NULL,
  `consent` tinyint(1) NOT NULL DEFAULT 0,
  `hiv_status` enum('Reactive','Non-Reactive') NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patients`
--

INSERT INTO `patients` (`id`, `patient_id`, `name`, `date_of_birth`, `contact_info`, `consent`, `hiv_status`, `created_at`, `updated_at`) VALUES
(4, 'HIV-1764131544974-3652', 'yJan', '2014-10-26', '090384878366', 1, 'Non-Reactive', '2025-11-26 04:32:24', '2025-11-26 06:34:20'),
(5, 'HIV-1764137980233-6504', 'Kaj', '2025-10-27', '0937823623', 1, 'Non-Reactive', '2025-11-26 06:19:40', '2025-11-26 06:19:40'),
(6, 'HIV-1764139673442-7719', 'teyq', '2025-10-26', '0997843868', 1, 'Reactive', '2025-11-26 06:47:53', '2025-11-26 08:06:21'),
(7, 'HIV-1764143568018-1731', 'iurqoye', '2025-10-27', '0923781264', 1, 'Reactive', '2025-11-26 07:52:48', '2025-11-26 07:52:48'),
(8, 'HIV-1764144545472-4062', 'oruiow', '2025-10-27', '0943476723', 1, 'Non-Reactive', '2025-11-26 08:09:05', '2025-11-26 08:09:05'),
(9, 'HIV-1764144580165-9750', 'iuiyqer', '2025-10-26', '0973825673', 1, 'Reactive', '2025-11-26 08:09:40', '2025-11-26 08:09:48');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
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
  ADD KEY `fk_audit_logs_user_id` (`user_id`);

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
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `patients`
--
ALTER TABLE `patients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
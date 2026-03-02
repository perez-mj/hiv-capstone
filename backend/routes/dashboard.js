// backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// ==================== ADMIN (HEAD NURSE) DASHBOARD ROUTES ====================

/**
 * Get head nurse/admin dashboard statistics
 * Returns overview statistics for the entire system
 */
router.get('/admin', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        // Get total patients count
        const [totalPatients] = await pool.execute(
            'SELECT COUNT(*) as count FROM patients'
        );

        // Get patients by HIV status
        const [patientsByStatus] = await pool.execute(`
            SELECT 
                hiv_status,
                COUNT(*) as count
            FROM patients
            GROUP BY hiv_status
        `);

        // Get today's appointments count
        const [todayAppointments] = await pool.execute(`
            SELECT 
                COUNT(*) as count,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'SCHEDULED' THEN 1 ELSE 0 END) as scheduled,
                SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
            FROM appointments 
            WHERE DATE(scheduled_at) = CURDATE()
        `);

        // Get current queue status
        const [queueStatus] = await pool.execute(`
            SELECT 
                COUNT(*) as total_in_queue,
                SUM(CASE WHEN q.status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN q.status = 'CALLED' THEN 1 ELSE 0 END) as called,
                SUM(CASE WHEN q.status = 'SERVING' THEN 1 ELSE 0 END) as serving,
                SUM(CASE WHEN q.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
            FROM queue q
            WHERE DATE(q.created_at) = CURDATE()
        `);

        // Get staff count (excluding patients)
        const [staffCount] = await pool.execute(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE role IN ('ADMIN', 'NURSE')
        `);

        // Get recent appointments with patient details
        const [recentAppointments] = await pool.execute(`
            SELECT 
                a.id,
                a.appointment_number,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                p.patient_facility_code,
                at.type_name as appointment_type,
                a.scheduled_at,
                a.status,
                a.notes,
                u.username as created_by_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            LEFT JOIN users u ON a.created_by = u.id
            ORDER BY a.created_at DESC
            LIMIT 10
        `);

        // Get monthly statistics for the last 6 months
        const [monthlyStats] = await pool.execute(`
            SELECT 
                DATE_FORMAT(scheduled_at, '%Y-%m') as month,
                COUNT(*) as total_appointments,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
            FROM appointments
            WHERE scheduled_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(scheduled_at, '%Y-%m')
            ORDER BY month DESC
        `);

        // Get today's queue with patient names
        const [todayQueue] = await pool.execute(`
            SELECT 
                q.id,
                q.queue_number,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                at.type_name as appointment_type,
                q.status,
                q.created_at,
                TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) as waiting_minutes
            FROM queue q
            JOIN appointments a ON q.appointment_id = a.id
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            WHERE DATE(q.created_at) = CURDATE()
            ORDER BY 
                CASE q.status
                    WHEN 'SERVING' THEN 1
                    WHEN 'CALLED' THEN 2
                    WHEN 'WAITING' THEN 3
                    ELSE 4
                END,
                q.queue_number
        `);

        res.json({
            success: true,
            data: {
                overview: {
                    total_patients: totalPatients[0].count,
                    total_staff: staffCount[0].count,
                    patients_by_status: patientsByStatus,
                    today_appointments: todayAppointments[0],
                    current_queue: queueStatus[0] || { 
                        total_in_queue: 0, 
                        waiting: 0, 
                        called: 0, 
                        serving: 0, 
                        completed: 0 
                    }
                },
                recent_appointments: recentAppointments,
                monthly_statistics: monthlyStats,
                today_queue: todayQueue
            }
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch admin dashboard data' 
        });
    }
});

// ==================== NURSE DASHBOARD ROUTES ====================

/**
 * Get nurse dashboard statistics
 * Returns relevant data for nursing staff
 */
router.get('/nurse', authenticateToken, authorize('NURSE'), async (req, res) => {
    try {
        // Get nurse's information from staff table
        const [nurseInfo] = await pool.execute(
            `SELECT s.*, u.username, u.email 
             FROM staff s
             JOIN users u ON s.user_id = u.id
             WHERE s.user_id = ?`,
            [req.user.id]
        );

        if (nurseInfo.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Nurse profile not found' 
            });
        }

        const nurseId = nurseInfo[0].id;

        // Get today's appointments with patient details
        const [todayAppointments] = await pool.execute(`
            SELECT 
                a.id,
                a.appointment_number,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                p.patient_facility_code,
                p.date_of_birth,
                p.hiv_status,
                p.contact_number,
                at.type_name as appointment_type,
                a.scheduled_at,
                a.status,
                a.notes,
                q.queue_number,
                q.status as queue_status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            LEFT JOIN queue q ON a.id = q.appointment_id AND DATE(q.created_at) = CURDATE()
            WHERE DATE(a.scheduled_at) = CURDATE()
            ORDER BY 
                CASE 
                    WHEN q.queue_number IS NOT NULL THEN 0
                    ELSE 1
                END,
                q.queue_number,
                a.scheduled_at
        `);

        // Get current queue for today
        const [currentQueue] = await pool.execute(`
            SELECT 
                q.id,
                q.queue_number,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                p.patient_facility_code,
                at.type_name as appointment_type,
                q.status,
                q.created_at,
                TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) as waiting_minutes,
                a.id as appointment_id,
                a.notes as appointment_notes
            FROM queue q
            JOIN appointments a ON q.appointment_id = a.id
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            WHERE DATE(q.created_at) = CURDATE()
                AND q.status IN ('WAITING', 'CALLED', 'SERVING')
            ORDER BY 
                CASE q.status
                    WHEN 'SERVING' THEN 1
                    WHEN 'CALLED' THEN 2
                    WHEN 'WAITING' THEN 3
                END,
                q.queue_number
        `);

        // Get recent encounters handled by this nurse
        const [recentEncounters] = await pool.execute(`
            SELECT 
                ce.id,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                p.patient_facility_code,
                ce.type,
                ce.encounter_date,
                ce.notes
            FROM clinical_encounters ce
            JOIN patients p ON ce.patient_id = p.id
            WHERE ce.staff_id = ?
            ORDER BY ce.encounter_date DESC
            LIMIT 10
        `, [nurseId]);

        // Get pending lab results (results that need to be entered)
        const [pendingLabs] = await pool.execute(`
            SELECT 
                lr.id,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                p.patient_facility_code,
                lr.test_type,
                lr.test_date,
                a.appointment_number,
                a.id as appointment_id
            FROM lab_results lr
            JOIN patients p ON lr.patient_id = p.id
            LEFT JOIN appointments a ON lr.appointment_id = a.id
            WHERE (lr.result_value IS NULL OR lr.result_value = '')
                AND lr.test_date <= CURDATE()
            ORDER BY lr.test_date DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            data: {
                nurse: {
                    id: nurseInfo[0].id,
                    name: `${nurseInfo[0].first_name} ${nurseInfo[0].last_name}`,
                    position: nurseInfo[0].position,
                    contact_number: nurseInfo[0].contact_number
                },
                today_appointments: todayAppointments,
                current_queue: currentQueue,
                recent_encounters: recentEncounters,
                pending_lab_results: pendingLabs,
                queue_summary: {
                    waiting: currentQueue.filter(q => q.status === 'WAITING').length,
                    called: currentQueue.filter(q => q.status === 'CALLED').length,
                    serving: currentQueue.filter(q => q.status === 'SERVING').length,
                    total: currentQueue.length
                }
            }
        });
    } catch (error) {
        console.error('Nurse dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch nurse dashboard data' 
        });
    }
});

/**
 * Get nurse's daily schedule with queue integration
 */
router.get('/nurse/schedule', authenticateToken, authorize('NURSE'), async (req, res) => {
    try {
        const { date = new Date().toISOString().split('T')[0] } = req.query;

        const [schedule] = await pool.execute(`
            SELECT 
                a.id,
                a.appointment_number,
                CONCAT(p.first_name, ' ', p.last_name) as patient_name,
                p.patient_facility_code,
                p.contact_number,
                p.hiv_status,
                at.type_name as appointment_type,
                at.duration_minutes,
                a.scheduled_at,
                a.status as appointment_status,
                q.queue_number,
                q.status as queue_status,
                q.called_at,
                q.served_at,
                CASE 
                    WHEN q.id IS NOT NULL THEN 'In Queue'
                    WHEN a.status = 'COMPLETED' THEN 'Completed'
                    WHEN a.status = 'CANCELLED' THEN 'Cancelled'
                    WHEN a.status = 'NO_SHOW' THEN 'No Show'
                    ELSE 'Scheduled'
                END as current_status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            LEFT JOIN queue q ON a.id = q.appointment_id AND DATE(q.created_at) = DATE(a.scheduled_at)
            WHERE DATE(a.scheduled_at) = ?
            ORDER BY 
                CASE 
                    WHEN q.status = 'SERVING' THEN 1
                    WHEN q.status = 'CALLED' THEN 2
                    WHEN q.status = 'WAITING' THEN 3
                    WHEN a.status = 'SCHEDULED' THEN 4
                    WHEN a.status = 'CONFIRMED' THEN 5
                    ELSE 6
                END,
                q.queue_number,
                a.scheduled_at
        `, [date]);

        // Get statistics for the day
        const stats = {
            total: schedule.length,
            in_queue: schedule.filter(s => s.queue_status && ['WAITING', 'CALLED', 'SERVING'].includes(s.queue_status)).length,
            completed: schedule.filter(s => s.appointment_status === 'COMPLETED').length,
            scheduled: schedule.filter(s => ['SCHEDULED', 'CONFIRMED'].includes(s.appointment_status) && !s.queue_status).length,
            cancelled: schedule.filter(s => s.appointment_status === 'CANCELLED').length,
            no_show: schedule.filter(s => s.appointment_status === 'NO_SHOW').length
        };

        res.json({
            success: true,
            data: {
                date: date,
                appointments: schedule,
                statistics: stats
            }
        });
    } catch (error) {
        console.error('Nurse schedule error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch schedule' 
        });
    }
});

// ==================== PATIENT DASHBOARD ROUTES ====================

/**
 * Get patient dashboard statistics
 * Returns personalized data for the logged-in patient
 */
router.get('/patient', authenticateToken, authorize('PATIENT'), async (req, res) => {
    try {
        // Get patient's complete information
        const [patientInfo] = await pool.execute(`
            SELECT 
                p.*,
                u.username,
                u.email,
                u.last_login
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?
        `, [req.user.id]);

        if (patientInfo.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Patient profile not found' 
            });
        }

        const patient = patientInfo[0];
        const patientId = patient.id;

        // Get upcoming appointments
        const [upcomingAppointments] = await pool.execute(`
            SELECT 
                a.id,
                a.appointment_number,
                at.type_name as appointment_type,
                a.scheduled_at,
                a.status,
                a.notes,
                q.queue_number,
                q.status as queue_status
            FROM appointments a
            JOIN appointment_types at ON a.appointment_type_id = at.id
            LEFT JOIN queue q ON a.id = q.appointment_id AND DATE(q.created_at) = CURDATE()
            WHERE a.patient_id = ? 
                AND a.scheduled_at >= NOW()
                AND a.status IN ('SCHEDULED', 'CONFIRMED')
            ORDER BY a.scheduled_at
            LIMIT 5
        `, [patientId]);

        // Get recent lab results
        const [recentLabResults] = await pool.execute(`
            SELECT 
                id,
                test_type,
                test_date,
                result_value,
                result_unit,
                reference_range,
                interpretation,
                file_path
            FROM lab_results
            WHERE patient_id = ?
            ORDER BY test_date DESC
            LIMIT 10
        `, [patientId]);

        // Get recent clinical encounters
        const [recentEncounters] = await pool.execute(`
            SELECT 
                ce.id,
                ce.type,
                ce.encounter_date,
                ce.notes,
                CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                s.position
            FROM clinical_encounters ce
            JOIN staff s ON ce.staff_id = s.id
            WHERE ce.patient_id = ?
            ORDER BY ce.encounter_date DESC
            LIMIT 5
        `, [patientId]);

        // Get current queue position if any
        const [currentQueue] = await pool.execute(`
            SELECT 
                q.id,
                q.queue_number,
                q.status,
                q.created_at,
                a.scheduled_at,
                at.type_name as appointment_type,
                (
                    SELECT COUNT(*) + 1 
                    FROM queue q2 
                    WHERE DATE(q2.created_at) = CURDATE() 
                        AND q2.status IN ('WAITING', 'CALLED')
                        AND q2.queue_number < q.queue_number
                ) as position_ahead,
                (
                    SELECT COUNT(*) 
                    FROM queue q2 
                    WHERE DATE(q2.created_at) = CURDATE() 
                        AND q2.status IN ('WAITING', 'CALLED')
                ) as total_waiting
            FROM queue q
            JOIN appointments a ON q.appointment_id = a.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            WHERE a.patient_id = ? 
                AND DATE(q.created_at) = CURDATE()
                AND q.status IN ('WAITING', 'CALLED', 'SERVING')
            ORDER BY q.created_at DESC
            LIMIT 1
        `, [patientId]);

        // Calculate age
        const today = new Date();
        const birthDate = new Date(patient.date_of_birth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        // Format patient name
        const fullName = `${patient.first_name} ${patient.middle_name ? patient.middle_name + ' ' : ''}${patient.last_name}`;

        res.json({
            success: true,
            data: {
                patient: {
                    id: patient.id,
                    facility_code: patient.patient_facility_code,
                    full_name: fullName,
                    first_name: patient.first_name,
                    last_name: patient.last_name,
                    middle_name: patient.middle_name,
                    date_of_birth: patient.date_of_birth,
                    age: age,
                    sex: patient.sex,
                    address: patient.address,
                    contact_number: patient.contact_number,
                    hiv_status: patient.hiv_status,
                    diagnosis_date: patient.diagnosis_date,
                    art_start_date: patient.art_start_date,
                    latest_cd4_count: patient.latest_cd4_count,
                    latest_viral_load: patient.latest_viral_load
                },
                upcoming_appointments: upcomingAppointments,
                recent_lab_results: recentLabResults,
                recent_encounters: recentEncounters,
                current_queue: currentQueue[0] || null,
                summary: {
                    total_upcoming: upcomingAppointments.length,
                    total_lab_results: recentLabResults.length,
                    total_encounters: recentEncounters.length,
                    latest_cd4: patient.latest_cd4_count,
                    latest_viral_load: patient.latest_viral_load,
                    on_art: patient.art_start_date ? true : false
                }
            }
        });
    } catch (error) {
        console.error('Patient dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch patient dashboard data' 
        });
    }
});

// ==================== QUEUE STATUS ROUTES (Public/Kiosk) ====================

/**
 * Get current queue status for public display (kiosk mode)
 * This endpoint doesn't require authentication for public viewing
 */
router.get('/queue/public', async (req, res) => {
    try {
        const [queue] = await pool.execute(`
            SELECT 
                q.queue_number,
                CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as patient_name_initial,
                at.type_name as appointment_type,
                q.status,
                q.created_at,
                TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) as waiting_minutes,
                CASE 
                    WHEN q.status = 'WAITING' AND TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) > 30 THEN 'long_wait'
                    WHEN q.status = 'WAITING' AND TIMESTAMPDIFF(MINUTE, q.created_at, NOW()) > 15 THEN 'medium_wait'
                    ELSE 'normal'
                END as wait_category
            FROM queue q
            JOIN appointments a ON q.appointment_id = a.id
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            WHERE DATE(q.created_at) = CURDATE()
                AND q.status IN ('WAITING', 'CALLED', 'SERVING')
            ORDER BY 
                CASE q.status
                    WHEN 'SERVING' THEN 1
                    WHEN 'CALLED' THEN 2
                    WHEN 'WAITING' THEN 3
                END,
                q.queue_number
            LIMIT 20
        `);

        // Get currently serving
        const [currentlyServing] = await pool.execute(`
            SELECT 
                q.queue_number,
                CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as patient_name_initial,
                at.type_name as appointment_type,
                q.served_at
            FROM queue q
            JOIN appointments a ON q.appointment_id = a.id
            JOIN patients p ON a.patient_id = p.id
            JOIN appointment_types at ON a.appointment_type_id = at.id
            WHERE DATE(q.created_at) = CURDATE()
                AND q.status = 'SERVING'
            ORDER BY q.served_at DESC
            LIMIT 1
        `);

        // Get estimated wait time
        const waitingCount = queue.filter(q => q.status === 'WAITING').length;
        const avgServiceTime = 15; // minutes, can be calculated from historical data
        const estimatedWaitTime = waitingCount * avgServiceTime;

        res.json({
            success: true,
            data: {
                currently_serving: currentlyServing[0] || null,
                queue: queue,
                statistics: {
                    total_waiting: queue.filter(q => q.status === 'WAITING').length,
                    total_in_queue: queue.length,
                    estimated_wait_time: estimatedWaitTime,
                    last_updated: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Public queue error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch queue status' 
        });
    }
});

module.exports = router;
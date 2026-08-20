// micro-services/kiosk/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import printer service
const printerService = require('./printerService');

const app = express();
const PORT = process.env.PORT || 5000;

// Security token for shutdown/reboot
const SHUTDOWN_TOKEN = process.env.SHUTDOWN_TOKEN || 'your_secure_token_here';

// Middleware
app.use(cors());
app.use(express.json());

// Logging utility
const logFile = '/var/log/kiosk/service.log';
const log = (message, level = 'INFO') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    console.log(logMessage.trim());
    
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFile(logFile, logMessage, (err) => {
        if (err) console.error('Error writing to log:', err);
    });
};

// ============ PRINTER ENDPOINTS ============

// Print Endpoint
app.post('/api/kiosk/print', async (req, res) => {
    try {
        const { ticketData } = req.body;
        if (!ticketData || !ticketData.queue_number) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ticket data structure'
            });
        }

        const result = await printerService.printTicket(ticketData);
        log(`Print job completed: ${ticketData.queue_number} for ${ticketData.patient_name || 'Walk-in'}`);
        res.json({ success: true, ...result });
    } catch (error) {
        log(`Print error: ${error.message}`, 'ERROR');
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Check Printer Hardware Status
app.get('/api/kiosk/printer-status', async (req, res) => {
    try {
        const status = await printerService.detectPrinter();
        res.json({ success: true, status });
    } catch (error) {
        log(`Printer status error: ${error.message}`, 'ERROR');
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Printer Test Endpoint
app.post('/api/kiosk/printer-test', async (req, res) => {
    try {
        const testData = {
            office: 'TESTING',
            queue_number: 'T-000',
            patient_name: 'TEST PRINT',
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            wait_time: '0 mins'
        };
        const result = await printerService.printTicket(testData);
        log('Test print completed');
        res.json({
            success: true,
            message: 'Test page sent to queue',
            ...result
        });
    } catch (error) {
        log(`Test print error: ${error.message}`, 'ERROR');
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============ SYSTEM CONTROL ENDPOINTS ============

// Health check endpoint
app.get('/api/system/health', async (req, res) => {
    try {
        const printerStatus = await printerService.detectPrinter();
        res.json({
            success: true,
            status: 'online',
            service: 'kiosk',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            printer: printerStatus,
            system: {
                hostname: require('os').hostname(),
                platform: require('os').platform(),
                release: require('os').release(),
                memory: {
                    total: Math.round(require('os').totalmem() / 1024 / 1024) + 'MB',
                    free: Math.round(require('os').freemem() / 1024 / 1024) + 'MB'
                },
                cpu: require('os').cpus().length + ' cores'
            }
        });
    } catch (error) {
        res.json({
            success: true,
            status: 'online',
            service: 'kiosk-service',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    }
});

// Shutdown endpoint
app.post('/api/system/shutdown', (req, res) => {
    // Verify token
    const token = req.headers.authorization;
    if (token !== SHUTDOWN_TOKEN) {
        log(`WARNING: Unauthorized shutdown attempt from ${req.ip}`, 'WARN');
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid shutdown token'
        });
    }

    log(`Shutdown command received from ${req.ip}`);

    // Send response immediately
    res.json({
        success: true,
        message: 'Shutdown command received. System will power off in 3 seconds.',
        delay: 3,
        timestamp: new Date().toISOString()
    });

    // Execute shutdown with delay
    setTimeout(() => {
        log('Executing system shutdown...');
        exec('sudo shutdown -h now', (error, stdout, stderr) => {
            if (error) {
                log(`ERROR: Shutdown failed: ${error.message}`, 'ERROR');
                return;
            }
            if (stderr) {
                log(`STDERR: ${stderr}`, 'ERROR');
                return;
            }
            log(`Shutdown executed successfully: ${stdout}`);
        });
    }, 3000);
});

// Cancel shutdown endpoint
app.post('/api/system/cancel-shutdown', (req, res) => {
    const token = req.headers.authorization;
    if (token !== SHUTDOWN_TOKEN) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    log('Cancelling shutdown...');
    exec('sudo shutdown -c', (error, stdout, stderr) => {
        if (error) {
            log(`ERROR: Failed to cancel shutdown: ${error.message}`, 'ERROR');
            return res.status(500).json({
                success: false,
                error: 'Failed to cancel shutdown',
                details: error.message
            });
        }
        log('Shutdown cancelled successfully');
        res.json({
            success: true,
            message: 'Shutdown cancelled successfully',
            timestamp: new Date().toISOString()
        });
    });
});

// Reboot endpoint
app.post('/api/system/reboot', (req, res) => {
    const token = req.headers.authorization;
    if (token !== SHUTDOWN_TOKEN) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    log(`Reboot command received from ${req.ip}`);
    res.json({
        success: true,
        message: 'Reboot command received. System will reboot in 3 seconds.',
        delay: 3,
        timestamp: new Date().toISOString()
    });

    setTimeout(() => {
        log('Executing system reboot...');
        exec('sudo reboot', (error, stdout, stderr) => {
            if (error) {
                log(`ERROR: Reboot failed: ${error.message}`, 'ERROR');
                return;
            }
            log(`Reboot executed successfully: ${stdout}`);
        });
    }, 3000);
});

// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.path} not found`
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    log(`Unhandled error: ${err.message}`, 'ERROR');
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// ============ START SERVER ============

app.listen(PORT, '0.0.0.0', () => {
    log(`🚀 Kiosk Service running on port ${PORT}`);
    log(`📍 Access at: http://localhost:${PORT}`);
    log(`🖨️  Printer endpoints available at /api/kiosk/*`);
    log(`⚡ System endpoints available at /api/system/*`);
    log(`🔒 Security token: ${SHUTDOWN_TOKEN.substring(0, 10)}...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    log('Received SIGTERM signal, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    log('Received SIGINT signal, shutting down gracefully...');
    process.exit(0);
});
console.log('=== DEBUGGING MODULE IMPORTS ===');

// Check db import
const pool = require('./db');
console.log('Pool type:', typeof pool);
console.log('Pool has execute:', pool && typeof pool.execute === 'function');
console.log('Pool keys:', pool ? Object.keys(pool) : 'null');

// Check if pool is a promise
console.log('Is pool a promise?', pool && typeof pool.then === 'function');

// Try to get connection directly
if (pool && pool.getConnection) {
    console.log('Pool has getConnection method');
} else {
    console.log('Pool missing getConnection method');
}

// Import Appointment
const Appointment = require('./models/Appointment');
console.log('Appointment type:', typeof Appointment);
console.log('Appointment methods:', Appointment ? Object.keys(Appointment) : 'null');

console.log('=== END DEBUG ===');
// micro-services/printer/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const printerService = require('./printerService');

const app = express();
const PORT = process.env.PRINTER_PORT || 5000;

app.use(cors());
app.use(express.json());

// Print Endpoint
app.post('/api/kiosk/print', async (req, res) => {
  try {
    const { ticketData } = req.body;
    if (!ticketData || !ticketData.queue_number) {
      return res.status(400).json({ success: false, message: 'Invalid ticket data structure' });
    }

    const result = await printerService.printTicket(ticketData);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check Printer Hardware Status
app.get('/api/kiosk/printer-status', async (req, res) => {
  const status = await printerService.detectPrinter();
  res.json({ success: true, status });
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
    res.json({ success: true, message: 'Test page sent to queue', ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Printer Microservice listening on port ${PORT}`);
});
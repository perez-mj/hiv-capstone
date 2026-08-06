// micro-services/printer/printerService.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class PrinterService {
  constructor() {
    this.usbPath = process.env.PRINTER_USB_PATH || '/dev/usb/lp0';
    this.btPath = process.env.PRINTER_BT_PATH || '/dev/rfcomm0';
    this.connectionType = process.env.PRINTER_TYPE || 'usb'; // 'usb' | 'bluetooth' | 'file'
    this.fallbackDir = process.env.PRINTER_FALLBACK_DIR || '/tmp/prints';

    if (!fs.existsSync(this.fallbackDir)) {
      fs.mkdirSync(this.fallbackDir, { recursive: true });
    }
  }

  // ESC/POS Commands
  get ESC_POS() {
    return {
      INIT: Buffer.from([0x1B, 0x40]),
      ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),
      ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),
      ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),
      TXT_BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
      TXT_BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
      TXT_DOUBLE_HEIGHT: Buffer.from([0x1D, 0x21, 0x01]),
      TXT_DOUBLE_SIZE: Buffer.from([0x1D, 0x21, 0x11]),
      TXT_NORMAL: Buffer.from([0x1D, 0x21, 0x00]),
      FEED_CUT: Buffer.from([0x1D, 0x56, 0x41, 0x03]), // Partial cut with feed
      LINE_FEED: Buffer.from([0x0A]),
    };
  }

  // Format payload into standard ESC/POS Buffer
  formatTicket(ticketData) {
    const { office, queue_number, patient_name, date, time, wait_time } = ticketData;
    const cmds = this.ESC_POS;

    const parts = [
      cmds.INIT,
      cmds.ALIGN_CENTER,
      cmds.TXT_BOLD_ON,
      Buffer.from('OMPH HIV-CARE CLINIC\n', 'utf8'),
      cmds.TXT_NORMAL,
      Buffer.from('Queue Slip\n', 'utf8'),
      Buffer.from('--------------------------------\n', 'utf8'),
      
      cmds.TXT_BOLD_ON,
      Buffer.from(`OFFICE: ${office ? office.toUpperCase() : 'GENERAL'}\n\n`, 'utf8'),
      
      cmds.TXT_DOUBLE_SIZE,
      Buffer.from(`${queue_number}\n\n`, 'utf8'),
      
      cmds.TXT_NORMAL,
      cmds.TXT_BOLD_OFF,
      Buffer.from(`Patient: ${patient_name || 'Walk-in'}\n`, 'utf8'),
      Buffer.from(`Date: ${date || new Date().toLocaleDateString()}\n`, 'utf8'),
      Buffer.from(`Time: ${time || new Date().toLocaleTimeString()}\n`, 'utf8'),
      wait_time ? Buffer.from(`Est. Wait: ${wait_time}\n`, 'utf8') : Buffer.from(''),
      
      Buffer.from('--------------------------------\n', 'utf8'),
      Buffer.from('Please wait for your number\nto be called.\n\n\n', 'utf8'),
      cmds.FEED_CUT
    ];

    return Buffer.concat(parts);
  }

  // Detect active target printer
  async detectPrinter() {
    const target = this.connectionType === 'bluetooth' ? this.btPath : this.usbPath;
    try {
      await fs.promises.access(target, fs.constants.W_OK);
      return { available: true, target, type: this.connectionType };
    } catch {
      return { available: false, target, type: this.connectionType };
    }
  }

  // Raw transmission handler
  async sendToPrinter(buffer) {
    const status = await this.detectPrinter();

    if (status.available) {
      return new Promise((resolve, reject) => {
        fs.writeFile(status.target, buffer, (err) => {
          if (err) return reject(err);
          resolve({ success: true, method: status.type, destination: status.target });
        });
      });
    }

    // Fallback: Dump to local disk directory if hardware isn't attached
    const fallbackPath = path.join(this.fallbackDir, `ticket-${Date.now()}.bin`);
    await fs.promises.writeFile(fallbackPath, buffer);
    return { success: true, method: 'fallback_file', destination: fallbackPath };
  }

  async printTicket(ticketData) {
    const rawBuffer = this.formatTicket(ticketData);
    return await this.sendToPrinter(rawBuffer);
  }
}

module.exports = new PrinterService();
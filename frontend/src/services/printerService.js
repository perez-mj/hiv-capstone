import api from '@/plugins/axios'

class PrinterService {
  async printTicket(ticketData) {
    try {
      // Try backend printing first
      const response = await api.post('/kiosk/print', { ticketData })
      
      if (response.data && response.data.success) {
        return {
          success: true,
          method: 'backend',
          ...response.data
        }
      } else if (response.data && response.data.frontendFallback) {
        // Backend suggests using browser fallback
        console.log('Backend printer unavailable, using browser fallback')
        return this.triggerBrowserPrint(ticketData)
      } else {
        // Fallback to browser print
        console.warn('Print API returned unsuccessful, using browser fallback')
        return this.triggerBrowserPrint(ticketData)
      }
      
    } catch (error) {
      console.warn('Backend printing failed, using browser fallback:', error.message)
      return this.triggerBrowserPrint(ticketData)
    }
  }

  triggerBrowserPrint(ticket) {
    try {
      const printWindow = window.open('', '_blank', 'width=350,height=500,scrollbars=yes')
      if (!printWindow) {
        // If popup blocked, create a new document in current window
        const printContent = this.generatePrintHTML(ticket)
        const printDiv = document.createElement('div')
        printDiv.innerHTML = printContent
        printDiv.style.cssText = 'position:fixed;left:-9999px;top:0;'
        document.body.appendChild(printDiv)
        
        // Print the content
        const originalTitle = document.title
        document.title = 'Queue Slip'
        window.print()
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(printDiv)
          document.title = originalTitle
        }, 100)
        
        return {
          success: true,
          method: 'browser_print',
          message: 'Printed using browser print dialog'
        }
      }
      
      printWindow.document.write(this.generatePrintHTML(ticket))
      printWindow.document.close()
      printWindow.focus()
      
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
        }, 500)
      }, 300)
      
      return {
        success: true,
        method: 'browser_print',
        message: 'Printed using browser print dialog'
      }
      
    } catch (error) {
      console.error('Browser print failed:', error)
      // Last resort: show the ticket on screen
      this.showTicketOnScreen(ticket)
      return {
        success: false,
        method: 'failed',
        message: 'Printing failed: ' + error.message,
        ticketData: ticket
      }
    }
  }

  generatePrintHTML(ticket) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Queue Slip</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 14px;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
              text-align: center;
            }
            .header {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .sub-header {
              font-size: 14px;
              margin-bottom: 10px;
            }
            .divider {
              border-top: 1px dashed #333;
              margin: 10px 0;
            }
            .office-label {
              font-size: 12px;
              color: #666;
            }
            .queue-number {
              font-size: 48px;
              font-weight: bold;
              margin: 10px 0;
              letter-spacing: 2px;
            }
            .patient-name {
              font-size: 16px;
              margin: 5px 0;
            }
            .info-text {
              font-size: 12px;
              color: #666;
              margin: 3px 0;
            }
            .footer {
              margin-top: 15px;
              font-size: 11px;
              color: #999;
            }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">OMPH HIV-CARE</div>
          <div class="sub-header">Queue Slip</div>
          <div class="divider"></div>
          <div class="office-label">${(ticket.office || 'GENERAL').toUpperCase()}</div>
          <div class="queue-number">${ticket.queue_number || '---'}</div>
          <div class="patient-name">${ticket.patient_name || 'Patient'}</div>
          <div class="info-text">${ticket.date || new Date().toLocaleDateString()}</div>
          <div class="info-text">${ticket.time || new Date().toLocaleTimeString()}</div>
          ${ticket.wait_time ? `<div class="info-text">Est. Wait: ${ticket.wait_time}</div>` : ''}
          <div class="divider"></div>
          <div class="info-text">Please wait for your number to be called</div>
          <div class="footer">Thank you for visiting us</div>
        </body>
      </html>
    `
  }

  showTicketOnScreen(ticket) {
    // Create a modal-like display with the ticket info
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 9999;
      max-width: 400px;
      width: 90%;
      text-align: center;
      font-family: 'Courier New', monospace;
    `
    modal.innerHTML = `
      <h2 style="margin-bottom:10px;">OMPH HIV-CARE</h2>
      <hr style="margin:10px 0;border:1px dashed #ccc;">
      <div style="font-size:14px;color:#666;">${(ticket.office || 'GENERAL').toUpperCase()}</div>
      <div style="font-size:64px;font-weight:bold;margin:10px 0;">${ticket.queue_number || '---'}</div>
      <div style="font-size:18px;margin:5px 0;">${ticket.patient_name || 'Patient'}</div>
      <div style="font-size:14px;color:#666;">${ticket.date || new Date().toLocaleDateString()}</div>
      <div style="font-size:14px;color:#666;">${ticket.time || new Date().toLocaleTimeString()}</div>
      <hr style="margin:10px 0;border:1px dashed #ccc;">
      <div style="font-size:14px;color:#666;">Please wait for your number to be called</div>
      <button onclick="this.parentElement.remove()" style="
        margin-top: 15px;
        padding: 10px 30px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
      ">OK</button>
    `
    document.body.appendChild(modal)
  }
}

export default new PrinterService()
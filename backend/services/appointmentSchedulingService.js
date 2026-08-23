// backend/services/appointmentSchedulingService.js
const { Op } = require('sequelize');
const db = require('../models');

class AppointmentSchedulingService {
  async getSettings(office = null) {
    return await db.AppointmentSetting.getSettingsObject(office);
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse time string to minutes since midnight
   * @param {string} timeStr - Time in format "HH:MM" or "HH:MM:SS"
   * @returns {number} Minutes since midnight
   */
  parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return (hours * 60) + minutes;
  }

  /**
   * Format minutes since midnight to time string
   * @param {number} minutes - Minutes since midnight
   * @returns {string} Time in format "HH:MM"
   */
  formatMinutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Check if a date is available for booking
   * @param {string} dateStr - Date in format "YYYY-MM-DD"
   * @param {string|null} office - Office to check
   * @returns {Promise<boolean>}
   */
  async isDateAvailable(dateStr, office = null) {
    const date = new Date(dateStr);
    const settings = await this.getSettings(office);
    
    // Check if it's a working day
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayNames[date.getDay()];
    if (!settings.working_days.includes(dayOfWeek)) {
      return false;
    }
    
    // Check if it's a holiday
    if (settings.holidays && settings.holidays.includes(dateStr)) {
      return false;
    }
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return false;
    }
    
    // Check advance booking limit
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + settings.advance_booking_days);
    if (date > maxDate) {
      return false;
    }
    
    return true;
  }

  /**
   * Generate time slots for a specific date
   * @param {string} dateStr - Date in format "YYYY-MM-DD"
   * @param {string|null} office - Office to check
   * @returns {Promise<Array>} Array of time slot objects
   */
  async generateTimeSlots(dateStr, office = null) {
    const date = new Date(dateStr);
    const settings = await this.getSettings(office);
    
    // If date is not available, return empty array
    if (!await this.isDateAvailable(dateStr, office)) {
      return [];
    }
    
    const slots = [];
    const startMinutes = this.parseTimeToMinutes(settings.start_time);
    const endMinutes = this.parseTimeToMinutes(settings.end_time);
    const slotDuration = settings.slot_duration_minutes;
    const lunchStart = this.parseTimeToMinutes(settings.lunch_start);
    const lunchEnd = this.parseTimeToMinutes(settings.lunch_end);
    const leadMinutes = settings.booking_lead_time_minutes;
    
    let currentMinutes = startMinutes;
    
    while (currentMinutes < endMinutes) {
      // Skip lunch break
      if (currentMinutes >= lunchStart && currentMinutes < lunchEnd) {
        currentMinutes = lunchEnd;
        continue;
      }
      
      const timeStr = this.formatMinutesToTime(currentMinutes);
      
      // Check if slot is available (not booked)
      const isBooked = await this.isTimeSlotBooked(dateStr, timeStr, office);
      // Check if slot is in the past
      const isPast = this.isPastTimeSlot(date, currentMinutes, leadMinutes);
      
      slots.push({
        time: timeStr,
        available: !isBooked && !isPast,
        isPast: isPast,
        isBooked: isBooked,
        office: office || 'both'
      });
      
      currentMinutes += slotDuration;
    }
    
    return slots;
  }

  /**
   * Check if a time slot is in the past
   * @param {Date} date - The appointment date
   * @param {number} slotMinutes - Slot time in minutes since midnight
   * @param {number} leadMinutes - Lead time in minutes
   * @returns {boolean} True if the slot is in the past
   */
  isPastTimeSlot(date, slotMinutes, leadMinutes) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If date is in the future, slot is not past
    if (date > today) return false;
    
    // If date is in the past, slot is past
    if (date < today) return true;
    
    // Date is today, check the time
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // Slot is past if current time + lead time is past the slot time
    return slotMinutes <= (currentMinutes + leadMinutes);
  }

  /**
   * Check if a time slot is already booked
   * @param {string} dateStr - Date in format "YYYY-MM-DD"
   * @param {string} timeSlot - Time in format "HH:MM"
   * @param {string|null} office - Office to check
   * @returns {Promise<boolean>}
   */
  async isTimeSlotBooked(dateStr, timeSlot, office = null) {
    const settings = await this.getSettings(office);
    const maxCapacity = settings.max_capacity_per_slot || 5;
    
    const where = {
      appointment_date: dateStr,
      time_slot: timeSlot,
      status: { [Op.notIn]: ['cancelled', 'no-show'] }
    };
    
    if (office) {
      where.office = office;
    }
    
    const count = await db.Appointment.count({ where });
    return count >= maxCapacity;
  }

  /**
   * Check if a time slot is available (alias for isTimeSlotBooked with opposite logic)
   * @param {string} dateStr - Date in format "YYYY-MM-DD"
   * @param {string} timeSlot - Time in format "HH:MM"
   * @param {string|null} office - Office to check
   * @returns {Promise<boolean>}
   */
  async isTimeSlotAvailable(dateStr, timeSlot, office = null) {
    return !(await this.isTimeSlotBooked(dateStr, timeSlot, office));
  }

  /**
   * Get available appointment slots for a date
   * @param {string} dateStr - Date in format "YYYY-MM-DD"
   * @param {string|null} office - Office to check
   * @param {number|null} patientId - Patient ID to check for limits
   * @returns {Promise<Object>}
   */
  async getAvailableAppointmentSlots(dateStr, office = null, patientId = null) {
    const slots = await this.generateTimeSlots(dateStr, office);
    
    // If patient specified, check their booking limit
    if (patientId) {
      const settings = await this.getSettings(office);
      const maxPerDay = settings.max_appointments_per_patient_per_day || 1;
      
      const patientAppointments = await db.Appointment.count({
        where: {
          patient_id: patientId,
          appointment_date: dateStr,
          status: { [Op.notIn]: ['cancelled', 'no-show'] }
        }
      });
      
      if (patientAppointments >= maxPerDay) {
        return {
          available: false,
          message: 'Patient already has the maximum number of appointments for this day',
          slots: []
        };
      }
    }
    
    // Filter only available slots
    const availableSlots = slots.filter(slot => slot.available);
    
    return {
      available: availableSlots.length > 0,
      slots: availableSlots,
      allSlots: slots,
      count: availableSlots.length,
      date: dateStr,
      office: office || 'both'
    };
  }

  /**
   * Get the next available date with available slots
   * @param {string|null} office - Office to check
   * @param {number} daysToCheck - Number of days to check ahead
   * @returns {Promise<string|null>}
   */
  async getNextAvailableDate(office = null, daysToCheck = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + daysToCheck);

    for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      
      // Check if date is available
      const isAvailable = await this.isDateAvailable(dateStr, office);
      if (!isAvailable) continue;

      // Check if date has available slots
      const result = await this.getAvailableAppointmentSlots(dateStr, office);
      if (result.available) {
        return dateStr;
      }
    }

    return null;
  }

  /**
   * Get date availability for a range
   * @param {string} startDate - Start date in format "YYYY-MM-DD"
   * @param {string} endDate - End date in format "YYYY-MM-DD"
   * @param {string|null} office - Office to check
   * @returns {Promise<Array>}
   */
  async getDateAvailability(startDate, endDate, office = null) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      const isAvailable = await this.isDateAvailable(dateStr, office);
      
      if (isAvailable) {
        const slots = await this.generateTimeSlots(dateStr, office);
        const availableSlots = slots.filter(slot => slot.available);
        results.push({
          date: dateStr,
          available: availableSlots.length > 0,
          slotsCount: availableSlots.length,
          totalSlots: slots.length
        });
      } else {
        results.push({
          date: dateStr,
          available: false,
          slotsCount: 0,
          totalSlots: 0
        });
      }
    }

    return results;
  }
}

module.exports = new AppointmentSchedulingService();
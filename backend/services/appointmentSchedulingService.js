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

  parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
  }

  formatMinutesToTime(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mins}`;
  }

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
    if (settings.holidays.includes(dateStr)) {
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
      
      // Check if slot is available
      const isAvailable = await this.isTimeSlotAvailable(dateStr, timeStr, office);
      const isPast = this.isPastTimeSlot(date, currentMinutes, leadMinutes);
      
      slots.push({
        time: timeStr,
        available: isAvailable && !isPast,
        office: office || 'both'
      });
      
      currentMinutes += slotDuration;
    }
    
    return slots;
  }

  isPastTimeSlot(date, slotMinutes, leadMinutes) {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date > today) return false;
    if (date < today) return true;
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= currentMinutes + leadMinutes;
  }

  async isTimeSlotAvailable(dateStr, timeSlot, office = null) {
    const settings = await this.getSettings(office);
    const maxCapacity = settings.max_capacity_per_slot;
    
    const where = {
      appointment_date: dateStr,
      time_slot: timeSlot,
      status: { [Op.notIn]: ['cancelled', 'no-show'] }
    };
    
    if (office) {
      where.office = office;
    }
    
    const count = await db.Appointment.count({ where });
    return count < maxCapacity;
  }

  async getAvailableAppointmentSlots(dateStr, office = null, patientId = null) {
    const slots = await this.generateTimeSlots(dateStr, office);
    
    // If patient specified, check their booking limit
    if (patientId) {
      const settings = await this.getSettings(office);
      const maxPerDay = settings.max_appointments_per_patient_per_day;
      
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
      count: availableSlots.length,
      date: dateStr,
      office: office || 'both'
    };
  }

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
      const slots = await this.generateTimeSlots(dateStr, office);
      const availableSlots = slots.filter(slot => slot.available);
      
      if (availableSlots.length > 0) {
        return dateStr;
      }
    }

    return null;
  }
}

module.exports = new AppointmentSchedulingService();
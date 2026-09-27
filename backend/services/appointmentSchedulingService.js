// backend/services/appointmentSchedulingService.js
const { Op } = require('sequelize');
const db = require('../models');

class AppointmentSchedulingService {
  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

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
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  formatMinutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────
  // Availability checks
  // ─────────────────────────────────────────────

  async isDateAvailable(dateStr, office = null) {
    const date = new Date(dateStr);
    const settings = await this.getSettings(office);

    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayOfWeek = dayNames[date.getDay()];
    if (!settings.working_days.includes(dayOfWeek)) return false;

    if (settings.holidays && settings.holidays.includes(dateStr)) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + settings.advance_booking_days);
    if (date > maxDate) return false;

    return true;
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

  async isTimeSlotBooked(dateStr, timeSlot, office = null) {
    const settings = await this.getSettings(office);
    const maxCapacity = settings.max_capacity_per_slot || 5;

    const where = {
      appointment_date: dateStr,
      time_slot: timeSlot,
      status: { [Op.notIn]: ['cancelled', 'no-show'] }
    };
    if (office) where.office = office;

    const count = await db.Appointment.count({ where });
    return count >= maxCapacity;
  }

  async isTimeSlotAvailable(dateStr, timeSlot, office = null) {
    return !(await this.isTimeSlotBooked(dateStr, timeSlot, office));
  }

  // ─────────────────────────────────────────────
  // Slot generation
  // ─────────────────────────────────────────────

  async generateTimeSlots(dateStr, office = null) {
    const date = new Date(dateStr);
    const settings = await this.getSettings(office);

    if (!(await this.isDateAvailable(dateStr, office))) return [];

    const slots = [];
    const startMinutes = this.parseTimeToMinutes(settings.start_time);
    const endMinutes = this.parseTimeToMinutes(settings.end_time);
    const slotDuration = settings.slot_duration_minutes;
    const lunchStart = this.parseTimeToMinutes(settings.lunch_start);
    const lunchEnd = this.parseTimeToMinutes(settings.lunch_end);
    const leadMinutes = settings.booking_lead_time_minutes;

    let currentMinutes = startMinutes;

    while (currentMinutes < endMinutes) {
      if (currentMinutes >= lunchStart && currentMinutes < lunchEnd) {
        currentMinutes = lunchEnd;
        continue;
      }

      const timeStr = this.formatMinutesToTime(currentMinutes);
      const isBooked = await this.isTimeSlotBooked(dateStr, timeStr, office);
      const isPast = this.isPastTimeSlot(date, currentMinutes, leadMinutes);

      slots.push({
        time: timeStr,
        available: !isBooked && !isPast,
        isPast,
        isBooked,
        office: office || 'both'
      });

      currentMinutes += slotDuration;
    }

    return slots;
  }

  // ─────────────────────────────────────────────
  // Public API methods
  // ─────────────────────────────────────────────

  async getAvailableAppointmentSlots(dateStr, office = null, patientId = null) {
    const slots = await this.generateTimeSlots(dateStr, office);

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

    const availableSlots = slots.filter(s => s.available);

    return {
      available: availableSlots.length > 0,
      slots: availableSlots,
      allSlots: slots,
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
      if (!(await this.isDateAvailable(dateStr, office))) continue;

      const result = await this.getAvailableAppointmentSlots(dateStr, office);
      if (result.available) return dateStr;
    }
    return null;
  }

  async getDateAvailability(startDate, endDate, office = null) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      const isAvailable = await this.isDateAvailable(dateStr, office);

      if (isAvailable) {
        const slots = await this.generateTimeSlots(dateStr, office);
        const availableSlots = slots.filter(s => s.available);
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
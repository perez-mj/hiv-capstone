// frontend/src/services/queueService.js
import api from '@/plugins/axios';

export default {
  async getQueueState(office, date = null) {
    // Ensure date is properly formatted
    let url = `/queue/${office}/state`;
    if (date) {
      const formattedDate = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      url += `?date=${formattedDate}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  async addToQueue(office, patientId, appointmentId = null, date = null) {
    const params = date ? `?date=${typeof date === 'string' ? date : date.toISOString().split('T')[0]}` : '';
    const response = await api.post(`/queue/${office}/add${params}`, {
      patient_id: patientId,
      appointment_id: appointmentId
    });
    return response.data;
  },

  async callNext(office, date = null) {
    const params = date ? `?date=${typeof date === 'string' ? date : date.toISOString().split('T')[0]}` : '';
    const response = await api.post(`/queue/${office}/next${params}`);
    return response.data;
  },

  async skipCurrent(office, reason = 'Skipped', date = null) {
    const params = date ? `?date=${typeof date === 'string' ? date : date.toISOString().split('T')[0]}` : '';
    const response = await api.post(`/queue/${office}/skip${params}`, { reason });
    return response.data;
  },

  async completeCurrent(office, date = null) {
    const params = date ? `?date=${typeof date === 'string' ? date : date.toISOString().split('T')[0]}` : '';
    const response = await api.post(`/queue/${office}/complete-current${params}`);
    return response.data;
  },

  async markNoShow(office, queueEntryId, date = null) {
    const params = date ? `?date=${typeof date === 'string' ? date : date.toISOString().split('T')[0]}` : '';
    const response = await api.post(`/queue/${office}/noshow${params}`, { 
      queue_entry_id: queueEntryId 
    });
    return response.data;
  },

  async resetQueue(office, date = null) {
    const params = date ? `?date=${typeof date === 'string' ? date : date.toISOString().split('T')[0]}` : '';
    const response = await api.delete(`/queue/${office}/reset${params}`);
    return response.data;
  }
};
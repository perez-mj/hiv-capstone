// frontend/src/services/queueService.js
import api from '@/plugins/axios';

export default {
  async getQueueState(office, date = null) {
    const url = date ? `/queue/${office}/state?date=${date}` : `/queue/${office}/state`;
    const response = await api.get(url);
    return response.data;
  },

  async addToQueue(office, patientId, appointmentId = null) {
    const response = await api.post(`/queue/${office}/add`, {
      patient_id: patientId,
      appointment_id: appointmentId
    });
    return response.data;
  },

  async callNext(office) {
    const response = await api.post(`/queue/${office}/next`);
    return response.data;
  },

  async skipCurrent(office, reason = 'Skipped') {
    const response = await api.post(`/queue/${office}/skip`, { reason });
    return response.data;
  },

  async resetQueue(office, date = null) {
    const url = date ? `/queue/${office}/reset?date=${date}` : `/queue/${office}/reset`;
    const response = await api.delete(url);
    return response.data;
  }
};
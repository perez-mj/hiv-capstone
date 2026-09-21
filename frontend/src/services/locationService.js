// frontend/src/services/locationService.js
import api from '@/plugins/axios'

const BASE = '/locations'

export default {
  async getRegions() {
    const { data } = await api.get(`${BASE}/regions`)
    return data.data
  },

  async getProvinces(regionId) {
    const { data } = await api.get(`${BASE}/regions/${regionId}/provinces`)
    return data.data
  },

  async getCitiesByProvince(provinceId) {
    const { data } = await api.get(`${BASE}/provinces/${provinceId}/cities`)
    return data.data
  },

  async getCitiesByRegion(regionId) {
    const { data } = await api.get(`${BASE}/regions/${regionId}/cities`)
    return data.data
  },

  async getBarangays(cityMunicipalityId) {
    const { data } = await api.get(
      `${BASE}/cities/${cityMunicipalityId}/barangays`
    )
    return data.data
  }
}
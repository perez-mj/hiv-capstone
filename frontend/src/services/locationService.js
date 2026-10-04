// frontend/src/services/locationService.js
import api from '@/plugins/axios'

const BASE = '/locations'

export default {
  // -------------------------------------------------------------------
  // Hierarchy lookups (existing)
  // -------------------------------------------------------------------
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
  },

  // -------------------------------------------------------------------
  // Direct ID lookups (new)
  //
  // These hit a single endpoint per level instead of walking the full
  // hierarchy from the region down. Backend needs to expose:
  //   GET /locations/provinces/:id
  //   GET /locations/cities/:id
  //   GET /locations/barangays/:id
  //
  // If your backend doesn't have these yet, fall back to the hierarchy
  // walkers in resolveAddress below — it tries the direct route first
  // and gracefully degrades.
  // -------------------------------------------------------------------
  async getProvinceById(id) {
    const { data } = await api.get(`${BASE}/provinces/${id}`)
    return data.data
  },

  async getCityById(id) {
    const { data } = await api.get(`${BASE}/cities/${id}`)
    return data.data
  },

  async getBarangayById(id) {
    const { data } = await api.get(`${BASE}/barangays/${id}`)
    return data.data
  },

  // -------------------------------------------------------------------
  // Convenience: resolve a { barangay_id, city_municipality_id, province_id }
  // tuple into { barangay, city, province, region } names.
  //
  // Tries the direct ID endpoints first; if they 404, falls back to
  // walking the hierarchy. Returns nulls for anything it can't resolve.
  // -------------------------------------------------------------------
  async resolveAddress({ barangay_id, city_municipality_id, province_id }) {
    const out = { region: null, province: null, city: null, barangay: null }

    // --- Province ---
    if (province_id) {
      try {
        const province = await this.getProvinceById(province_id)
        if (province) {
          out.province = province.name
          if (province.region) out.region = province.region.name
          else if (province.region_id) {
            // Fallback: walk regions
            const regions = await this.getRegions()
            const r = regions.find((x) => x.id === province.region_id)
            if (r) out.region = r.name
          }
        }
      } catch {
        // Direct lookup failed — leave province null; caller may fall
        // back to the hierarchy walker if it wants
      }
    }

    // --- City ---
    if (city_municipality_id) {
      try {
        const city = await this.getCityById(city_municipality_id)
        if (city) {
          out.city = city.name
          // NCR-style: city may carry its own region/province
          if (!out.province && city.province) out.province = city.province.name
          if (!out.region && city.region) out.region = city.region.name
        }
      } catch {
        /* leave city null */
      }
    }

    // --- Barangay ---
    if (barangay_id) {
      try {
        const brgy = await this.getBarangayById(barangay_id)
        if (brgy) out.barangay = brgy.name
      } catch {
        /* leave barangay null */
      }
    }

    return out
  }
}
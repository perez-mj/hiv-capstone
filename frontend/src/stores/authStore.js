// frontend/src/stores/authStore.js
import { defineStore } from 'pinia';
import api from '../plugins/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false
  }),

  getters: {
    isAdmin: (state) => state.user?.role === 'admin',
    isStaff: (state) => state.user?.role === 'staff',
    isPatient: (state) => state.user?.role === 'patient',
    userRole: (state) => state.user?.role,
    userOffice: (state) => state.user?.office
  },

  actions: {
    async login(username, password) {
      try {
        const response = await api.post('/auth/login', { username, password });
        const { access_token, refresh_token, user } = response.data;
        
        this.accessToken = access_token;
        this.refreshToken = refresh_token;
        this.user = user;
        this.isAuthenticated = true;
        
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        
        return { success: true, user };
      } catch (error) {
        return { success: false, error: error.response?.data?.error || 'Login failed' };
      }
    },

    logout() {
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
      this.isAuthenticated = false;
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      delete api.defaults.headers.common['Authorization'];
    },

    checkAuth() {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const user = localStorage.getItem('user');
      
      if (accessToken && refreshToken && user) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = JSON.parse(user);
        this.isAuthenticated = true;
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return true;
      }
      return false;
    }
  }
});
// frontend/src/stores/authStore.js
import { defineStore } from 'pinia';
import api from '../plugins/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isAuthChecked: false // Add this to track if auth has been checked
  }),

  getters: {
    isAdmin: (state) => state.user?.role === 'admin',
    isStaff: (state) => state.user?.role === 'staff',
    isPatient: (state) => state.user?.role === 'patient',
    userRole: (state) => state.user?.role || null,
    userOffice: (state) => state.user?.office || null
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
        this.isAuthChecked = true;
        
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
      this.isAuthChecked = true; // Keep as true even after logout
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      delete api.defaults.headers.common['Authorization'];
    },

    async checkAuth() {
      // If already checked, return current state
      if (this.isAuthChecked && this.isAuthenticated) {
        return true;
      }

      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const userStr = localStorage.getItem('user');
      
      if (accessToken && refreshToken && userStr) {
        try {
          const user = JSON.parse(userStr);
          
          // Optional: Validate token with backend
          // const response = await api.get('/auth/me');
          // if (response.data) {
          //   this.user = response.data;
          // } else {
          //   this.user = user;
          // }
          
          this.accessToken = accessToken;
          this.refreshToken = refreshToken;
          this.user = user;
          this.isAuthenticated = true;
          this.isAuthChecked = true;
          
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          
          console.log('Auth check successful:', {
            role: this.userRole,
            office: this.userOffice
          });
          
          return true;
        } catch (error) {
          console.error('Auth check failed:', error);
          this.logout();
          return false;
        }
      }
      
      this.isAuthChecked = true;
      return false;
    },

    // Helper to get user data after auth check
    async ensureAuth() {
      if (!this.isAuthChecked) {
        await this.checkAuth();
      }
      return this.isAuthenticated;
    }
  }
});
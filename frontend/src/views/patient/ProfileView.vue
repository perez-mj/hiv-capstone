<!-- frontend/src/views/patient/ProfileView.vue -->
<template>
  <div>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h4 mb-4">
          <v-icon left>mdi-account</v-icon>
          My Profile
        </h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text class="text-center">
            <v-avatar color="primary" size="100" class="mb-4">
              <v-icon size="60" dark>mdi-account</v-icon>
            </v-avatar>
            <h3>{{ patient?.first_name }} {{ patient?.last_name }}</h3>
            <p class="text-caption text-grey">{{ patient?.status?.toUpperCase() }}</p>
            <v-divider class="my-3" />
            <v-chip color="info" small>
              {{ patient?.status === 'treatment' ? 'Active Treatment' : 'Testing Phase' }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="primary white--text">
            Edit Profile
          </v-card-title>
          
          <v-card-text>
            <v-form ref="profileForm" v-model="valid" class="mt-4">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.first_name"
                    label="First Name"
                    prepend-icon="mdi-account"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.last_name"
                    label="Last Name"
                    prepend-icon="mdi-account"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.contact_number"
                    label="Contact Number"
                    prepend-icon="mdi-phone"
                    :rules="[rules.required, rules.phone]"
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.birth_date"
                    label="Birth Date"
                    type="date"
                    prepend-icon="mdi-calendar"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.gender"
                    label="Gender"
                    :items="['Male', 'Female', 'Other']"
                    prepend-icon="mdi-gender-male-female"
                    :rules="[rules.required]"
                  ></v-select>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.email"
                    label="Email"
                    prepend-icon="mdi-email"
                    :rules="[rules.email]"
                    disabled
                    hint="Email cannot be changed"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-textarea
                v-model="formData.address"
                label="Address"
                prepend-icon="mdi-home"
                rows="2"
              ></v-textarea>

              <v-divider class="my-4" />

              <h4 class="text-subtitle-1 mb-2">Emergency Contact</h4>
              
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.emergency_contact"
                    label="Emergency Contact Name"
                    prepend-icon="mdi-account-alert"
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.emergency_phone"
                    label="Emergency Contact Phone"
                    prepend-icon="mdi-phone-alert"
                    :rules="[rules.phone]"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <h4 class="text-subtitle-1 mb-2">Guardian Information <span class="text-caption text-grey">(If under 18)</span></h4>
              
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.guardian_name"
                    label="Guardian Name"
                    prepend-icon="mdi-account-supervisor"
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.guardian_contact"
                    label="Guardian Contact"
                    prepend-icon="mdi-phone"
                    :rules="[rules.phone]"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-alert v-if="isMinor" type="warning" class="mt-2">
                <v-icon left>mdi-alert</v-icon>
                You are under 18. Guardian information is required.
              </v-alert>
            </v-form>
          </v-card-text>
          
          <v-card-actions>
            <v-spacer />
            <v-btn color="secondary" @click="resetForm">Reset</v-btn>
            <v-btn 
              color="primary" 
              @click="updateProfile" 
              :loading="loading"
              :disabled="!valid"
            >
              <v-icon left>mdi-content-save</v-icon>
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Change Password Dialog -->
    <v-dialog v-model="showPasswordDialog" max-width="500">
      <v-card>
        <v-card-title class="primary white--text">
          Change Password
          <v-spacer />
          <v-btn icon dark @click="showPasswordDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-card-text class="mt-4">
          <v-form ref="passwordForm" v-model="passwordValid">
            <v-text-field
              v-model="passwordData.current"
              label="Current Password"
              type="password"
              prepend-icon="mdi-lock"
              :rules="[rules.required]"
            ></v-text-field>
            
            <v-text-field
              v-model="passwordData.new"
              label="New Password"
              type="password"
              prepend-icon="mdi-lock-plus"
              :rules="[rules.required, rules.minLength]"
            ></v-text-field>
            
            <v-text-field
              v-model="passwordData.confirm"
              label="Confirm New Password"
              type="password"
              prepend-icon="mdi-lock-check"
              :rules="[rules.required, rules.confirmPassword]"
            ></v-text-field>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" @click="showPasswordDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="changePassword" 
            :loading="passwordLoading"
            :disabled="!passwordValid"
          >
            Change Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import api from '@/plugins/axios';

const authStore = useAuthStore();

const patient = ref(null);
const loading = ref(false);
const valid = ref(false);
const passwordValid = ref(false);
const profileForm = ref(null);
const passwordForm = ref(null);
const showPasswordDialog = ref(false);
const passwordLoading = ref(false);

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const formData = ref({
  first_name: '',
  last_name: '',
  birth_date: '',
  gender: '',
  contact_number: '',
  address: '',
  email: '',
  emergency_contact: '',
  emergency_phone: '',
  guardian_name: '',
  guardian_contact: ''
});

const passwordData = ref({
  current: '',
  new: '',
  confirm: ''
});

const isMinor = computed(() => {
  if (!formData.value.birth_date) return false;
  const birthDate = new Date(formData.value.birth_date);
  const age = (new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
  return age < 18;
});

const rules = {
  required: value => !!value || 'This field is required',
  phone: value => {
    if (!value) return true;
    const phoneRegex = /^(\+?63|0)[9]\d{9}$/;
    return phoneRegex.test(value) || 'Please enter a valid Philippine phone number';
  },
  email: value => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !value || emailRegex.test(value) || 'Please enter a valid email address';
  },
  minLength: value => {
    return !value || value.length >= 8 || 'Password must be at least 8 characters';
  },
  confirmPassword: value => {
    return value === passwordData.value.new || 'Passwords do not match';
  }
};

const loadPatientData = async () => {
  try {
    const response = await api.get('/patients/me');
    patient.value = response.data;
    
    // Populate form
    formData.value = {
      first_name: patient.value.first_name || '',
      last_name: patient.value.last_name || '',
      birth_date: patient.value.birth_date || '',
      gender: patient.value.gender || '',
      contact_number: patient.value.contact_number || '',
      address: patient.value.address || '',
      email: authStore.user?.email || '',
      emergency_contact: patient.value.emergency_contact || '',
      emergency_phone: patient.value.emergency_phone || '',
      guardian_name: patient.value.guardian_name || '',
      guardian_contact: patient.value.guardian_contact || ''
    };
  } catch (error) {
    console.error('Error loading patient data:', error);
    snackbar.value = {
      show: true,
      message: 'Failed to load profile data',
      color: 'error'
    };
  }
};

const updateProfile = async () => {
  if (!profileForm.value.validate()) return;
  
  loading.value = true;
  try {
    const updateData = { ...formData.value };
    delete updateData.email; // Don't send email as it's from user table
    
    await api.put(`/patients/${patient.value.id}`, updateData);
    
    snackbar.value = {
      show: true,
      message: 'Profile updated successfully!',
      color: 'success'
    };
    
    await loadPatientData();
  } catch (error) {
    console.error('Error updating profile:', error);
    snackbar.value = {
      show: true,
      message: error.response?.data?.error || 'Failed to update profile',
      color: 'error'
    };
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  loadPatientData();
  profileForm.value?.resetValidation();
};

const changePassword = async () => {
  if (!passwordForm.value.validate()) return;
  
  passwordLoading.value = true;
  try {
    await api.post('/auth/change-password', {
      current_password: passwordData.value.current,
      new_password: passwordData.value.new
    });
    
    snackbar.value = {
      show: true,
      message: 'Password changed successfully!',
      color: 'success'
    };
    
    showPasswordDialog.value = false;
    passwordData.value = { current: '', new: '', confirm: '' };
  } catch (error) {
    console.error('Error changing password:', error);
    snackbar.value = {
      show: true,
      message: error.response?.data?.error || 'Failed to change password',
      color: 'error'
    };
  } finally {
    passwordLoading.value = false;
  }
};

onMounted(() => {
  loadPatientData();
});
</script>
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
            <h3>{{ patient?.first_name }} {{ patient?.middle_name || '' }} {{ patient?.last_name }}</h3>
            <p class="text-caption text-grey">{{ patient?.status?.toUpperCase() }}</p>
            <v-divider class="my-3" />
            <v-chip :color="patient?.status === 'treatment' ? 'success' : 'info'" small>
              {{ patient?.status === 'treatment' ? 'Active Treatment' : 'Testing Phase' }}
            </v-chip>
            <v-divider class="my-3" />
            <div class="text-left">
              <p class="text-caption mb-1">
                <v-icon small class="mr-1">mdi-identifier</v-icon>
                <strong>Facility Code:</strong>
              </p>
              <v-chip color="primary" outlined small class="mb-2">
                {{ patient?.patient_facility_code }}
              </v-chip>
              
              <p class="text-caption mb-1 mt-2">
                <v-icon small class="mr-1">mdi-calendar</v-icon>
                <strong>Enrollment Date:</strong>
              </p>
              <p class="text-body-2">{{ formatDate(patient?.enrollment_date) }}</p>
              
              <p class="text-caption mb-1 mt-2" v-if="patient?.treatment_transition_date">
                <v-icon small class="mr-1">mdi-calendar-check</v-icon>
                <strong>Treatment Transition Date:</strong>
              </p>
              <p class="text-body-2" v-if="patient?.treatment_transition_date">
                {{ formatDate(patient?.treatment_transition_date) }}
              </p>
              
              <p class="text-caption mb-1 mt-2">
                <v-icon small class="mr-1">mdi-phone</v-icon>
                <strong>Contact:</strong>
              </p>
              <p class="text-body-2">{{ patient?.contact_number }}</p>
              
              <p class="text-caption mb-1 mt-2">
                <v-icon small class="mr-1">mdi-cake-variant-outline</v-icon>
                <strong>Birth Date:</strong>
              </p>
              <p class="text-body-2">{{ formatDate(patient?.birth_date) }}</p>
              
              <p class="text-caption mb-1 mt-2">
                <v-icon small class="mr-1">mdi-gender-male-female</v-icon>
                <strong>Gender:</strong>
              </p>
              <p class="text-body-2">{{ patient?.gender || 'Not specified' }}</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="primary white--text">
            <v-icon left dark>mdi-pencil</v-icon>
            Edit Profile
          </v-card-title>
          
          <v-card-text>
            <v-form ref="profileForm" v-model="valid" class="mt-4">
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="formData.first_name"
                    label="First Name"
                    prepend-icon="mdi-account"
                    :rules="[rules.required]"
                    disabled
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="formData.middle_name"
                    label="Middle Name"
                    prepend-icon="mdi-account"
                    disabled
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="formData.last_name"
                    label="Last Name"
                    prepend-icon="mdi-account"
                    :rules="[rules.required]"
                    disabled
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
                    disabled
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
                    disabled
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

              <h4 class="text-subtitle-1 mb-2">
                <v-icon small class="mr-1">mdi-account-alert</v-icon>
                Emergency Contact
              </h4>
              
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

              <h4 class="text-subtitle-1 mb-2">
                <v-icon small class="mr-1">mdi-account-supervisor</v-icon>
                Guardian Information 
                <span class="text-caption text-grey">(If under 18)</span>
              </h4>
              
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
            <v-btn color="secondary" @click="resetForm">
              <v-icon left>mdi-refresh</v-icon>
              Reset
            </v-btn>
            <v-btn 
              color="primary" 
              @click="updateProfile" 
              :loading="loading"
              :disabled="!valid || loading"
            >
              <v-icon left>mdi-content-save</v-icon>
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Change Password Card -->
        <v-card class="mt-4">
          <v-card-title>
            <v-icon left>mdi-lock</v-icon>
            Security
          </v-card-title>
          <v-card-text>
            <v-btn color="warning" @click="showPasswordDialog = true">
              <v-icon left>mdi-key-change</v-icon>
              Change Password
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Change Password Dialog -->
    <v-dialog v-model="showPasswordDialog" max-width="500">
      <v-card>
        <v-card-title class="primary white--text">
          <v-icon left dark>mdi-key-change</v-icon>
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

            <v-alert type="info" dense>
              <v-icon left small>mdi-information</v-icon>
              Password must be at least 8 characters long.
            </v-alert>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" @click="showPasswordDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="changePassword" 
            :loading="passwordLoading"
            :disabled="!passwordValid || passwordLoading"
          >
            <v-icon left>mdi-check</v-icon>
            Change Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar 
      v-model="snackbar.show" 
      :color="snackbar.color" 
      timeout="5000"
      multi-line
    >
      <v-icon left>{{ snackbar.icon || 'mdi-check-circle' }}</v-icon>
      {{ snackbar.message }}
      <template v-slot:action="{ attrs }">
        <v-btn 
          color="white" 
          text 
          v-bind="attrs" 
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { storeToRefs } from 'pinia';

const authStore = useAuthStore();
const patientStore = usePatientStore();

// Store refs
const { currentPatient: patient, loading } = storeToRefs(patientStore);
const { updatePatient, loadMyPatient } = patientStore;

// Local state
const valid = ref(false);
const passwordValid = ref(false);
const profileForm = ref(null);
const passwordForm = ref(null);
const showPasswordDialog = ref(false);
const passwordLoading = ref(false);

const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle'
});

const formData = ref({
  first_name: '',
  middle_name: '',
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
    return phoneRegex.test(value) || 'Please enter a valid Philippine phone number (e.g., 09123456789 or +639123456789)';
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

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const loadPatientData = async () => {
  try {
    await loadMyPatient();
    
    if (patient.value) {
      // Populate form
      formData.value = {
        first_name: patient.value.first_name || '',
        middle_name: patient.value.middle_name || '',
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
    }
  } catch (error) {
    console.error('Error loading patient data:', error);
    showSnackbar('Failed to load profile data', 'error', 'mdi-alert-circle');
  }
};

const updateProfile = async () => {
  if (!profileForm.value.validate()) return;
  
  try {
    const updateData = { 
      address: formData.value.address,
      contact_number: formData.value.contact_number,
      emergency_contact: formData.value.emergency_contact,
      emergency_phone: formData.value.emergency_phone,
      guardian_name: formData.value.guardian_name,
      guardian_contact: formData.value.guardian_contact
    };
    
    // Only include fields that have changed
    const changedData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== patient.value[key]) {
        changedData[key] = updateData[key];
      }
    });
    
    if (Object.keys(changedData).length === 0) {
      showSnackbar('No changes to save', 'info', 'mdi-information');
      return;
    }
    
    await updatePatient(patient.value.id, changedData);
    
    showSnackbar('Profile updated successfully!', 'success', 'mdi-check-circle');
  } catch (error) {
    console.error('Error updating profile:', error);
    showSnackbar(
      error.response?.data?.error || 'Failed to update profile', 
      'error', 
      'mdi-alert-circle'
    );
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
    // Call the changePassword method from authStore
    await authStore.changePassword({
      current_password: passwordData.value.current,
      new_password: passwordData.value.new
    });
    
    showSnackbar('Password changed successfully!', 'success', 'mdi-check-circle');
    
    showPasswordDialog.value = false;
    passwordData.value = { current: '', new: '', confirm: '' };
    passwordForm.value?.resetValidation();
  } catch (error) {
    console.error('Error changing password:', error);
    showSnackbar(
      error.response?.data?.error || 'Failed to change password', 
      'error', 
      'mdi-alert-circle'
    );
  } finally {
    passwordLoading.value = false;
  }
};

const showSnackbar = (message, color = 'success', icon = 'mdi-check-circle') => {
  snackbar.value = {
    show: true,
    message,
    color,
    icon
  };
};

onMounted(() => {
  loadPatientData();
});
</script>

<style scoped>
.v-avatar {
  border: 3px solid #1976D2;
}

.text-caption {
  font-weight: 500;
}

.v-card {
  border-radius: 12px;
}
</style>
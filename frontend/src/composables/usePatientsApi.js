// src/composables/usePatientsApi.js

import { ref } from 'vue';
// Import the new CRUD functions from your API service file
import { getPatients, deletePatient, enrollPatientApi } from '@/api/patients'; 

// Reactive state declared outside the function for shared/singleton instance
const patients = ref([]);
const loading = ref(false);
const error = ref(null); 

/**
 * Custom hook (composable) for managing patient API interactions.
 */
export default function usePatientsApi() {

    // --- Data Fetching (GET /api/patients) ---
    const fetchPatients = async () => {
        loading.value = true;
        error.value = null;
        try {
            // Call the raw API function
            const data = await getPatients(); 
            
            // Update the shared reactive state
            patients.value = data; 

        } catch (err) {
            console.error('API Error fetching patients:', err);
            // Handle Axios errors, extracting the message if available
            error.value = err.response?.data?.message || err.message || 'Failed to load patient data.';
        } finally {
            loading.value = false;
        }
    };

    // --- Enrollment/Creation (POST /api/patients/enroll) ---
    const enrollPatient = async (patientData) => {
        loading.value = true; 
        error.value = null;
        try {
            const responseData = await enrollPatientApi(patientData);
            
            // Assuming enrollPatientApi returns the created patient object in responseData.patient
            if (responseData.patient) {
                patients.value.unshift(responseData.patient); // Add to local state
            }
            
            loading.value = false;
            return { success: true, data: responseData };
            
        } catch (err) {
            loading.value = false;
            const message = err.response?.data?.error || err.message || 'Enrollment failed due to a server error.';
            error.value = message;
            console.error('Enrollment API Error:', err);
            return { success: false, error: message };
        }
    };

    // --- Deletion (DELETE /api/patients/:patient_id) ---
    const removePatient = async (patientId) => {
        loading.value = true;
        error.value = null;
        try {
            await deletePatient(patientId); 
            
            // On success, update the local reactive state immediately
            patients.value = patients.value.filter(p => p.patient_id !== patientId);
            
            loading.value = false;
            return true; // Indicate success

        } catch (err) {
            loading.value = false;
            const message = err.response?.data?.error || err.message || 'Could not delete patient.';
            error.value = message;
            console.error('Delete API Error:', err);
            return false; // Indicate failure
        }
    };
    
    // --- Return Interface ---
    return {
        // Reactive State
        patients,
        loading,
        error,
        
        // Functions
        fetchPatients,
        enrollPatient,
        removePatient, // Renamed from deletePatient to avoid confusion with the API function
    };
}
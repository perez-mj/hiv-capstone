<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <div>Backup & Restore</div>
            <v-btn color="primary" @click="createBackup" :loading="creating">
              <v-icon left>mdi-backup-restore</v-icon>
              Create Backup
            </v-btn>
          </v-card-title>
          
          <v-card-text>
            <v-alert type="info" class="mb-4">
              <strong>Backup Information:</strong> Backups include database, uploaded files, and system configuration.
              They are stored for 30 days automatically.
            </v-alert>
            
            <!-- Backup List -->
            <v-data-table
              :headers="headers"
              :items="backups"
              :loading="loading"
              class="elevation-1"
            >
              <template v-slot:item.size="{ item }">
                {{ formatSize(item.size) }}
              </template>
              
              <template v-slot:item.created="{ item }">
                {{ formatDate(item.created) }}
              </template>
              
              <template v-slot:item.actions="{ item }">
                <v-icon small class="mr-2" color="primary" @click="downloadBackup(item)">
                  mdi-download
                </v-icon>
                <v-icon small color="warning" @click="restoreBackup(item)">
                  mdi-restore
                </v-icon>
                <v-icon small color="error" @click="deleteBackup(item)">
                  mdi-delete
                </v-icon>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Restore Confirmation Dialog -->
    <v-dialog v-model="restoreDialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">Confirm Restore</v-card-title>
        <v-card-text>
          Are you sure you want to restore from backup: <strong>{{ restoreFile?.filename }}</strong>?
          <v-alert type="warning" class="mt-4">
            This will overwrite all current data. This action cannot be undone!
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="restoreDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmRestore" :loading="restoring">
            Restore
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/plugins/axios';

const loading = ref(false);
const creating = ref(false);
const restoring = ref(false);
const backups = ref([]);
const restoreDialog = ref(false);
const restoreFile = ref(null);

const headers = [
  { title: 'Filename', key: 'filename', sortable: true },
  { title: 'Size', key: 'size', sortable: true },
  { title: 'Created', key: 'created', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
];

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date) => {
  return new Date(date).toLocaleString();
};

const loadBackups = async () => {
  loading.value = true;
  try {
    const response = await api.get('/backup/list');
    backups.value = response.data;
  } catch (error) {
    showSnackbar('Failed to load backups', 'error');
  } finally {
    loading.value = false;
  }
};

const createBackup = async () => {
  creating.value = true;
  try {
    const response = await api.post('/backup/create');
    showSnackbar('Backup created successfully');
    await loadBackups();
    
    // Auto-download the new backup
    if (response.data.path) {
      const filename = response.data.path.split('/').pop();
      downloadBackup({ filename });
    }
  } catch (error) {
    showSnackbar('Failed to create backup', 'error');
  } finally {
    creating.value = false;
  }
};

const downloadBackup = (backup) => {
  window.open(`${api.defaults.baseURL}/backup/download/${backup.filename}`, '_blank');
  showSnackbar('Download started');
};

const restoreBackup = (backup) => {
  restoreFile.value = backup;
  restoreDialog.value = true;
};

const confirmRestore = async () => {
  restoring.value = true;
  try {
    await api.post(`/backup/restore/${restoreFile.value.filename}`);
    showSnackbar('Restore completed successfully. The system will now reload.');
    restoreDialog.value = false;
    
    // Reload page after 3 seconds
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  } catch (error) {
    showSnackbar('Restore failed', 'error');
  } finally {
    restoring.value = false;
  }
};

const deleteBackup = async (backup) => {
  if (!confirm(`Delete backup ${backup.filename}?`)) return;
  
  try {
    await api.delete(`/backup/${backup.filename}`);
    showSnackbar('Backup deleted successfully');
    await loadBackups();
  } catch (error) {
    showSnackbar('Failed to delete backup', 'error');
  }
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  };
};

onMounted(() => {
  loadBackups();
});
</script>
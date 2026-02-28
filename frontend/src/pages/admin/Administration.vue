<!-- frontend/src/pages/admin/Administration.vue -->
<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- Header Section -->
    <div class="d-flex flex-wrap justify-space-between align-center mb-4">
      <div>
        <h1 class="text-h5 text-md-h4 font-weight-bold" :style="{ color: 'var(--color-primary)' }">
          Administration
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Manage lookup tables and reference data
        </p>
      </div>

      <div class="d-flex gap-2 mt-2 mt-sm-0">
        <!-- Bulk Delete Button - Shown when items are selected -->
        <v-btn 
          v-if="selectedItems.length > 0"
          variant="outlined" 
          color="error" 
          size="small" 
          prepend-icon="mdi-delete-sweep" 
          @click="confirmBulkDelete"
          :loading="bulkDeleting"
          :style="{ borderColor: 'var(--color-error)' }"
        >
          Delete Selected ({{ selectedItems.length }})
        </v-btn>

        <!-- Refresh Button -->
        <v-btn 
          variant="outlined" 
          size="small" 
          prepend-icon="mdi-refresh" 
          @click="refreshTable"
          :loading="loading"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          Refresh
        </v-btn>
        
        <!-- Create Button - Shows different modals based on table -->
        <v-btn 
          color="primary" 
          size="small" 
          prepend-icon="mdi-plus" 
          @click="openCreateDialog"
          :style="{ backgroundColor: 'var(--color-primary)', color: 'white' }"
        >
          New Record
        </v-btn>
      </div>
    </div>

    <!-- Tabs for different tables -->
    <v-tabs
      v-model="activeTable"
      color="primary"
      align-tabs="start"
      class="mb-4"
      show-arrows
    >
      <v-tab value="appointment_types">
        <v-icon start>mdi-calendar-clock</v-icon>
        Appointment Types
        <v-chip size="x-small" class="ml-2" color="primary">{{ appointmentTypes.length }}</v-chip>
      </v-tab>
      <v-tab value="users">
        <v-icon start>mdi-account-group</v-icon>
        Users
        <v-chip size="x-small" class="ml-2" color="primary">{{ users.length }}</v-chip>
      </v-tab>
      <v-tab value="staff">
        <v-icon start>mdi-doctor</v-icon>
        Staff
        <v-chip size="x-small" class="ml-2" color="primary">{{ staff.length }}</v-chip>
      </v-tab>
      <v-tab value="kiosk_devices">
        <v-icon start>mdi-devices</v-icon>
        Kiosk Devices
        <v-chip size="x-small" class="ml-2" color="primary">{{ kioskDevices.length }}</v-chip>
      </v-tab>
    </v-tabs>

    <!-- Search and Filters Card -->
    <v-card 
      elevation="0" 
      border 
      class="mb-4"
      :style="{ 
        borderColor: 'var(--color-border)', 
        borderRadius: 'var(--radius-md)' 
      }"
    >
      <v-card-text class="pa-3">
        <div class="d-flex flex-wrap align-center ga-3">
          <!-- Search -->
          <div style="min-width: 200px; flex: 1;">
            <v-text-field 
              v-model="search" 
              density="compact" 
              variant="outlined"
              placeholder="Search records..." 
              prepend-inner-icon="mdi-magnify" 
              hide-details 
              clearable
              @update:model-value="debouncedSearch"
              class="compact-field"
            />
          </div>

          <!-- Role Filter - Only shown for Users tab -->
          <div v-if="activeTable === 'users'" class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
            <span class="text-caption text-medium-emphasis mr-1" style="white-space: nowrap;">
              Role:
            </span>
            <v-btn-toggle
              v-model="filters.role"
              mandatory="false"
              density="compact"
              color="primary"
              variant="outlined"
              @update:model-value="handleFilterChange"
            >
              <v-btn value="STAFF" size="small">
                <v-icon start size="14">mdi-doctor</v-icon> Staff
              </v-btn>
              <v-btn value="PATIENT" size="small">
                <v-icon start size="14">mdi-account</v-icon> Patient
              </v-btn>
            </v-btn-toggle>
          </div>

          <!-- Status Filter - Only shown for Users tab -->
          <div v-if="activeTable === 'users'" class="d-flex align-center ga-1" style="flex-wrap: nowrap;">
            <span class="text-caption text-medium-emphasis mr-1" style="white-space: nowrap;">
              Status:
            </span>
            <v-btn-toggle
              v-model="filters.status"
              mandatory="false"
              density="compact"
              color="primary"
              variant="outlined"
              @update:model-value="handleFilterChange"
            >
              <v-btn value="active" size="small">
                <v-icon start size="14">mdi-check-circle</v-icon> Active
              </v-btn>
              <v-btn value="inactive" size="small">
                <v-icon start size="14">mdi-cancel</v-icon> Inactive
              </v-btn>
            </v-btn-toggle>
          </div>

          <!-- Sort - Compact -->
          <div style="min-width: 120px;">
            <v-select 
              v-model="sortBy" 
              density="compact" 
              variant="outlined" 
              :items="sortFields" 
              placeholder="Sort"
              hide-details 
              @update:model-value="handleSortChange" 
              class="compact-field"
            />
          </div>

          <!-- Sort Order Toggle - Compact -->
          <v-btn 
            variant="outlined" 
            density="compact"
            size="small"
            :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'" 
            @click="toggleSortOrder"
            :style="{ borderColor: 'var(--color-border)', minWidth: '36px' }" 
          />

          <!-- Clear Filters -->
          <v-btn 
            variant="text" 
            color="primary" 
            size="small" 
            prepend-icon="mdi-filter-remove" 
            @click="clearFilters"
            :disabled="!hasActiveFilters" 
            :style="{ color: 'var(--color-primary)' }" 
          >
            Clear
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Main Table Card -->
    <v-card 
      elevation="0" 
      border 
      :style="{ 
        borderColor: 'var(--color-border)', 
        borderRadius: 'var(--radius-md)' 
      }"
    >
      <v-card-title class="d-flex justify-space-between align-center py-3 px-4">
        <div class="d-flex align-center">
          <v-icon :color="getTableColor" class="mr-2">{{ getTableIcon }}</v-icon>
          <span class="text-subtitle-1 font-weight-medium">{{ currentTableTitle }}</span>
          <v-chip 
            v-if="selectedItems.length > 0"
            size="small" 
            color="primary" 
            class="ml-2"
          >
            {{ selectedItems.length }} selected
          </v-chip>
        </div>
        <span class="text-caption text-medium-emphasis">
          Showing {{ paginationStart }} to {{ paginationEnd }} of {{ filteredItems.length }}
        </span>
      </v-card-title>

      <v-divider :style="{ borderColor: 'var(--color-divider)' }" />

      <v-card-text class="pa-0">
        <!-- Appointment Types Table -->
        <v-data-table-server
          v-if="activeTable === 'appointment_types'"
          v-model:items-per-page="perPage"
          v-model:page="page"
          v-model:selected="selectedItems"
          :headers="appointmentTypeHeaders"
          :items="paginatedAppointmentTypes"
          :items-length="filteredAppointmentTypes.length"
          :loading="loading"
          show-select
          @update:options="handleTableSort"
          class="elevation-0 devices-table"
          density="compact"
          hover
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <!-- Status Column -->
          <template v-slot:item.is_active="{ item }">
            <v-chip 
              :color="item.is_active ? 'success' : 'error'" 
              size="x-small" 
              variant="flat"
              class="font-weight-medium"
            >
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>

          <!-- Duration Column -->
          <template v-slot:item.duration_minutes="{ item }">
            <v-chip variant="outlined" size="small">
              {{ item.duration_minutes }} mins
            </v-chip>
          </template>

          <!-- Created At Column -->
          <template v-slot:item.created_at="{ item }">
            <span class="text-caption">{{ formatDate(item.created_at) }}</span>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn 
                size="x-small" 
                variant="text" 
                color="primary" 
                icon="mdi-pencil" 
                @click="editAppointmentType(item)"
                title="Edit"
              />
              <v-btn 
                size="x-small" 
                variant="text" 
                color="error" 
                icon="mdi-delete" 
                @click="confirmDelete(item, 'appointment_types')"
                :style="{ color: 'var(--color-error)' }" 
                title="Delete"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-calendar-remove</v-icon>
              <div class="text-subtitle-2 text-grey">No Appointment Types Found</div>
              <div class="text-caption text-grey mt-1">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'Click "New Record" to create one' }}
              </div>
            </div>
          </template>
        </v-data-table-server>

        <!-- Users Table -->
        <v-data-table-server
          v-if="activeTable === 'users'"
          v-model:items-per-page="perPage"
          v-model:page="page"
          v-model:selected="selectedItems"
          :headers="userHeaders"
          :items="paginatedUsers"
          :items-length="filteredUsers.length"
          :loading="loading"
          show-select
          @update:options="handleTableSort"
          class="elevation-0 devices-table"
          density="compact"
          hover
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <!-- Role Column -->
          <template v-slot:item.role="{ item }">
            <v-chip 
              :color="getRoleColor(item.role)" 
              size="x-small" 
              variant="flat"
              class="font-weight-medium"
            >
              {{ item.role }}
            </v-chip>
          </template>

          <!-- Status Column -->
          <template v-slot:item.is_active="{ item }">
            <v-chip 
              :color="item.is_active ? 'success' : 'error'" 
              size="x-small" 
              variant="flat"
              class="font-weight-medium"
            >
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>

          <!-- Last Login Column -->
          <template v-slot:item.last_login="{ item }">
            <div class="d-flex flex-column">
              <span class="text-caption">{{ item.last_login ? formatDateTime(item.last_login) : 'Never' }}</span>
              <span class="text-caption text-medium-emphasis">{{ item.last_login ? timeAgo(item.last_login) : '' }}</span>
            </div>
          </template>

          <!-- Source Column - Shows where the user came from -->
          <template v-slot:item.source="{ item }">
            <v-chip 
              :color="getSourceColor(item)" 
              size="x-small" 
              variant="flat"
            >
              {{ getSourceLabel(item) }}
            </v-chip>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn 
                size="x-small" 
                variant="text" 
                color="primary" 
                icon="mdi-pencil" 
                @click="editUser(item)"
                title="Edit"
              />
              <v-btn 
                size="x-small" 
                variant="text" 
                color="warning" 
                icon="mdi-lock-reset" 
                @click="resetPassword(item)"
                title="Reset Password"
              />
              <v-btn 
                size="x-small" 
                variant="text" 
                color="error" 
                icon="mdi-delete" 
                @click="confirmDelete(item, 'users')"
                :style="{ color: 'var(--color-error)' }" 
                title="Delete"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-account-off</v-icon>
              <div class="text-subtitle-2 text-grey">No Users Found</div>
              <div class="text-caption text-grey mt-1">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 
                  'User accounts are created automatically when you create a Patient or Staff member' }}
              </div>
            </div>
          </template>
        </v-data-table-server>

        <!-- Staff Table -->
        <v-data-table-server
          v-if="activeTable === 'staff'"
          v-model:items-per-page="perPage"
          v-model:page="page"
          v-model:selected="selectedItems"
          :headers="staffHeaders"
          :items="paginatedStaff"
          :items-length="filteredStaff.length"
          :loading="loading"
          show-select
          @update:options="handleTableSort"
          class="elevation-0 devices-table"
          density="compact"
          hover
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <!-- Name Column -->
          <template v-slot:item.full_name="{ item }">
            <span class="font-weight-medium">{{ item.first_name }} {{ item.middle_name || '' }} {{ item.last_name }}</span>
          </template>

          <!-- User Status Column -->
          <template v-slot:item.user_status="{ item }">
            <v-chip 
              v-if="item.user_id"
              :color="item.user_active ? 'success' : 'error'" 
              size="x-small" 
              variant="flat"
            >
              {{ item.user_active ? 'User Active' : 'User Inactive' }}
            </v-chip>
            <v-chip 
              v-else
              color="warning" 
              size="x-small" 
              variant="flat"
            >
              No User Account
            </v-chip>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn 
                size="x-small" 
                variant="text" 
                color="primary" 
                icon="mdi-pencil" 
                @click="editStaff(item)"
                title="Edit"
              />
              <v-btn 
                v-if="!item.user_id"
                size="x-small" 
                variant="text" 
                color="success" 
                icon="mdi-account-plus" 
                @click="createUserForStaff(item)"
                title="Create User Account"
              />
              <v-btn 
                size="x-small" 
                variant="text" 
                color="error" 
                icon="mdi-delete" 
                @click="confirmDelete(item, 'staff')"
                :style="{ color: 'var(--color-error)' }" 
                title="Delete"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-doctor-off</v-icon>
              <div class="text-subtitle-2 text-grey">No Staff Found</div>
              <div class="text-caption text-grey mt-1">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 'Click "New Record" to create one' }}
              </div>
            </div>
          </template>
        </v-data-table-server>

        <!-- Kiosk Devices Table -->
        <v-data-table-server
          v-if="activeTable === 'kiosk_devices'"
          v-model:items-per-page="perPage"
          v-model:page="page"
          v-model:selected="selectedItems"
          :headers="kioskHeaders"
          :items="paginatedKioskDevices"
          :items-length="filteredKioskDevices.length"
          :loading="loading"
          show-select
          @update:options="handleTableSort"
          class="elevation-0 devices-table"
          density="compact"
          hover
        >
          <!-- Loading State -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10" />
          </template>

          <!-- Device ID Column -->
          <template v-slot:item.device_id="{ item }">
            <v-chip variant="outlined" size="small">
              <code>{{ item.device_id }}</code>
            </v-chip>
          </template>

          <!-- Authorization Column -->
          <template v-slot:item.is_authorized="{ item }">
            <v-switch
              :model-value="item.is_authorized"
              color="primary"
              hide-details
              density="compact"
              :loading="authLoading === item.device_id"
              @update:model-value="toggleAuthorization(item, $event)"
              class="authorization-switch"
            />
          </template>

          <!-- Last Seen Column -->
          <template v-slot:item.last_seen="{ item }">
            <div class="d-flex flex-column">
              <span class="text-caption">{{ item.last_seen ? formatDateTime(item.last_seen) : 'Never' }}</span>
              <span class="text-caption text-medium-emphasis">{{ item.last_seen ? timeAgo(item.last_seen) : '' }}</span>
            </div>
          </template>

          <!-- Actions Column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn 
                size="x-small" 
                variant="text" 
                color="primary" 
                icon="mdi-pencil" 
                @click="editKioskDevice(item)"
                title="Edit"
              />
              <v-btn 
                size="x-small" 
                variant="text" 
                :color="item.is_authorized ? 'warning' : 'success'" 
                :icon="item.is_authorized ? 'mdi-shield-off' : 'mdi-shield'" 
                @click="toggleAuthorization(item)"
                title="Toggle Authorization"
              />
              <v-btn 
                size="x-small" 
                variant="text" 
                color="error" 
                icon="mdi-delete" 
                @click="confirmDelete(item, 'kiosk_devices')"
                :style="{ color: 'var(--color-error)' }" 
                title="Delete"
              />
            </div>
          </template>

          <!-- Empty State -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-devices-off</v-icon>
              <div class="text-subtitle-2 text-grey">No Kiosk Devices Found</div>
              <div class="text-caption text-grey mt-1">
                {{ hasActiveFilters ? 'Try adjusting your filters' : 
                  'Devices register automatically when they access the kiosk display page' }}
              </div>
            </div>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <!-- User Creation Info Modal -->
    <v-dialog v-model="userInfoModal.show" max-width="400" persistent>
      <v-card class="info-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-info-lighten-5">
          <v-icon color="info" size="small" class="mr-2">mdi-information</v-icon>
          Creating User Accounts
        </v-card-title>
        
        <v-card-text class="pa-3">
          <div class="text-center mb-3">
            <v-icon size="48" color="info" class="mb-2">mdi-account-plus</v-icon>
          </div>
          
          <p class="text-body-2 mb-3">
            User accounts are automatically created when you:
          </p>
          
          <v-list density="compact" bg-color="transparent" class="mb-3">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="success" size="small">mdi-check</v-icon>
              </template>
              <v-list-item-title class="text-caption">Create a new Patient</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="success" size="small">mdi-check</v-icon>
              </template>
              <v-list-item-title class="text-caption">Create a new Staff member</v-list-item-title>
            </v-list-item>
          </v-list>
          
          <p class="text-body-2 mb-2">
            To create a new user account:
          </p>
          
          <div class="d-flex flex-column gap-2">
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-account-plus"
              @click="goToPatientManagement"
              block
            >
              Add New Patient
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-doctor"
              @click="goToStaffTab"
              block
            >
              Add New Staff
            </v-btn>
          </div>
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            color="primary" 
            variant="text" 
            @click="userInfoModal.show = false"
            size="small"
          >
            Got it
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Kiosk Device Info Modal -->
    <v-dialog v-model="kioskInfoModal.show" max-width="400" persistent>
      <v-card class="info-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-info-lighten-5">
          <v-icon color="info" size="small" class="mr-2">mdi-information</v-icon>
          Kiosk Device Registration
        </v-card-title>
        
        <v-card-text class="pa-3">
          <div class="text-center mb-3">
            <v-icon size="48" color="info" class="mb-2">mdi-devices</v-icon>
          </div>
          
          <p class="text-body-2 mb-3">
            Kiosk devices register automatically when they access the kiosk display page.
          </p>
          
          <v-alert
            type="info"
            variant="tonal"
            class="mb-3"
            density="compact"
          >
            <div class="d-flex align-center">
              <code class="text-caption">{{ kioskInfoModal.displayUrl }}</code>
              <v-btn
                size="x-small"
                icon="mdi-content-copy"
                variant="text"
                @click="copyToClipboard(kioskInfoModal.displayUrl)"
                class="ml-2"
              />
            </div>
          </v-alert>
          
          <p class="text-caption mb-2">
            <strong>How it works:</strong>
          </p>
          
          <v-timeline density="compact" align="start" side="end" class="mb-2">
            <v-timeline-item
              v-for="(step, index) in kioskSteps"
              :key="index"
              size="x-small"
              dot-color="info"
            >
              <div class="text-caption">{{ step }}</div>
            </v-timeline-item>
          </v-timeline>
          
          <p class="text-caption text-medium-emphasis mt-2">
            Once registered, the device will appear in this table. You can then authorize it to allow access to kiosk features.
          </p>
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            color="primary" 
            variant="text" 
            @click="kioskInfoModal.show = false"
            size="small"
          >
            Got it
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create/Edit Dialog (Only for appointment_types and staff) -->
    <v-dialog v-model="dialog.show" max-width="500px" persistent>
      <v-card class="edit-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3" :class="dialog.mode === 'create' ? 'bg-primary-lighten-5' : 'bg-info-lighten-5'">
          <v-icon :color="dialog.mode === 'create' ? 'primary' : 'info'" size="small" class="mr-2">
            {{ dialog.mode === 'create' ? 'mdi-plus' : 'mdi-pencil' }}
          </v-icon>
          {{ dialog.title }}
        </v-card-title>

        <v-card-text class="pa-3">
          <v-form ref="form" v-model="dialog.valid">
            <!-- Appointment Type Form -->
            <template v-if="activeTable === 'appointment_types'">
              <v-text-field
                v-model="dialog.data.type_name"
                label="Type Name"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="compact"
                class="mb-3"
                hide-details="auto"
              />

              <v-textarea
                v-model="dialog.data.description"
                label="Description"
                rows="2"
                variant="outlined"
                density="compact"
                class="mb-3"
                hide-details="auto"
              />

              <v-text-field
                v-model.number="dialog.data.duration_minutes"
                label="Duration (minutes)"
                type="number"
                :rules="[rules.required, rules.positive]"
                required
                variant="outlined"
                density="compact"
                class="mb-3"
                hide-details="auto"
              />

              <v-switch
                v-model="dialog.data.is_active"
                label="Active"
                color="success"
                density="compact"
                hide-details
                class="mt-2"
              />
            </template>

            <!-- Staff Form -->
            <template v-if="activeTable === 'staff'">
              <v-alert
                v-if="dialog.mode === 'create'"
                type="info"
                variant="tonal"
                class="mb-3"
                density="compact"
              >
                <div class="d-flex align-center">
                  <v-icon size="20" class="mr-2">mdi-information</v-icon>
                  <div>
                    <span class="text-caption">
                      A user account will be automatically created for this staff member with username based on their name.
                    </span>
                  </div>
                </div>
              </v-alert>

              <v-row dense>
                <v-col cols="4">
                  <v-text-field
                    v-model="dialog.data.first_name"
                    label="First Name"
                    :rules="[rules.required]"
                    required
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model="dialog.data.middle_name"
                    label="Middle Name"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model="dialog.data.last_name"
                    label="Last Name"
                    :rules="[rules.required]"
                    required
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                  />
                </v-col>
              </v-row>

              <v-select
                v-if="dialog.mode === 'edit'"
                v-model="dialog.data.user_id"
                :items="userOptions"
                item-title="username"
                item-value="id"
                label="Linked User"
                variant="outlined"
                density="compact"
                class="mt-3"
                hide-details="auto"
              />

              <v-text-field
                v-model="dialog.data.position"
                label="Position"
                variant="outlined"
                density="compact"
                class="mt-3"
                hide-details="auto"
              />

              <v-text-field
                v-model="dialog.data.contact_number"
                label="Contact Number"
                variant="outlined"
                density="compact"
                class="mt-3"
                hide-details="auto"
              />

              <!-- Password field for new staff (auto-create user) -->
              <template v-if="dialog.mode === 'create'">
                <v-divider class="my-3" />
                <p class="text-caption font-weight-medium mb-2">User Account Details</p>
                <v-text-field
                  v-model="dialog.data.username"
                  label="Username (optional)"
                  variant="outlined"
                  density="compact"
                  class="mb-3"
                  hint="Leave blank to auto-generate from name"
                  persistent-hint
                  hide-details="auto"
                />
                <v-text-field
                  v-model="dialog.data.password"
                  label="Password"
                  type="password"
                  :rules="[rules.passwordMinLength]"
                  variant="outlined"
                  density="compact"
                  class="mb-3"
                  hint="Minimum 6 characters. Leave blank to auto-generate"
                  persistent-hint
                  hide-details="auto"
                />
                <v-select
                  v-model="dialog.data.role"
                  :items="['NURSE', 'ADMIN']"
                  label="Role"
                  variant="outlined"
                  density="compact"
                  class="mb-3"
                  hint="Select user role"
                  persistent-hint
                  hide-details="auto"
                />
              </template>
            </template>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            variant="text" 
            color="grey-darken-1" 
            @click="closeDialog"
            :disabled="dialog.saving"
            size="small"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            variant="elevated" 
            @click="saveRecord"
            :loading="dialog.saving"
            :prepend-icon="dialog.mode === 'create' ? 'mdi-plus' : 'mdi-check'"
            size="small"
          >
            {{ dialog.mode === 'create' ? 'Create' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Single Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog.show" max-width="360" persistent>
      <v-card class="delete-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-error-lighten-5">
          <v-icon color="error" size="small" class="mr-2">mdi-delete</v-icon>
          Delete {{ getDeleteItemTitle() }}
        </v-card-title>
        
        <v-card-text class="pa-3">
          <p class="text-body-2 mb-2">
            Are you sure you want to delete this {{ getDeleteItemTitle().toLowerCase() }}?
          </p>
          <p class="text-caption text-error">
            This action cannot be undone.
          </p>
          
          <v-alert
            v-if="deleteDialog.table === 'users'"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            <div class="d-flex align-center">
              <v-icon size="18" class="mr-2">mdi-alert</v-icon>
              <span class="text-caption">
                Deleting this user will also remove their associated patient or staff record.
              </span>
            </div>
          </v-alert>
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            variant="text" 
            color="grey-darken-1" 
            @click="deleteDialog.show = false"
            :disabled="deleteDialog.loading"
            size="small"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="error" 
            variant="elevated" 
            @click="executeDelete"
            :loading="deleteDialog.loading"
            prepend-icon="mdi-delete"
            size="small"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bulk Delete Confirmation Dialog -->
    <v-dialog v-model="bulkDeleteDialog.show" max-width="400" persistent>
      <v-card class="delete-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-error-lighten-5">
          <v-icon color="error" size="small" class="mr-2">mdi-delete-sweep</v-icon>
          Delete Multiple Records
        </v-card-title>
        
        <v-card-text class="pa-3">
          <p class="text-body-2 mb-2">
            Are you sure you want to delete {{ bulkDeleteDialog.count }} selected {{ bulkDeleteDialog.count === 1 ? 'record' : 'records' }}?
          </p>
          <p class="text-caption text-error">
            This action cannot be undone.
          </p>
          
          <v-alert
            v-if="bulkDeleteDialog.hasUsers"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            <div class="d-flex align-center">
              <v-icon size="18" class="mr-2">mdi-alert</v-icon>
              <span class="text-caption">
                Deleting users will also remove their associated patient or staff records.
              </span>
            </div>
          </v-alert>
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            variant="text" 
            color="grey-darken-1" 
            @click="bulkDeleteDialog.show = false"
            :disabled="bulkDeleteDialog.loading"
            size="small"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="error" 
            variant="elevated" 
            @click="executeBulkDelete"
            :loading="bulkDeleteDialog.loading"
            prepend-icon="mdi-delete-sweep"
            size="small"
          >
            Delete All
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create User for Staff Dialog -->
    <v-dialog v-model="createUserDialog.show" max-width="400" persistent>
      <v-card class="edit-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-success-lighten-5">
          <v-icon color="success" size="small" class="mr-2">mdi-account-plus</v-icon>
          Create User for Staff
        </v-card-title>
        
        <v-card-text class="pa-3">
          <p class="text-body-2 mb-3">
            Create user account for <span class="font-weight-bold">{{ createUserDialog.staffName }}</span>
          </p>
          
          <v-text-field
            v-model="createUserDialog.username"
            label="Username"
            :rules="[rules.required]"
            required
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details="auto"
          />
          
          <v-text-field
            v-model="createUserDialog.password"
            label="Password"
            type="password"
            :rules="[rules.required, rules.passwordMinLength]"
            required
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details="auto"
          />
          
          <v-select
            v-model="createUserDialog.role"
            :items="['NURSE', 'ADMIN']"
            label="Role"
            :rules="[rules.required]"
            required
            variant="outlined"
            density="compact"
            class="mb-3"
            hide-details="auto"
          />
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            variant="text" 
            color="grey-darken-1" 
            @click="createUserDialog.show = false"
            :disabled="createUserDialog.loading"
            size="small"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="success" 
            variant="elevated" 
            @click="executeCreateUserForStaff"
            :loading="createUserDialog.loading"
            prepend-icon="mdi-account-plus"
            size="small"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Password Reset Dialog -->
    <v-dialog v-model="passwordDialog.show" max-width="360" persistent>
      <v-card class="delete-dialog">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-3 bg-warning-lighten-5">
          <v-icon color="warning" size="small" class="mr-2">mdi-lock-reset</v-icon>
          Reset Password
        </v-card-title>
        
        <v-card-text class="pa-3">
          <p class="text-body-2 mb-3">
            Reset password for <span class="font-weight-bold">{{ passwordDialog.username }}</span>
          </p>
          
          <v-text-field
            v-model="passwordDialog.newPassword"
            label="New Password"
            type="password"
            :rules="[rules.required, rules.passwordMinLength]"
            required
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-3"
          />
          
          <v-text-field
            v-model="passwordDialog.confirmPassword"
            label="Confirm Password"
            type="password"
            :rules="[rules.required, rules.passwordMatch]"
            required
            variant="outlined"
            density="compact"
            hide-details="auto"
          />
        </v-card-text>
        
        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn 
            variant="text" 
            color="grey-darken-1" 
            @click="passwordDialog.show = false"
            :disabled="passwordDialog.loading"
            size="small"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="warning" 
            variant="elevated" 
            @click="executePasswordReset"
            :loading="passwordDialog.loading"
            prepend-icon="mdi-lock-reset"
            size="small"
          >
            Reset
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.type}`"
          @click="removeToast(toast.id)"
        >
          <div class="toast-content">
            <v-icon :icon="toast.icon" size="20" class="mr-2" />
            <span>{{ toast.message }}</span>
          </div>
          <div 
            class="toast-progress" 
            :style="{ animationDuration: `${toast.duration}ms` }" 
          />
        </div>
      </transition-group>
    </div>
  </v-container>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { appointmentsApi, usersApi, kioskApi, staffApi, patientsApi } from '@/api'
import debounce from 'lodash/debounce'

export default {
  name: 'Administration',

  setup() {
    const router = useRouter()

    // Toast system
    const toasts = ref([])
    let toastId = 0

    function showToast(message, type = 'success', duration = 3000) {
      const id = toastId++
      const icon = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information'
      }[type] || 'mdi-information'
      
      toasts.value.push({
        id,
        message,
        type,
        icon,
        duration
      })
      
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    function removeToast(id) {
      const index = toasts.value.findIndex(t => t.id === id)
      if (index !== -1) {
        toasts.value.splice(index, 1)
      }
    }

    // State
    const loading = ref(false)
    const bulkDeleting = ref(false)
    const authLoading = ref(null)
    const activeTable = ref('appointment_types')
    const search = ref('')
    const page = ref(1)
    const perPage = ref(10)
    const sortBy = ref('created_at_desc')
    const sortOrder = ref('desc')
    const form = ref(null)
    const selectedItems = ref([])

    // Filters
    const filters = ref({
      role: null,
      status: null
    })

    // Data Stores
    const appointmentTypes = ref([])
    const users = ref([])
    const staff = ref([])
    const kioskDevices = ref([])
    const patients = ref([])

    // Dialog states
    const dialog = reactive({
      show: false,
      title: '',
      mode: 'create',
      valid: false,
      saving: false,
      data: {}
    })

    const userInfoModal = reactive({
      show: false
    })

    const kioskInfoModal = reactive({
      show: false,
      displayUrl: `${window.location.origin}/kiosk/display`
    })

    const deleteDialog = reactive({
      show: false,
      loading: false,
      item: null,
      table: null
    })

    const bulkDeleteDialog = reactive({
      show: false,
      loading: false,
      count: 0,
      hasUsers: false
    })

    const createUserDialog = reactive({
      show: false,
      loading: false,
      staffId: null,
      staffName: '',
      username: '',
      password: '',
      role: 'NURSE'
    })

    const passwordDialog = reactive({
      show: false,
      loading: false,
      userId: null,
      username: '',
      newPassword: '',
      confirmPassword: ''
    })

    // Kiosk steps for info modal
    const kioskSteps = [
      'Navigate to the kiosk display page on the device',
      'Device automatically generates a random 8-character hex ID',
      'Device appears in this table with "Unauthorized" status',
      'Verify the device ID matches the physical device',
      'Toggle authorization switch to approve the device'
    ]

    // Sort fields
    const sortFields = computed(() => {
      const baseFields = [
        { title: 'Newest First', value: 'created_at_desc' },
        { title: 'Oldest First', value: 'created_at_asc' }
      ]

      if (activeTable.value === 'appointment_types') {
        baseFields.push(
          { title: 'Type Name (A-Z)', value: 'type_name_asc' },
          { title: 'Type Name (Z-A)', value: 'type_name_desc' }
        )
      } else if (activeTable.value === 'users') {
        baseFields.push(
          { title: 'Username (A-Z)', value: 'username_asc' },
          { title: 'Username (Z-A)', value: 'username_desc' },
          { title: 'Last Login (Recent)', value: 'last_login_desc' },
          { title: 'Last Login (Oldest)', value: 'last_login_asc' }
        )
      } else if (activeTable.value === 'staff') {
        baseFields.push(
          { title: 'Name (A-Z)', value: 'last_name_asc' },
          { title: 'Name (Z-A)', value: 'last_name_desc' }
        )
      } else if (activeTable.value === 'kiosk_devices') {
        baseFields.push(
          { title: 'Device ID (A-Z)', value: 'device_id_asc' },
          { title: 'Device ID (Z-A)', value: 'device_id_desc' },
          { title: 'Device Name (A-Z)', value: 'device_name_asc' },
          { title: 'Device Name (Z-A)', value: 'device_name_desc' },
          { title: 'Last Seen (Recent)', value: 'last_seen_desc' },
          { title: 'Last Seen (Oldest)', value: 'last_seen_asc' }
        )
      }

      return baseFields
    })

    // Table Headers
    const appointmentTypeHeaders = [
      { title: 'ID', key: 'id', sortable: true, width: '80' },
      { title: 'Type Name', key: 'type_name', sortable: true },
      { title: 'Description', key: 'description' },
      { title: 'Duration', key: 'duration_minutes', sortable: true },
      { title: 'Status', key: 'is_active', sortable: true, width: '100' },
      { title: 'Created', key: 'created_at', sortable: true, width: '100' },
      { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '100' }
    ]

    const userHeaders = [
      { title: '', key: 'data-table-select', width: '48' }, // Selection checkbox column
      { title: 'ID', key: 'id', width: '80' },
      { title: 'Username', key: 'username', sortable: true },
      { title: 'Email', key: 'email' },
      { title: 'Role', key: 'role', sortable: true, width: '100' },
      { title: 'Status', key: 'is_active', sortable: true, width: '100' },
      { title: 'Source', key: 'source', sortable: false, width: '100' },
      { title: 'Last Login', key: 'last_login', sortable: true, width: '140' },
      { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '140' }
    ]

    const staffHeaders = [
      { title: '', key: 'data-table-select', width: '48' }, // Selection checkbox column
      { title: 'ID', key: 'id', width: '80' },
      { title: 'Name', key: 'full_name', sortable: true },
      { title: 'Position', key: 'position' },
      { title: 'Contact', key: 'contact_number' },
      { title: 'User Status', key: 'user_status', sortable: false },
      { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '140' }
    ]

    const kioskHeaders = [
      { title: '', key: 'data-table-select', width: '48' }, // Selection checkbox column
      { title: 'ID', key: 'id', width: '80' },
      { title: 'Device ID', key: 'device_id', sortable: true },
      { title: 'Device Name', key: 'device_name', sortable: true },
      { title: 'Authorized', key: 'is_authorized', sortable: true, width: '100' },
      { title: 'Last Seen', key: 'last_seen', sortable: true, width: '140' },
      { title: 'Actions', key: 'actions', sortable: false, align: 'center', width: '140' }
    ]

    // Filtered Data
    const filteredAppointmentTypes = computed(() => {
      let filtered = [...appointmentTypes.value]
      
      if (search.value) {
        const term = search.value.toLowerCase()
        filtered = filtered.filter(item => 
          item.type_name?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
        )
      }
      
      // Sorting
      const [sortField, sortDir] = sortBy.value.split('_')
      filtered.sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]
        
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
        return 0
      })
      
      return filtered
    })

    const filteredUsers = computed(() => {
      let filtered = [...users.value]
      
      // Search filter
      if (search.value) {
        const term = search.value.toLowerCase()
        filtered = filtered.filter(item => 
          item.username?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term)
        )
      }
      
      // Role filter (Staff/Patient)
      if (filters.value.role) {
        if (filters.value.role === 'STAFF') {
          filtered = filtered.filter(item => ['ADMIN', 'NURSE'].includes(item.role))
        } else if (filters.value.role === 'PATIENT') {
          filtered = filtered.filter(item => item.role === 'PATIENT')
        }
      }
      
      // Status filter
      if (filters.value.status) {
        filtered = filtered.filter(item => 
          filters.value.status === 'active' ? item.is_active : !item.is_active
        )
      }
      
      // Sorting
      const [sortField, sortDir] = sortBy.value.split('_')
      filtered.sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]
        
        if (sortField === 'last_login') {
          aVal = a.last_login ? new Date(a.last_login) : new Date(0)
          bVal = b.last_login ? new Date(b.last_login) : new Date(0)
        }
        
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
        return 0
      })
      
      return filtered
    })

    const filteredStaff = computed(() => {
      let filtered = [...staff.value]
      
      if (search.value) {
        const term = search.value.toLowerCase()
        filtered = filtered.filter(item => 
          item.first_name?.toLowerCase().includes(term) ||
          item.last_name?.toLowerCase().includes(term) ||
          item.position?.toLowerCase().includes(term)
        )
      }
      
      const [sortField, sortDir] = sortBy.value.split('_')
      filtered.sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]
        
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
        return 0
      })
      
      return filtered
    })

    const filteredKioskDevices = computed(() => {
      let filtered = [...kioskDevices.value]
      
      if (search.value) {
        const term = search.value.toLowerCase()
        filtered = filtered.filter(item => 
          item.device_id?.toLowerCase().includes(term) ||
          item.device_name?.toLowerCase().includes(term)
        )
      }
      
      const [sortField, sortDir] = sortBy.value.split('_')
      filtered.sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]
        
        if (sortField === 'last_seen') {
          aVal = a.last_seen ? new Date(a.last_seen) : new Date(0)
          bVal = b.last_seen ? new Date(b.last_seen) : new Date(0)
        }
        
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
        return 0
      })
      
      return filtered
    })

    // Current filtered items based on active table
    const filteredItems = computed(() => {
      switch (activeTable.value) {
        case 'appointment_types': return filteredAppointmentTypes.value
        case 'users': return filteredUsers.value
        case 'staff': return filteredStaff.value
        case 'kiosk_devices': return filteredKioskDevices.value
        default: return []
      }
    })

    // Has active filters
    const hasActiveFilters = computed(() => {
      return search.value || filters.value.role || filters.value.status
    })

    // Paginated Data
    const paginatedAppointmentTypes = computed(() => {
      const start = (page.value - 1) * perPage.value
      const end = start + perPage.value
      return filteredAppointmentTypes.value.slice(start, end)
    })

    const paginatedUsers = computed(() => {
      const start = (page.value - 1) * perPage.value
      const end = start + perPage.value
      return filteredUsers.value.slice(start, end)
    })

    const paginatedStaff = computed(() => {
      const start = (page.value - 1) * perPage.value
      const end = start + perPage.value
      return filteredStaff.value.slice(start, end)
    })

    const paginatedKioskDevices = computed(() => {
      const start = (page.value - 1) * perPage.value
      const end = start + perPage.value
      return filteredKioskDevices.value.slice(start, end)
    })

    // Pagination helpers
    const paginationStart = computed(() => 
      filteredItems.value.length ? (page.value - 1) * perPage.value + 1 : 0
    )
    const paginationEnd = computed(() => 
      Math.min(page.value * perPage.value, filteredItems.value.length)
    )

    // User options for staff form
    const userOptions = computed(() => {
      return users.value.filter(u => !staff.value.some(s => s.user_id === u.id))
    })

    // Source label for users
    const getSourceLabel = (user) => {
      if (user.role === 'PATIENT') {
        const patient = patients.value.find(p => p.user_id === user.id)
        return patient ? 'Patient' : 'Unknown Patient'
      } else {
        const staffMember = staff.value.find(s => s.user_id === user.id)
        return staffMember ? 'Staff' : 'Standalone'
      }
    }

    const getSourceColor = (user) => {
      if (user.role === 'PATIENT') {
        return 'success'
      } else {
        const staffMember = staff.value.find(s => s.user_id === user.id)
        return staffMember ? 'warning' : 'info'
      }
    }

    // Computed properties for current table
    const currentTableTitle = computed(() => {
      const titles = {
        appointment_types: 'Appointment Types',
        users: 'Users',
        staff: 'Staff',
        kiosk_devices: 'Kiosk Devices'
      }
      return titles[activeTable.value] || 'Administration'
    })

    const getTableIcon = computed(() => {
      const icons = {
        appointment_types: 'mdi-calendar-clock',
        users: 'mdi-account-group',
        staff: 'mdi-doctor',
        kiosk_devices: 'mdi-devices'
      }
      return icons[activeTable.value] || 'mdi-table'
    })

    const getTableColor = computed(() => {
      const colors = {
        appointment_types: 'primary',
        users: 'success',
        staff: 'warning',
        kiosk_devices: 'info'
      }
      return colors[activeTable.value] || 'primary'
    })

    // Validation rules
    const rules = {
      required: v => !!v || 'This field is required',
      email: v => !v || /.+@.+\..+/.test(v) || 'Invalid email',
      positive: v => v > 0 || 'Must be greater than 0',
      passwordMinLength: v => !v || v.length >= 6 || 'Minimum 6 characters',
      passwordMatch: v => v === passwordDialog.newPassword || 'Passwords do not match'
    }

    // Debounced search
    const debouncedSearch = debounce(() => {
      page.value = 1
    }, 500)

    // Methods
    const handleTableSort = (options) => {
      const { sortBy: sortItems, sortDesc } = options
      if (sortItems?.length) {
        const key = sortItems[0]
        const order = sortDesc[0] ? 'desc' : 'asc'
        sortBy.value = `${key}_${order}`
        sortOrder.value = order
      }
    }

    const handleSortChange = () => {
      const parts = sortBy.value.split('_')
      if (parts.length > 1 && ['asc', 'desc'].includes(parts[parts.length - 1])) {
        sortOrder.value = parts[parts.length - 1]
      }
      page.value = 1
    }

    const toggleSortOrder = () => {
      const newOrder = sortOrder.value === 'asc' ? 'desc' : 'asc'
      sortOrder.value = newOrder
      const baseField = sortBy.value.split('_').slice(0, -1).join('_') || 'created_at'
      sortBy.value = `${baseField}_${newOrder}`
    }

    const handleFilterChange = () => {
      page.value = 1
    }

    const clearFilters = () => {
      search.value = ''
      filters.value.role = null
      filters.value.status = null
      sortBy.value = 'created_at_desc'
      sortOrder.value = 'desc'
      page.value = 1
    }

    const clearSelection = () => {
      selectedItems.value = []
    }

    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text)
      showToast('URL copied to clipboard', 'success')
    }

    const goToPatientManagement = () => {
      userInfoModal.show = false
      router.push('/admin/patients')
    }

    const goToStaffTab = () => {
      userInfoModal.show = false
      activeTable.value = 'staff'
    }

    const fetchAppointmentTypes = async () => {
      try {
        const response = await appointmentsApi.getTypes()
        appointmentTypes.value = response.data.data || []
      } catch (error) {
        console.error('Error fetching appointment types:', error)
        showToast('Failed to load appointment types', 'error')
      }
    }

    const fetchUsers = async () => {
      try {
        const response = await usersApi.getAll()
        users.value = response.data.data || []
      } catch (error) {
        console.error('Error fetching users:', error)
        showToast('Failed to load users', 'error')
      }
    }

    const fetchStaff = async () => {
      try {
        const response = await staffApi.getAll()
        staff.value = response.data.data || []
      } catch (error) {
        console.error('Error fetching staff:', error)
        showToast('Failed to load staff', 'error')
      }
    }

    const fetchKioskDevices = async () => {
      try {
        const response = await kioskApi.getDevices()
        kioskDevices.value = response.data.devices.map(device => ({
          ...device,
          is_authorized: Boolean(device.is_authorized)
        })) || []
      } catch (error) {
        console.error('Error fetching kiosk devices:', error)
        showToast('Failed to load kiosk devices', 'error')
      }
    }

    const fetchPatients = async () => {
      try {
        const response = await patientsApi.getAll({ limit: 1000 })
        patients.value = response.data.data || []
      } catch (error) {
        console.error('Error fetching patients:', error)
      }
    }

    const refreshTable = async () => {
      loading.value = true
      clearSelection()
      try {
        switch (activeTable.value) {
          case 'appointment_types':
            await fetchAppointmentTypes()
            break
          case 'users':
            await fetchUsers()
            await fetchPatients()
            await fetchStaff()
            break
          case 'staff':
            await fetchStaff()
            await fetchUsers()
            break
          case 'kiosk_devices':
            await fetchKioskDevices()
            break
        }
        showToast(`${currentTableTitle.value} refreshed`, 'success')
      } catch (error) {
        console.error('Refresh error:', error)
      } finally {
        loading.value = false
      }
    }

    const openCreateDialog = () => {
      switch (activeTable.value) {
        case 'users':
          // Show info modal for users
          userInfoModal.show = true
          break
        case 'kiosk_devices':
          // Show info modal for kiosk devices
          kioskInfoModal.show = true
          break
        case 'appointment_types':
        case 'staff':
          // Open actual create dialog for these tables
          dialog.mode = 'create'
          dialog.title = `Create ${currentTableTitle.value.slice(0, -1)}`
          dialog.data = getEmptyRecord()
          dialog.show = true
          break
      }
    }

    const getEmptyRecord = () => {
      switch (activeTable.value) {
        case 'appointment_types':
          return {
            type_name: '',
            description: '',
            duration_minutes: 30,
            is_active: true
          }
        case 'staff':
          return {
            user_id: null,
            first_name: '',
            last_name: '',
            middle_name: '',
            position: '',
            contact_number: '',
            username: '',
            password: '',
            role: 'NURSE'
          }
        default:
          return {}
      }
    }

    const editAppointmentType = (item) => {
      dialog.mode = 'edit'
      dialog.title = 'Edit Appointment Type'
      dialog.data = { ...item }
      dialog.show = true
    }

    const editUser = (item) => {
      // Show message that user editing is handled elsewhere
      showToast('User details can be edited in patient or staff management', 'info')
    }

    const editStaff = (item) => {
      dialog.mode = 'edit'
      dialog.title = 'Edit Staff'
      dialog.data = { ...item }
      dialog.show = true
    }

    const editKioskDevice = (item) => {
      // For kiosk devices, we only allow toggling authorization and editing name
      // You might want to implement a simple edit dialog for device name
      showToast('Device name can be edited in the device details', 'info')
    }

    const createUserForStaff = (staff) => {
      createUserDialog.staffId = staff.id
      createUserDialog.staffName = `${staff.first_name} ${staff.last_name}`
      createUserDialog.username = `${staff.first_name.toLowerCase()}.${staff.last_name.toLowerCase()}`
      createUserDialog.password = ''
      createUserDialog.role = 'NURSE'
      createUserDialog.show = true
    }

    const executeCreateUserForStaff = async () => {
      if (!createUserDialog.username || !createUserDialog.password) {
        showToast('Username and password are required', 'error')
        return
      }

      createUserDialog.loading = true

      try {
        const userData = {
          username: createUserDialog.username,
          password: createUserDialog.password,
          role: createUserDialog.role,
          is_active: true,
          staff_id: createUserDialog.staffId
        }

        const response = await usersApi.create(userData)

        if (response.data.success) {
          showToast('User account created successfully', 'success')
          createUserDialog.show = false
          await refreshTable()
        }
      } catch (error) {
        console.error('Error creating user:', error)
        showToast(error.response?.data?.error || 'Failed to create user', 'error')
      } finally {
        createUserDialog.loading = false
      }
    }

    const closeDialog = () => {
      dialog.show = false
      dialog.data = {}
    }

    const saveRecord = async () => {
      if (!dialog.valid) {
        form.value?.validate()
        return
      }

      dialog.saving = true

      try {
        let response

        switch (activeTable.value) {
          case 'appointment_types':
            if (dialog.mode === 'create') {
              response = await appointmentsApi.createType(dialog.data)
            } else {
              response = await appointmentsApi.updateType(dialog.data.id, dialog.data)
            }
            break
          case 'staff':
            if (dialog.mode === 'create') {
              response = await staffApi.create(dialog.data)
            } else {
              response = await staffApi.update(dialog.data.id, dialog.data)
            }
            break
        }

        if (response?.data?.success) {
          showToast(`Record ${dialog.mode === 'create' ? 'created' : 'updated'} successfully`, 'success')
          closeDialog()
          await refreshTable()
        }
      } catch (error) {
        console.error('Error saving record:', error)
        showToast(error.response?.data?.error || 'Failed to save record', 'error')
      } finally {
        dialog.saving = false
      }
    }

    const confirmDelete = (item, table) => {
      deleteDialog.item = item
      deleteDialog.table = table
      deleteDialog.show = true
    }

    const confirmBulkDelete = () => {
      bulkDeleteDialog.count = selectedItems.value.length
      bulkDeleteDialog.hasUsers = activeTable.value === 'users'
      bulkDeleteDialog.show = true
    }

    const getDeleteItemTitle = () => {
      const titles = {
        appointment_types: 'Appointment Type',
        users: 'User',
        staff: 'Staff',
        kiosk_devices: 'Kiosk Device'
      }
      return titles[deleteDialog.table] || 'Record'
    }

    const executeDelete = async () => {
      deleteDialog.loading = true

      try {
        let response

        switch (deleteDialog.table) {
          case 'appointment_types':
            response = await appointmentsApi.deleteType(deleteDialog.item.id)
            break
          case 'users':
            response = await usersApi.delete(deleteDialog.item.id)
            break
          case 'staff':
            response = await staffApi.delete(deleteDialog.item.id)
            break
          case 'kiosk_devices':
            response = await kioskApi.deleteDevice(deleteDialog.item.device_id)
            break
        }

        if (response?.data?.success) {
          showToast('Record deleted successfully', 'success')
          deleteDialog.show = false
          await refreshTable()
        }
      } catch (error) {
        console.error('Error deleting record:', error)
        showToast(error.response?.data?.error || 'Failed to delete record', 'error')
      } finally {
        deleteDialog.loading = false
      }
    }

    const executeBulkDelete = async () => {
      bulkDeleteDialog.loading = true

      try {
        let successCount = 0
        let failCount = 0

        for (const item of selectedItems.value) {
          try {
            let response

            switch (activeTable.value) {
              case 'appointment_types':
                response = await appointmentsApi.deleteType(item.id)
                break
              case 'users':
                response = await usersApi.delete(item.id)
                break
              case 'staff':
                response = await staffApi.delete(item.id)
                break
              case 'kiosk_devices':
                response = await kioskApi.deleteDevice(item.device_id)
                break
            }

            if (response?.data?.success) {
              successCount++
            } else {
              failCount++
            }
          } catch (error) {
            console.error('Error deleting item:', item, error)
            failCount++
          }
        }

        bulkDeleteDialog.show = false
        clearSelection()
        await refreshTable()

        if (failCount === 0) {
          showToast(`Successfully deleted ${successCount} records`, 'success')
        } else {
          showToast(`Deleted ${successCount} records, ${failCount} failed`, 'warning')
        }
      } catch (error) {
        console.error('Error in bulk delete:', error)
        showToast('Failed to complete bulk delete', 'error')
      } finally {
        bulkDeleteDialog.loading = false
      }
    }

    const resetPassword = (user) => {
      passwordDialog.userId = user.id
      passwordDialog.username = user.username
      passwordDialog.newPassword = ''
      passwordDialog.confirmPassword = ''
      passwordDialog.show = true
    }

    const executePasswordReset = async () => {
      if (passwordDialog.newPassword !== passwordDialog.confirmPassword) {
        showToast('Passwords do not match', 'error')
        return
      }

      passwordDialog.loading = true

      try {
        const response = await usersApi.changePassword(passwordDialog.userId, {
          password: passwordDialog.newPassword
        })

        if (response.data.success) {
          showToast('Password reset successfully', 'success')
          passwordDialog.show = false
        }
      } catch (error) {
        console.error('Error resetting password:', error)
        showToast(error.response?.data?.error || 'Failed to reset password', 'error')
      } finally {
        passwordDialog.loading = false
      }
    }

    const toggleAuthorization = async (device, newValue) => {
      const originalValue = device.is_authorized
      device.is_authorized = newValue
      authLoading.value = device.device_id

      try {
        if (newValue) {
          await kioskApi.authorizeDevice(device.device_id)
          showToast(`Device ${device.device_name || device.device_id} authorized`, 'success')
        } else {
          await kioskApi.deauthorizeDevice(device.device_id)
          showToast(`Device ${device.device_name || device.device_id} deauthorized`, 'success')
        }
      } catch (error) {
        console.error('Toggle authorization error:', error)
        device.is_authorized = originalValue
        showToast('Failed to update authorization', 'error')
      } finally {
        authLoading.value = null
      }
    }

    const getRoleColor = (role) => {
      const colors = {
        ADMIN: 'error',
        NURSE: 'warning',
        PATIENT: 'success'
      }
      return colors[role] || 'primary'
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'Never'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const formatDateTime = (dateString) => {
      if (!dateString) return 'Never'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const timeAgo = (dateString) => {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      const now = new Date()
      const seconds = Math.floor((now - date) / 1000)
      
      if (seconds < 60) return 'just now'
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
      return `${Math.floor(seconds / 86400)}d ago`
    }

    // Watch for table changes
    watch(activeTable, () => {
      page.value = 1
      search.value = ''
      filters.value.role = null
      filters.value.status = null
      sortBy.value = 'created_at_desc'
      sortOrder.value = 'desc'
      clearSelection()
      refreshTable()
    })

    // Watch for filter changes
    watch([search, filters, sortBy], () => {
      page.value = 1
    })

    // Watch for page changes to clear selection
    watch(page, () => {
      clearSelection()
    })

    // Initial load
    onMounted(() => {
      refreshTable()
    })

    return {
      // State
      activeTable,
      loading,
      bulkDeleting,
      authLoading,
      search,
      page,
      perPage,
      form,
      filters,
      sortBy,
      sortOrder,
      sortFields,
      selectedItems,
      
      // Headers
      appointmentTypeHeaders,
      userHeaders,
      staffHeaders,
      kioskHeaders,
      
      // Data
      appointmentTypes,
      users,
      staff,
      kioskDevices,
      
      // Filtered data
      filteredAppointmentTypes,
      filteredUsers,
      filteredStaff,
      filteredKioskDevices,
      
      // Paginated data
      paginatedAppointmentTypes,
      paginatedUsers,
      paginatedStaff,
      paginatedKioskDevices,
      
      // Computed
      currentTableTitle,
      getTableIcon,
      getTableColor,
      filteredItems,
      paginationStart,
      paginationEnd,
      userOptions,
      hasActiveFilters,
      
      // Dialog state
      dialog,
      userInfoModal,
      kioskInfoModal,
      kioskSteps,
      deleteDialog,
      bulkDeleteDialog,
      createUserDialog,
      passwordDialog,
      
      // Rules
      rules,
      
      // Methods
      handleTableSort,
      handleSortChange,
      toggleSortOrder,
      handleFilterChange,
      clearFilters,
      clearSelection,
      copyToClipboard,
      refreshTable,
      openCreateDialog,
      editAppointmentType,
      editUser,
      editStaff,
      editKioskDevice,
      createUserForStaff,
      executeCreateUserForStaff,
      closeDialog,
      saveRecord,
      confirmDelete,
      confirmBulkDelete,
      getDeleteItemTitle,
      executeDelete,
      executeBulkDelete,
      resetPassword,
      executePasswordReset,
      toggleAuthorization,
      getRoleColor,
      getSourceLabel,
      getSourceColor,
      formatDate,
      formatDateTime,
      timeAgo,
      goToPatientManagement,
      goToStaffTab,
      
      // Toast
      toasts,
      removeToast,
      
      // Debounced search
      debouncedSearch
    }
  }
}
</script>

<style scoped>
@import '@/styles/variables.css';

.gap-2 {
  gap: var(--spacing-sm);
}

.gap-1 {
  gap: var(--spacing-xs);
}

.ga-3 {
  gap: 16px;
}

/* Compact field styling */
.compact-field :deep(.v-field) {
  font-size: var(--font-size-sm);
}

.compact-field :deep(.v-field__input) {
  min-height: 36px;
  padding-top: 0;
  padding-bottom: 0;
}

/* Table styling */
:deep(.v-data-table-header th) {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  background-color: var(--color-surface-dark);
  padding: var(--spacing-sm) var(--spacing-md) !important;
  white-space: nowrap;
}

:deep(.v-data-table .v-table__wrapper > table > tbody > tr > td) {
  padding: var(--spacing-sm) var(--spacing-md) !important;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--color-divider);
}

:deep(.v-data-table .v-table__wrapper > table > tbody > tr:hover) {
  background-color: var(--color-surface-light);
}

/* Selection checkbox styling */
:deep(.v-checkbox-btn) {
  margin: 0;
}

:deep(.v-selection-control) {
  min-height: auto;
}

/* Chip styling */
:deep(.v-chip) {
  font-size: var(--font-size-xs);
  height: 22px;
}

:deep(.v-chip.v-chip--size-x-small) {
  --v-chip-height: 20px;
  font-size: var(--font-size-xs);
}

/* Switch styling */
.authorization-switch :deep(.v-switch__thumb) {
  color: var(--color-surface);
}

.authorization-switch :deep(.v-selection-control--dirty) {
  color: var(--color-primary);
}

/* Dialog Styling */
.edit-dialog,
.delete-dialog,
.info-dialog {
  border-radius: var(--radius-md);
  overflow: hidden;
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--color-primary-rgb), 0.05);
}

.bg-info-lighten-5 {
  background-color: rgba(var(--color-info-rgb), 0.05);
}

.bg-success-lighten-5 {
  background-color: rgba(var(--color-success-rgb), 0.05);
}

.bg-error-lighten-5 {
  background-color: rgba(var(--color-error-rgb), 0.05);
}

.bg-warning-lighten-5 {
  background-color: rgba(var(--color-warning-rgb), 0.05);
}

.edit-dialog :deep(.v-card-title),
.delete-dialog :deep(.v-card-title),
.info-dialog :deep(.v-card-title) {
  font-size: var(--font-size-sm);
  line-height: 1.4;
}

.edit-dialog :deep(.v-card-text),
.delete-dialog :deep(.v-card-text),
.info-dialog :deep(.v-card-text) {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.edit-dialog :deep(.v-btn),
.delete-dialog :deep(.v-btn),
.info-dialog :deep(.v-btn) {
  font-size: var(--font-size-xs);
  letter-spacing: 0.3px;
  text-transform: none;
}

.edit-dialog :deep(.v-btn--variant-elevated),
.delete-dialog :deep(.v-btn--variant-elevated),
.info-dialog :deep(.v-btn--variant-elevated) {
  box-shadow: var(--shadow-sm);
}

/* Toast notifications */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  pointer-events: none;
}

.toast {
  position: relative;
  min-width: 300px;
  max-width: 400px;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  animation: toast-slide-in var(--transition-normal);
  border-left: 4px solid;
}

.toast-success {
  border-left-color: var(--color-success);
  background-color: #e8f5e9;
}

.toast-error {
  border-left-color: var(--color-error);
  background-color: #ffebee;
}

.toast-warning {
  border-left-color: var(--color-warning);
  background-color: #fff3e0;
}

.toast-info {
  border-left-color: var(--color-info);
  background-color: #e3f2fd;
}

.toast-content {
  display: flex;
  align-items: center;
  color: var(--color-text-primary);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.2);
  animation: toast-progress linear forwards;
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-normal);
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Dark theme support */
:root.dark-theme :deep(.v-data-table-header th) {
  background-color: var(--color-surface-dark);
  color: var(--color-text-secondary);
}

:root.dark-theme :deep(.v-data-table .v-table__wrapper > table > tbody > tr:hover) {
  background-color: var(--color-surface-dark);
}

:root.dark-theme .toast-success {
  background-color: #1b5e20;
}

:root.dark-theme .toast-error {
  background-color: #b71c1c;
}

:root.dark-theme .toast-warning {
  background-color: #bf360c;
}

:root.dark-theme .toast-info {
  background-color: #0d47a1;
}

:root.dark-theme .toast-content {
  color: white;
}

/* Tab styling */
:deep(.v-tab) {
  font-size: var(--font-size-sm);
  letter-spacing: normal;
  text-transform: none;
  min-width: auto;
  padding: 0 var(--spacing-md);
}

:deep(.v-tab .v-icon) {
  font-size: 18px;
}

:deep(.v-tab .v-chip) {
  margin-left: 8px;
}

/* Timeline styling */
:deep(.v-timeline-item__body) {
  padding: 0 0 8px 16px;
}

:deep(.v-timeline-item__dot) {
  margin: 4px 0;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  :deep(.v-data-table-header th) {
    white-space: nowrap;
  }
  
  .toast-container {
    left: 20px;
    right: 20px;
  }
  
  .toast {
    min-width: auto;
    max-width: none;
  }
}
</style>
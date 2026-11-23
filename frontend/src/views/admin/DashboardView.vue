<!-- frontend/src/views/admin/Dashboard.vue -->
<template>
  <v-container fluid class="pa-4">
    <!-- ============================================================ -->
    <!-- TOP CARD — header + primary KPIs                             -->
    <!-- ============================================================ -->
    <v-card class="rounded-lg mb-4">
      <v-card-text class="pa-4">
        <!-- Header row -->
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <div class="text-h6 font-weight-bold">Admin Dashboard</div>
            <div class="text-body-2 text-medium-emphasis">
              Welcome back, {{ user?.username }}. HIV clinic overview.
            </div>
          </div>
          <v-btn
            color="primary"
            variant="tonal"
            rounded
            :loading="loading"
            class="text-capitalize"
            @click="refreshStats"
          >
            <v-icon left size="18">mdi-refresh</v-icon>
            Refresh
          </v-btn>
        </div>

        <v-divider class="mb-4"></v-divider>

        <!-- Primary KPIs — clinic-critical -->
        <v-row dense>
          <v-col
            v-for="kpi in primaryKpis"
            :key="kpi.key"
            cols="12" sm="6" md="4" lg="2"
          >
            <div class="kpi-tile">
              <div class="d-flex align-center mb-1">
                <v-icon size="18" class="mr-2 text-medium-emphasis">
                  {{ kpi.icon }}
                </v-icon>
                <span class="text-caption text-medium-emphasis">
                  {{ kpi.label }}
                </span>
              </div>
              <div class="text-h5 font-weight-bold">{{ kpi.value }}</div>
              <div v-if="kpi.hint" class="text-caption text-medium-emphasis mt-1">
                {{ kpi.hint }}
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- ============================================================ -->
    <!-- SECONDARY KPIs — operational                                 -->
    <!-- ============================================================ -->
    <v-row class="mb-2" dense>
      <v-col
        v-for="kpi in secondaryKpis"
        :key="kpi.key"
        cols="12" sm="6" md="3"
      >
        <v-card class="rounded-lg h-100">
          <v-card-text class="pa-4">
            <div class="d-flex align-center mb-1">
              <v-icon size="18" class="mr-2 text-medium-emphasis">
                {{ kpi.icon }}
              </v-icon>
              <span class="text-caption text-medium-emphasis">{{ kpi.label }}</span>
            </div>
            <div class="text-h5 font-weight-bold">{{ kpi.value }}</div>
            <div v-if="kpi.hint" class="text-caption text-medium-emphasis mt-1">
              {{ kpi.hint }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ============================================================ -->
    <!-- ENROLLMENT + TRANSITION TRENDS                               -->
    <!-- ============================================================ -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="rounded-lg h-100">
          <v-card-title class="d-flex justify-space-between align-center py-3">
            <span class="text-body-1 font-weight-medium">New Enrollments</span>
            <span class="text-caption text-medium-emphasis">last 6 months</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="enrollTrend.length" class="bar-chart-vertical">
              <div v-for="item in enrollTrend" :key="item.month" class="vb-col">
                <div class="vb-value">{{ item.count }}</div>
                <div class="vb-track">
                  <div
                    class="vb-fill"
                    :style="{ height: vBarHeight(item.count, maxEnroll) + '%' }"
                  ></div>
                </div>
                <div class="vb-label">{{ shortMonth(item.month) }}</div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-medium-emphasis">
              No enrollment data
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="rounded-lg h-100">
          <v-card-title class="d-flex justify-space-between align-center py-3">
            <span class="text-body-1 font-weight-medium">Treatment Transitions</span>
            <span class="text-caption text-medium-emphasis">last 6 months</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="transitionTrend.length" class="bar-chart-vertical">
              <div v-for="item in transitionTrend" :key="item.month" class="vb-col">
                <div class="vb-value">{{ item.count }}</div>
                <div class="vb-track">
                  <div
                    class="vb-fill secondary"
                    :style="{ height: vBarHeight(item.count, maxTransition) + '%' }"
                  ></div>
                </div>
                <div class="vb-label">{{ shortMonth(item.month) }}</div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-medium-emphasis">
              No transition data
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ============================================================ -->
    <!-- AGE DISTRIBUTION + POPULATION MIX                            -->
    <!-- ============================================================ -->
    <v-row>
      <v-col cols="12" md="7">
        <v-card class="rounded-lg h-100">
          <v-card-title class="d-flex justify-space-between align-center py-3">
            <span class="text-body-1 font-weight-medium">Age Distribution</span>
            <span class="text-caption text-medium-emphasis">
              {{ stats.total_patients || 0 }} patients
            </span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="ageData.length" class="hbar-chart">
              <div v-for="item in ageData" :key="item.range" class="hbar-row">
                <div class="hbar-label">{{ item.range }}</div>
                <div class="hbar-track">
                  <div
                    class="hbar-fill"
                    :style="{ width: hBarWidth(item.count, maxAgeCount) + '%' }"
                  ></div>
                </div>
                <div class="hbar-value">{{ item.count }}</div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-medium-emphasis">
              No patient data yet
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card class="rounded-lg h-100">
          <v-card-title class="py-3">
            <span class="text-body-1 font-weight-medium">Population Mix</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="mix-grid">
              <div class="mix-item">
                <div class="text-caption text-medium-emphasis">Pediatric (&lt;13)</div>
                <div class="text-h6 font-weight-bold">
                  {{ stats.population_mix?.pediatric || 0 }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ pct(stats.population_mix?.pediatric, stats.total_patients) }}%
                </div>
              </div>
              <div class="mix-item">
                <div class="text-caption text-medium-emphasis">Youth (13–24)</div>
                <div class="text-h6 font-weight-bold">
                  {{ stats.population_mix?.youth || 0 }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ pct(stats.population_mix?.youth, stats.total_patients) }}%
                </div>
              </div>
              <div class="mix-item">
                <div class="text-caption text-medium-emphasis">Adult (25+)</div>
                <div class="text-h6 font-weight-bold">
                  {{ stats.population_mix?.adult || 0 }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ pct(stats.population_mix?.adult, stats.total_patients) }}%
                </div>
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="text-body-2 font-weight-medium mb-2">Gender</div>
            <div v-if="genderData.length" class="gender-list">
              <div v-for="g in genderData" :key="g.gender" class="gender-item">
                <span class="gender-label">{{ g.gender }}</span>
                <div class="gender-track">
                  <div
                    class="gender-fill"
                    :style="{ width: hBarWidth(g.count, maxGender) + '%' }"
                  ></div>
                </div>
                <span class="gender-value">{{ g.count }}</span>
              </div>
            </div>
            <div v-else class="text-caption text-medium-emphasis">
              No gender data
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ============================================================ -->
    <!-- PATIENTS BY PURPOSE                                          -->
    <!-- ============================================================ -->
    <v-row>
      <v-col cols="12">
        <v-card class="rounded-lg">
          <v-card-title class="d-flex justify-space-between align-center py-3">
            <span class="text-body-1 font-weight-medium">Patients by Purpose</span>
            <span class="text-caption text-medium-emphasis">
              top {{ purposeData.length }} of {{ stats.total_patients || 0 }}
            </span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="purposeData.length" class="purpose-grid">
              <div v-for="p in purposeData" :key="p.purpose" class="purpose-row">
                <div class="purpose-label text-truncate" :title="p.purpose">
                  {{ p.purpose }}
                </div>
                <div class="purpose-track">
                  <div
                    class="purpose-fill"
                    :style="{ width: hBarWidth(p.count, maxPurpose) + '%' }"
                  ></div>
                </div>
                <div class="purpose-value">{{ p.count }}</div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-medium-emphasis">
              No purpose data recorded
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ============================================================ -->
    <!-- APPOINTMENT TREND + STATUS                                   -->
    <!-- ============================================================ -->
    <v-row>
      <v-col cols="12" md="7">
        <v-card class="rounded-lg h-100">
          <v-card-title class="d-flex justify-space-between align-center py-3">
            <span class="text-body-1 font-weight-medium">Appointments</span>
            <span class="text-caption text-medium-emphasis">last 14 days</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="trendData.length" class="line-chart">
              <svg :viewBox="`0 0 ${trendWidth} ${trendHeight}`" class="trend-svg">
                <line
                  v-for="g in 4"
                  :key="'g' + g"
                  :x1="0"
                  :x2="trendWidth"
                  :y1="(trendHeight - 20) * (g / 4) + 10"
                  :y2="(trendHeight - 20) * (g / 4) + 10"
                  class="trend-grid"
                />
                <polygon :points="trendAreaPoints" class="trend-area" />
                <polyline :points="trendLinePoints" class="trend-line" />
                <circle
                  v-for="(p, i) in trendPoints"
                  :key="'d' + i"
                  :cx="p.x"
                  :cy="p.y"
                  r="2.5"
                  class="trend-dot"
                />
              </svg>
              <div class="trend-x-labels">
                <span
                  v-for="(item, i) in trendData"
                  :key="item.date"
                  class="trend-x-label"
                  :class="{ muted: i % 2 !== 0 }"
                >
                  {{ shortDate(item.date) }}
                </span>
              </div>
            </div>
            <div v-else class="text-center py-6 text-medium-emphasis">
              No appointments in the last 14 days
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card class="rounded-lg h-100">
          <v-card-title class="py-3">
            <span class="text-body-1 font-weight-medium">Appointments by Status</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="statusData.length">
              <div v-for="s in statusData" :key="s.status" class="status-row">
                <v-chip
                  :color="statusChipColor(s.status)"
                  size="small"
                  variant="tonal"
                  class="font-weight-medium mr-3 text-capitalize"
                  style="min-width: 90px; justify-content: center;"
                >
                  {{ s.status }}
                </v-chip>
                <div class="status-track">
                  <div
                    class="status-fill"
                    :style="{ width: hBarWidth(s.count, maxStatusCount) + '%' }"
                  ></div>
                </div>
                <div class="status-value">{{ s.count }}</div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-medium-emphasis">
              No appointments yet
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ============================================================ -->
    <!-- QUEUE + USERS BY ROLE + QUICK ACTIONS                        -->
    <!-- ============================================================ -->
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="rounded-lg h-100">
          <v-card-title class="d-flex justify-space-between align-center py-3">
            <span class="text-body-1 font-weight-medium">Queue Today</span>
            <span class="text-caption text-medium-emphasis">live</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="queue-grid">
              <div class="queue-item">
                <div class="text-caption text-medium-emphasis">Waiting</div>
                <div class="text-h6 font-weight-bold">
                  {{ stats.queue_today?.waiting || 0 }}
                </div>
              </div>
              <div class="queue-item">
                <div class="text-caption text-medium-emphasis">In Progress</div>
                <div class="text-h6 font-weight-bold">
                  {{ stats.queue_today?.in_progress || 0 }}
                </div>
              </div>
              <div class="queue-item">
                <div class="text-caption text-medium-emphasis">Completed</div>
                <div class="text-h6 font-weight-bold">
                  {{ stats.queue_today?.completed || 0 }}
                </div>
              </div>
              <div class="queue-item">
                <div class="text-caption text-medium-emphasis">Skipped</div>
                <div class="text-h6 font-weight-bold">
                  {{ stats.queue_today?.skipped || 0 }}
                </div>
              </div>
              <div class="queue-item">
                <div class="text-caption text-medium-emphasis">No-show</div>
                <div class="text-h6 font-weight-bold">
                  {{ stats.queue_today?.no_show || 0 }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="rounded-lg h-100">
          <v-card-title class="py-3">
            <span class="text-body-1 font-weight-medium">Users by Role</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="roleData.length">
              <div v-for="r in roleData" :key="r.role" class="status-row">
                <v-chip
                  :color="roleChipColor(r.role)"
                  size="small"
                  variant="tonal"
                  class="font-weight-medium mr-3 text-capitalize"
                  style="min-width: 90px; justify-content: center;"
                >
                  {{ r.role }}
                </v-chip>
                <div class="status-track">
                  <div
                    class="status-fill"
                    :style="{ width: hBarWidth(r.count, maxRoleCount) + '%' }"
                  ></div>
                </div>
                <div class="status-value">{{ r.count }}</div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-medium-emphasis">
              No users
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="rounded-lg h-100">
          <v-card-title class="py-3">
            <span class="text-body-1 font-weight-medium">Quick Actions</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-list density="compact" class="py-2">
            <v-list-item rounded="lg" @click="$router.push('/admin/users')">
              <template v-slot:prepend>
                <v-icon color="primary" size="20">mdi-account-plus</v-icon>
              </template>
              <v-list-item-title class="text-body-2">Add New User</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="$router.push('/admin/settings')">
              <template v-slot:prepend>
                <v-icon color="primary" size="20">mdi-cog</v-icon>
              </template>
              <v-list-item-title class="text-body-2">System Settings</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="$router.push('/admin/audit-logs')">
              <template v-slot:prepend>
                <v-icon color="primary" size="20">mdi-history</v-icon>
              </template>
              <v-list-item-title class="text-body-2">Audit Logs</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="$router.push('/patients')">
              <template v-slot:prepend>
                <v-icon color="primary" size="20">mdi-account-heart</v-icon>
              </template>
              <v-list-item-title class="text-body-2">Patient Registry</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" rounded>
      <v-icon left size="20" class="mr-2">{{ snackbar.icon }}</v-icon>
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import api from '@/plugins/axios';

const authStore = useAuthStore();
const user = ref(authStore.user);
const loading = ref(false);

const stats = ref({
  total_users: 0,
  active_users: 0,
  total_patients: 0,
  total_appointments: 0,
  recent_audits: 0,
  users_by_role: [],
  appointments_by_status: [],
  age_distribution: [],
  gender_distribution: [],
  purpose_distribution: [],
  patients_by_status: [],
  appointment_trend: [],
  enrollment_trend: [],
  transition_trend: [],
  population_mix: { pediatric: 0, youth: 0, adult: 0 },
  queue_today: { waiting: 0, in_progress: 0, completed: 0, skipped: 0, no_show: 0 },
  newly_enrolled_30d: 0,
  no_show_rate_30d: 0,
  cancellation_rate_30d: 0,
  completion_rate_30d: 0,
  encounters_this_month: 0,
  recently_active_patients_90d: 0,
  retention_rate_180d: 0,
});

const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle',
});

/* ------------------- KPI cards ------------------- */
const primaryKpis = computed(() => [
  {
    key: 'patients',
    label: 'Total Patients',
    value: stats.value.total_patients || 0,
    icon: 'mdi-account-heart-outline',
    hint: `${stats.value.newly_enrolled_30d || 0} new in 30d`,
  },
  {
    key: 'active',
    label: 'Active in 90d',
    value: stats.value.recently_active_patients_90d || 0,
    icon: 'mdi-account-clock-outline',
    hint: `${pct(stats.value.recently_active_patients_90d, stats.value.total_patients)}% of registry`,
  },
  {
    key: 'retention',
    label: 'Retention (180d)',
    value: `${stats.value.retention_rate_180d || 0}%`,
    icon: 'mdi-heart-pulse',
    hint: 'Patients with recent visit',
  },
  {
    key: 'no_show',
    label: 'No-show (30d)',
    value: `${stats.value.no_show_rate_30d || 0}%`,
    icon: 'mdi-calendar-remove-outline',
    hint: 'Of scheduled appts',
  },
  {
    key: 'encounters',
    label: 'Encounters (month)',
    value: stats.value.encounters_this_month || 0,
    icon: 'mdi-clipboard-pulse-outline',
    hint: 'Completed clinical encounters',
  },
  {
    key: 'appts',
    label: 'Appointments',
    value: stats.value.total_appointments || 0,
    icon: 'mdi-calendar-clock-outline',
    hint: `${stats.value.completion_rate_30d || 0}% completed (30d)`,
  },
]);

const secondaryKpis = computed(() => [
  {
    key: 'users',
    label: 'Users',
    value: stats.value.total_users || 0,
    icon: 'mdi-account-group-outline',
    hint: `${stats.value.active_users || 0} active`,
  },
  {
    key: 'cancel',
    label: 'Cancellation (30d)',
    value: `${stats.value.cancellation_rate_30d || 0}%`,
    icon: 'mdi-calendar-remove',
    hint: 'Of scheduled appts',
  },
  {
    key: 'audits',
    label: 'Audit Events (7d)',
    value: stats.value.recent_audits || 0,
    icon: 'mdi-clipboard-list-outline',
    hint: 'System activity',
  },
  {
    key: 'waiting',
    label: 'Queue Now',
    value:
      (stats.value.queue_today?.waiting || 0) +
      (stats.value.queue_today?.in_progress || 0),
    icon: 'mdi-human-queue',
    hint: `${stats.value.queue_today?.waiting || 0} waiting · ${stats.value.queue_today?.in_progress || 0} in progress`,
  },
]);

/* ------------------- Chart data ------------------- */
const ageData = computed(() =>
  (stats.value.age_distribution || []).filter((d) => d.count > 0)
);
const maxAgeCount = computed(() =>
  Math.max(1, ...ageData.value.map((d) => d.count))
);

const genderData = computed(() =>
  (stats.value.gender_distribution || []).filter((d) => d.count > 0)
);
const maxGender = computed(() =>
  Math.max(1, ...genderData.value.map((d) => d.count))
);

const purposeData = computed(() =>
  (stats.value.purpose_distribution || []).filter((d) => d.count > 0)
);
const maxPurpose = computed(() =>
  Math.max(1, ...purposeData.value.map((d) => d.count))
);

const statusData = computed(() =>
  (stats.value.appointments_by_status || []).filter((d) => d.count > 0)
);
const maxStatusCount = computed(() =>
  Math.max(1, ...statusData.value.map((d) => d.count))
);

const roleData = computed(() =>
  (stats.value.users_by_role || []).filter((d) => d.count > 0)
);
const maxRoleCount = computed(() =>
  Math.max(1, ...roleData.value.map((d) => d.count))
);

const enrollTrend = computed(() => stats.value.enrollment_trend || []);
const maxEnroll = computed(() =>
  Math.max(1, ...enrollTrend.value.map((d) => d.count))
);

const transitionTrend = computed(() => stats.value.transition_trend || []);
const maxTransition = computed(() =>
  Math.max(1, ...transitionTrend.value.map((d) => d.count))
);

/* ------------------- 14-day appointment trend ------------------- */
const trendData = computed(() => stats.value.appointment_trend || []);
const trendWidth = 600;
const trendHeight = 180;
const trendPadX = 24;
const trendPadY = 16;

const trendPoints = computed(() => {
  const data = trendData.value;
  if (!data.length) return [];
  const max = Math.max(1, ...data.map((d) => d.count));
  const innerW = trendWidth - trendPadX * 2;
  const innerH = trendHeight - trendPadY * 2;
  return data.map((d, i) => {
    const x = trendPadX + (innerW * i) / Math.max(1, data.length - 1);
    const y = trendHeight - trendPadY - (innerH * d.count) / max;
    return { x, y, count: d.count, date: d.date };
  });
});

const trendLinePoints = computed(() =>
  trendPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
);

const trendAreaPoints = computed(() => {
  const pts = trendPoints.value;
  if (!pts.length) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  const bottom = trendHeight - trendPadY;
  return `${first.x},${bottom} ${pts.map((p) => `${p.x},${p.y}`).join(' ')} ${last.x},${bottom}`;
});

/* ------------------- Helpers ------------------- */
const hBarWidth = (count, max) => {
  if (!count) return 0;
  return Math.max(4, Math.round((count / max) * 100));
};

const vBarHeight = (count, max) => {
  if (!count) return 2;
  return Math.max(4, Math.round((count / max) * 100));
};

const pct = (part, total) => {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
};

const shortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const shortMonth = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short' });
};

/* ------------------- Chip colors (Vuetify theme) ------------------- */
const statusChipColor = (status) => {
  const map = {
    pending: 'info',
    queued: 'warning',
    'checked-in': 'warning',
    completed: 'success',
    cancelled: 'error',
    'no-show': 'default',
  };
  return map[status] || 'primary';
};

const roleChipColor = (role) => {
  const map = { admin: 'error', staff: 'primary', patient: 'success' };
  return map[role] || 'default';
};

const showSnackbar = (message, color = 'success') => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
  };
  snackbar.value = {
    show: true,
    message,
    color,
    icon: icons[color] || 'mdi-information',
  };
};

/* ------------------- Data ------------------- */
const loadStats = async () => {
  loading.value = true;
  try {
    const response = await api.get('/admin/dashboard/stats');
    stats.value = { ...stats.value, ...response.data };
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    showSnackbar('Failed to load dashboard statistics', 'error');
  } finally {
    loading.value = false;
  }
};

const refreshStats = async () => {
  await loadStats();
  showSnackbar('Statistics refreshed');
};

onMounted(loadStats);
</script>

<style scoped>
.h-100 {
  height: 100%;
}

/* KPI tile inside the top card — no borders, just spacing */
.kpi-tile {
  padding: 8px 4px;
}

/* Horizontal bar chart */
.hbar-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.hbar-row {
  display: grid;
  grid-template-columns: 60px 1fr 40px;
  align-items: center;
  gap: 10px;
}
.hbar-label {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.hbar-track {
  height: 14px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 7px;
  overflow: hidden;
}
.hbar-fill {
  height: 100%;
  background: rgb(var(--v-theme-primary));
  border-radius: 7px;
  transition: width 0.35s ease;
}
.hbar-value {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

/* Vertical bar chart */
.bar-chart-vertical {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8px;
  height: 180px;
}
.vb-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
}
.vb-value {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}
.vb-track {
  flex: 1;
  width: 100%;
  max-width: 40px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.vb-fill {
  width: 100%;
  background: rgb(var(--v-theme-primary));
  border-radius: 6px 6px 0 0;
  transition: height 0.35s ease;
}
.vb-fill.secondary {
  background: rgb(var(--v-theme-secondary));
}
.vb-label {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 6px;
}

/* Population mix */
.mix-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  text-align: center;
}
.mix-item {
  padding: 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

/* Gender list */
.gender-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gender-item {
  display: grid;
  grid-template-columns: 70px 1fr 40px;
  align-items: center;
  gap: 10px;
}
.gender-label {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.gender-track {
  height: 10px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 5px;
  overflow: hidden;
}
.gender-fill {
  height: 100%;
  background: rgb(var(--v-theme-primary));
  border-radius: 5px;
  transition: width 0.35s ease;
}
.gender-value {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

/* Purpose grid */
.purpose-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.purpose-row {
  display: grid;
  grid-template-columns: 200px 1fr 40px;
  align-items: center;
  gap: 12px;
}
.purpose-label {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.purpose-track {
  height: 14px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 7px;
  overflow: hidden;
}
.purpose-fill {
  height: 100%;
  background: rgb(var(--v-theme-primary));
  border-radius: 7px;
  transition: width 0.35s ease;
}
.purpose-value {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

/* Line chart — colors pulled from theme variables */
.line-chart {
  width: 100%;
}
.trend-svg {
  width: 100%;
  height: auto;
  display: block;
}
.trend-grid {
  stroke: rgba(var(--v-theme-on-surface), 0.08);
  stroke-width: 1;
}
.trend-area {
  fill: rgba(var(--v-theme-primary), 0.08);
}
.trend-line {
  fill: none;
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.trend-dot {
  fill: rgb(var(--v-theme-primary));
}
.trend-x-labels {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px 0;
}
.trend-x-label {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
  flex: 1;
}
.trend-x-label.muted {
  opacity: 0.5;
}

/* Status / role bars */
.status-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.status-track {
  flex: 1;
  height: 10px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 5px;
  overflow: hidden;
  margin: 0 10px;
}
.status-fill {
  height: 100%;
  background: rgb(var(--v-theme-primary));
  border-radius: 5px;
  transition: width 0.35s ease;
}
.status-value {
  font-size: 13px;
  font-weight: 600;
  min-width: 32px;
  text-align: right;
}

/* Queue grid */
.queue-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.queue-item {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

:deep(.v-list-item) {
  border-radius: 8px;
}
:deep(.v-list-item:hover) {
  background: rgba(var(--v-theme-primary), 0.06);
}

.text-capitalize {
  text-transform: capitalize;
}
</style>
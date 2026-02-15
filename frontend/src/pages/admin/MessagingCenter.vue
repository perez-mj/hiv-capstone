<template>
  <v-container fluid class="pa-6">
    <div class="page-header mb-6">
      <h1 class="text-h4 font-weight-bold text-primary">Messaging Center</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">
        Communicate with patients and staff
      </p>
    </div>

    <v-row>
      <!-- Sidebar -->
      <v-col cols="12" md="4">
        <v-card elevation="2" border>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Conversations</span>
            <div class="d-flex gap-1">
              <v-btn icon size="small" @click="refreshConversations" :loading="loading">
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
              <v-btn icon size="small" @click="showNewMessageDialog = true">
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pa-0">
            <v-list>
              <v-list-item
                v-for="conversation in conversations"
                :key="conversation.id"
                @click="selectConversation(conversation)"
                :class="{ 'bg-primary-lighten-5': selectedConversation?.patient_id === conversation.patient_id }"
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" size="40">
                    <span class="text-white text-caption">
                      {{ getInitials(conversation.name) }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ conversation.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  Patient ID: {{ conversation.patient_id }}
                  <span v-if="conversation.last_message_time">
                    \u2022 {{ formatTimeAgo(conversation.last_message_time) }}
                  </span>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-badge
                    v-if="conversation.unread_count > 0"
                    :content="conversation.unread_count"
                    color="primary"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Quick Actions -->
        <v-card elevation="2" border class="mt-4">
          <v-card-title>Quick Actions</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item @click="showBroadcastDialog = true">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-bullhorn</v-icon>
                </template>
                <v-list-item-title>Send Broadcast</v-list-item-title>
              </v-list-item>

              <v-list-item @click="showStatsDialog = true">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-chart-bar</v-icon>
                </template>
                <v-list-item-title>View Statistics</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Chat Area -->
      <v-col cols="12" md="8">
        <v-card elevation="2" border>
          <v-card-title v-if="selectedConversation" class="d-flex align-center">
            <v-avatar color="primary" size="40" class="mr-3">
              <span class="text-white text-caption">
                {{ getInitials(selectedConversation.name) }}
              </span>
            </v-avatar>
            <div>
              <div>{{ selectedConversation.name }}</div>
              <div class="text-caption text-medium-emphasis">
                Patient ID: {{ selectedConversation.patient_id }}
                <span v-if="selectedConversation.contact_info">
                  \u2022 {{ selectedConversation.contact_info }}
                </span>
              </div>
            </div>
            <v-spacer />
            <v-btn 
              variant="text" 
              icon="mdi-information"
              @click="viewPatientDetails"
            />
          </v-card-title>
          <v-card-title v-else class="text-center">
            <div>
              <v-icon size="64" color="grey-lighten-2" class="mb-2">mdi-message</v-icon>
              <div>Select a conversation to start messaging</div>
            </div>
          </v-card-title>

          <v-divider />

          <!-- Messages Area -->
          <div class="messages-container" ref="messagesContainer">
            <div v-if="selectedConversation && messages.length > 0" class="pa-4">
              <div 
                v-for="message in messages" 
                :key="message.id"
                class="message-bubble mb-4"
                :class="{
                  'message-sent': message.sender_type === 'admin',
                  'message-received': message.sender_type === 'patient'
                }"
              >
                <div class="message-content">
                  {{ message.content }}
                </div>
                <div class="message-time text-caption text-medium-emphasis">
                  {{ formatDateTime(message.created_at) }}
                  <v-icon v-if="message.is_read" size="small" color="primary" class="ml-1">
                    mdi-check-all
                  </v-icon>
                  <v-icon v-else-if="message.sender_type === 'admin'" size="small" color="grey" class="ml-1">
                    mdi-check
                  </v-icon>
                </div>
              </div>
            </div>
            <div v-else-if="selectedConversation" class="text-center py-8">
              <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-message-outline</v-icon>
              <div class="text-h6 text-grey">No messages yet</div>
              <div class="text-body-2 text-grey mt-2">
                Start the conversation by sending a message
              </div>
            </div>
          </div>

          <!-- Message Input -->
          <v-divider />
          <v-card-actions v-if="selectedConversation" class="pa-4">
            <v-text-field
              v-model="newMessage"
              placeholder="Type your message..."
              variant="outlined"
              hide-details
              @keypress.enter="sendMessage"
              class="flex-grow-1 mr-2"
              :loading="sendingMessage"
            />
            <v-btn 
              color="primary" 
              icon="mdi-send" 
              @click="sendMessage"
              :disabled="!newMessage.trim() || sendingMessage"
              :loading="sendingMessage"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- New Message Dialog -->
    <v-dialog v-model="showNewMessageDialog" max-width="500">
      <v-card>
        <v-card-title>New Message</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="startNewConversation" ref="newMessageForm">
            <v-autocomplete
              v-model="newMessageRecipient.patient_id"
              :items="patients"
              item-title="name"
              item-value="patient_id"
              label="Select Patient"
              variant="outlined"
              :rules="[v => !!v || 'Patient is required']"
              class="mb-4"
            />
            <v-text-field
              v-model="newMessageRecipient.subject"
              label="Subject"
              variant="outlined"
              :rules="[v => !!v || 'Subject is required']"
              class="mb-4"
            />
            <v-textarea
              v-model="newMessageRecipient.message"
              label="Message"
              variant="outlined"
              rows="3"
              :rules="[v => !!v || 'Message is required']"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showNewMessageDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="startNewConversation" :loading="startingConversation">
            Send Message
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Broadcast Dialog -->
    <v-dialog v-model="showBroadcastDialog" max-width="600">
      <v-card>
        <v-card-title>Send Broadcast Message</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="sendBroadcast" ref="broadcastForm">
            <v-select
              v-model="broadcast.recipient_group"
              :items="broadcastGroups"
              label="Recipient Group"
              variant="outlined"
              class="mb-4"
            />
            <v-text-field
              v-model="broadcast.subject"
              label="Subject"
              variant="outlined"
              :rules="[v => !!v || 'Subject is required']"
              class="mb-4"
            />
            <v-textarea
              v-model="broadcast.message"
              label="Message"
              variant="outlined"
              rows="5"
              :rules="[v => !!v || 'Message is required']"
            />
            <v-alert
              v-if="getBroadcastRecipientCount > 0"
              type="info"
              variant="tonal"
              class="mt-4"
            >
              This message will be sent to {{ getBroadcastRecipientCount }} patients
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showBroadcastDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="sendBroadcast" :loading="sendingBroadcast">
            Send to {{ getBroadcastRecipientCount }} Patients
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Statistics Dialog -->
    <v-dialog v-model="showStatsDialog" max-width="500">
      <v-card>
        <v-card-title>Messaging Statistics</v-card-title>
        <v-card-text>
          <div v-if="stats" class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ stats.total_messages }}</div>
              <div class="stat-label">Total Messages</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.unread_messages }}</div>
              <div class="stat-label">Unread Messages</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.active_conversations?.length || 0 }}</div>
              <div class="stat-label">Active Conversations</div>
            </div>
          </div>
          <div v-else class="text-center py-4">
            <v-progress-circular indeterminate color="primary" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showStatsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const conversations = ref([])
const messages = ref([])
const patients = ref([])
const selectedConversation = ref(null)
const newMessage = ref('')
const messagesContainer = ref(null)
const loading = ref(false)
const sendingMessage = ref(false)
const startingConversation = ref(false)
const sendingBroadcast = ref(false)

const showNewMessageDialog = ref(false)
const showBroadcastDialog = ref(false)
const showStatsDialog = ref(false)
const stats = ref(null)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

const newMessageRecipient = ref({
  patient_id: '',
  subject: 'Message from Healthcare Provider',
  message: ''
})

const broadcast = ref({
  recipient_group: 'all_patients',
  subject: '',
  message: ''
})

const broadcastGroups = [
  { title: 'All Patients', value: 'all_patients' },
  { title: 'Patients with Appointments', value: 'with_appointments' },
  { title: 'Patients Needing Follow-up', value: 'needing_followup' },
  { title: 'Reactive Status Patients', value: 'reactive_patients' }
]

const getBroadcastRecipientCount = computed(() => {
  // This would typically come from an API
  const counts = {
    'all_patients': patients.value.length,
    'with_appointments': Math.floor(patients.value.length * 0.6),
    'needing_followup': Math.floor(patients.value.length * 0.3),
    'reactive_patients': Math.floor(patients.value.length * 0.2)
  }
  return counts[broadcast.value.recipient_group] || 0
})

onMounted(async () => {
  await Promise.all([loadConversations(), loadPatients(), loadStats()])
})

async function loadConversations() {
  loading.value = true
  try {
    const response = await messagingApi.getConversations()
    conversations.value = response.data.conversations || []
  } catch (error) {
    console.error('Error loading conversations:', error)
    showSnackbar('Failed to load conversations', 'error')
  } finally {
    loading.value = false
  }
}

async function loadPatients() {
  try {
    const response = await patientsApi.getAll()
    patients.value = response.data.patients || []
  } catch (error) {
    console.error('Error loading patients:', error)
  }
}

async function loadStats() {
  try {
    const response = await messagingApi.getStats()
    stats.value = response.data
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

async function selectConversation(conversation) {
  selectedConversation.value = conversation
  await loadMessages(conversation.patient_id)
  scrollToBottom()
  markAsRead(conversation.patient_id)
}

async function loadMessages(patientId) {
  try {
    const response = await messagingApi.getMessages(patientId, { limit: 100 })
    messages.value = response.data.messages || []
  } catch (error) {
    console.error('Error loading messages:', error)
    showSnackbar('Failed to load messages', 'error')
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedConversation.value) return

  sendingMessage.value = true
  try {
    const messageData = {
      patient_id: selectedConversation.value.patient_id,
      content: newMessage.value.trim()
    }

    const response = await messagingApi.sendMessage(messageData)
    
    // Add message to local state
    messages.value.push({
      ...response.data.message,
      sender_name: 'You'
    })

    newMessage.value = ''
    scrollToBottom()
    
    // Update conversation in list
    const conversation = conversations.value.find(c => c.patient_id === selectedConversation.value.patient_id)
    if (conversation) {
      conversation.last_message = messageData.content
      conversation.last_message_time = new Date().toISOString()
    }

    showSnackbar('Message sent successfully')
  } catch (error) {
    console.error('Error sending message:', error)
    showSnackbar('Failed to send message', 'error')
  } finally {
    sendingMessage.value = false
  }
}

async function startNewConversation() {
  const { valid } = await newMessageForm.value.validate()
  
  if (!valid) return

  startingConversation.value = true
  try {
    const conversationData = {
      patient_id: newMessageRecipient.value.patient_id,
      initial_message: newMessageRecipient.value.message,
      subject: newMessageRecipient.value.subject
    }

    await messagingApi.createConversation(conversationData)
    showNewMessageDialog.value = false
    await loadConversations()
    
    // Reset form
    newMessageRecipient.value = {
      patient_id: '',
      subject: 'Message from Healthcare Provider',
      message: ''
    }

    showSnackbar('Conversation started successfully')
  } catch (error) {
    console.error('Error creating conversation:', error)
    showSnackbar('Failed to start conversation', 'error')
  } finally {
    startingConversation.value = false
  }
}

async function sendBroadcast() {
  const { valid } = await broadcastForm.value.validate()
  
  if (!valid) return

  sendingBroadcast.value = true
  try {
    await messagingApi.sendBroadcast(broadcast.value)
    showBroadcastDialog.value = false
    
    // Reset form
    broadcast.value = {
      recipient_group: 'all_patients',
      subject: '',
      message: ''
    }

    showSnackbar(`Broadcast sent to ${getBroadcastRecipientCount.value} patients`)
  } catch (error) {
    console.error('Error sending broadcast:', error)
    showSnackbar('Failed to send broadcast', 'error')
  } finally {
    sendingBroadcast.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function markAsRead(patientId) {
  try {
    await messagingApi.markAsRead(patientId)
    
    // Update local state
    const conversation = conversations.value.find(c => c.patient_id === patientId)
    if (conversation) {
      conversation.unread_count = 0
    }
  } catch (error) {
    console.error('Error marking conversation as read:', error)
  }
}

function getInitials(name) {
  if (!name) return 'PT'
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const now = new Date()
  const time = new Date(dateString)
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function viewPatientDetails() {
  if (selectedConversation.value?.patient_id) {
    // Navigate to patient details or show in dialog
    console.log('View patient details:', selectedConversation.value.patient_id)
    // You can implement navigation to patient details page
    // router.push(`/admin/patients/${selectedConversation.value.patient_id}`)
  }
}

async function refreshConversations() {
  await Promise.all([loadConversations(), loadStats()])
}

function showSnackbar(message, color = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}
</script>

<style scoped>
.messages-container {
  height: 500px;
  overflow-y: auto;
  padding: 16px;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
}

.message-sent {
  background: #2196F3;
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.message-received {
  background: #f5f5f5;
  color: #333;
  margin-right: auto;
  border-bottom-left-radius: 4px;
}

.message-content {
  word-wrap: break-word;
}

.message-time {
  font-size: 0.75rem;
  margin-top: 4px;
  text-align: right;
}

.message-received .message-time {
  text-align: left;
  color: rgba(0, 0, 0, 0.6);
}

.message-sent .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  text-align: center;
}

.stat-item {
  padding: 16px;
  border-radius: 8px;
  background: #f5f5f5;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #2196F3;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 4px;
}

.gap-1 {
  gap: 8px;
}
</style>
<!-- frontend/src/pages/patient/PatientMessages.vue -->
<template>
  <v-container fluid class="pa-6">
    <div class="page-header mb-6">
      <h1 class="text-h4 font-weight-bold text-primary">Messages</h1>
      <p class="text-body-1 text-medium-emphasis mt-2">
        Communicate with your healthcare providers
      </p>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card elevation="2" border>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Contacts</span>
            <v-btn icon size="small" @click="refreshContacts" :loading="refreshing">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text class="pa-0">
            <v-list>
              <v-list-item v-for="contact in contacts" :key="contact.id" @click="selectContact(contact)"
                :class="{ 'bg-primary-lighten-5': selectedContact?.id === contact.id }">
                <template v-slot:prepend>
                  <v-avatar color="primary" size="40">
                    <span class="text-white text-caption">
                      {{ getInitials(contact.name) }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ contact.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ contact.role }}</v-list-item-subtitle>

                <template v-slot:append>
                  <v-badge v-if="contact.unread_count > 0" :content="contact.unread_count" color="primary" />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card elevation="2" border class="d-flex flex-column" style="height: 600px;">
          <v-card-title v-if="selectedContact" class="d-flex align-center">
            <v-avatar color="primary" size="40" class="mr-3">
              <span class="text-white text-caption">
                {{ getInitials(selectedContact.name) }}
              </span>
            </v-avatar>
            <div>
              <div>{{ selectedContact.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ selectedContact.role }}</div>
            </div>
            <v-spacer />
            <v-btn icon size="small" @click="refreshMessages">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-title v-else class="text-center">
            Select a contact to start messaging
          </v-card-title>

          <v-divider />

          <!-- Messages Area -->
          <div class="messages-container flex-grow-1" ref="messagesContainer">
            <div v-if="selectedContact && messagesLoading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
              <div class="mt-4">Loading messages...</div>
            </div>
            <!-- In your PatientMessages.vue template, update the messages display -->
            <div v-else-if="selectedContact" class="pa-4">
              <div v-for="message in filteredMessages" :key="message.id" class="message-bubble mb-4" :class="{
                'message-sent': message.sender_type === 'patient',
                'message-received': message.sender_type !== 'patient'
              }">
                <div class="message-content">
                  {{ message.content }}
                </div>
                <div class="message-time text-caption text-medium-emphasis">
                  {{ formatTime(message.created_at) }}
                  <v-icon v-if="message.sender_type === 'patient'" size="small"
                    :color="message.is_read ? 'primary' : 'grey'" class="ml-1">
                    {{ message.is_read ? 'mdi-check-all' : 'mdi-check' }}
                  </v-icon>
                </div>
              </div>
              <div v-if="filteredMessages.length === 0" class="text-center py-8 text-medium-emphasis">
                <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-forum</v-icon>
                <div>No messages yet.</div>
                <div class="text-caption">Start the conversation by sending a message!</div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-medium-emphasis">
              Please select a contact to view messages
            </div>
          </div>

          <!-- Message Input -->
          <v-divider />
          <v-card-actions v-if="selectedContact" class="pa-4">
            <v-text-field v-model="newMessage" placeholder="Type your message..." variant="outlined" hide-details
              @keypress.enter="sendMessage" class="flex-grow-1 mr-2" :disabled="sendingMessage" />
            <v-btn color="primary" icon="mdi-send" @click="sendMessage" :disabled="!newMessage.trim() || sendingMessage"
              :loading="sendingMessage" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const contacts = ref([])
const messages = ref([])
const selectedContact = ref(null)
const newMessage = ref('')
const messagesContainer = ref(null)
const messagesLoading = ref(false)
const sendingMessage = ref(false)
const refreshing = ref(false)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

const filteredMessages = computed(() => {
  if (!selectedContact.value) return []
  return messages.value
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
})

onMounted(async () => {
  await loadContacts()
})


async function selectContact(contact) {
  selectedContact.value = contact
  await loadMessages()
  scrollToBottom()

  // Mark messages as read
  await markUnreadMessagesAsRead()
}
// In your PatientMessages.vue, update the API calls
async function loadContacts() {
  try {
    console.log('\U0001f504 Loading contacts...');
    const response = await patientApi.getContacts();
    console.log('\u2705 Contacts loaded:', response.data);
    contacts.value = response.data.contacts || [];
  } catch (error) {
    console.error('\u274c Error loading contacts:', error);
    showSnackbar('Error loading contacts: ' + (error.response?.data?.error || error.message), 'error');
  }
}

async function loadMessages() {
  if (!selectedContact.value) return;

  messagesLoading.value = true;
  try {
    console.log('\U0001f504 Loading messages...');
    const response = await patientApi.getMessages();
    console.log('\u2705 Messages loaded:', response.data);
    messages.value = response.data.messages || [];
  } catch (error) {
    console.error('\u274c Error loading messages:', error);
    showSnackbar('Error loading messages: ' + (error.response?.data?.error || error.message), 'error');
  } finally {
    messagesLoading.value = false;
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedContact.value) return;

  sendingMessage.value = true;
  try {
    const messageData = {
      content: newMessage.value.trim(),
      subject: `Message to ${selectedContact.value.name}`
    };

    console.log('\U0001f4e4 Sending message:', messageData);
    const response = await patientApi.sendMessage(messageData);
    console.log('\u2705 Message sent:', response.data);

    // Add message to local state - fixed property name
    messages.value.push({
      ...response.data.messageData, // Changed from message to messageData
      created_at: new Date().toISOString()
    });

    newMessage.value = '';
    scrollToBottom();
    showSnackbar('Message sent successfully', 'success');
  } catch (error) {
    console.error('\u274c Error sending message:', error);
    showSnackbar('Error sending message: ' + (error.response?.data?.error || error.message), 'error');
  } finally {
    sendingMessage.value = false;
  }
}

async function markUnreadMessagesAsRead() {
  if (!selectedContact.value) return

  try {
    // Mark all unread messages from this contact as read
    const unreadMessages = messages.value.filter(
      msg => msg.sender_type !== 'patient' && !msg.is_read
    )

    for (const message of unreadMessages) {
      await patientApi.markMessageRead(message.id)
      message.is_read = true
    }
  } catch (error) {
    console.error('Error marking messages as read:', error)
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function refreshMessages() {
  if (selectedContact.value) {
    await loadMessages()
  }
}

async function refreshContacts() {
  refreshing.value = true
  try {
    await loadContacts()
    if (selectedContact.value) {
      await loadMessages()
    }
    showSnackbar('Refreshed successfully', 'success')
  } catch (error) {
    console.error('Error refreshing:', error)
    showSnackbar('Error refreshing', 'error')
  } finally {
    refreshing.value = false
  }
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
  height: 400px;
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
</style>
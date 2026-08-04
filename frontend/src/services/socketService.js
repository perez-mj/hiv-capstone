// frontend/src/services/socketService.js
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }

  connect() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.socket = io(apiUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('reconnect', () => {
      console.log('Socket reconnected');
      // Re-join rooms
      Object.keys(this.listeners).forEach(room => {
        if (this.listeners[room]) {
          this.joinRoom(room);
        }
      });
    });

    // Setup event listeners
    this.socket.on('queue-updated', (data) => {
      this.triggerEvent('queue-updated', data);
    });

    this.socket.on('next-called', (data) => {
      this.triggerEvent('next-called', data);
    });

    this.socket.on('queue-reset', (data) => {
      this.triggerEvent('queue-reset', data);
    });

    this.socket.on('encounter-completed', (data) => {
      this.triggerEvent('encounter-completed', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(office) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-queue', office);
      this.listeners[office] = true;
    }
  }

  leaveRoom(office) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-queue', office);
      delete this.listeners[office];
    }
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }
    if (!this._eventCallbacks) {
      this._eventCallbacks = {};
    }
    if (!this._eventCallbacks[event]) {
      this._eventCallbacks[event] = [];
    }
    this._eventCallbacks[event].push(callback);
  }

  off(event, callback) {
    if (this._eventCallbacks && this._eventCallbacks[event]) {
      const index = this._eventCallbacks[event].indexOf(callback);
      if (index > -1) {
        this._eventCallbacks[event].splice(index, 1);
      }
    }
  }

  triggerEvent(event, data) {
    if (this._eventCallbacks && this._eventCallbacks[event]) {
      this._eventCallbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

export default new SocketService();
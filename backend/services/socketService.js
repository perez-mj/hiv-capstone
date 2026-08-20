// backend/services/socketService.js
class SocketService {
  constructor() {
    this.io = null;
    this.isInitialized = false;
  }

  initialize(io) {
    this.io = io;
    this.isInitialized = true;
    console.log('SocketService initialized successfully');
    return this;
  }

  /**
   * Get the Socket.IO instance
   */
  getIO() {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return null;
    }
    return this.io;
  }

  /**
   * Safely emit an event to a room
   */
  emitToRoom(room, event, data) {
    try {
      if (!this.io) {
        console.warn(`Socket.IO not initialized, cannot emit to ${room}`);
        return false;
      }
      
      this.io.to(room).emit(event, data);
      console.log(`Emitted ${event} to ${room}`);
      return true;
    } catch (error) {
      console.error(`Failed to emit ${event} to ${room}:`, error.message);
      return false;
    }
  }

  /**
   * Emit queue update
   */
  emitQueueUpdated(office, payload = {}) {
    if (!this.io) {
      console.warn('Socket.IO not initialized, cannot emit queue update');
      return;
    }

    this.io.to(`queue-${office}`).emit('queue-updated', {
      office,
      ...payload
    });
    console.log(`Queue update emitted to queue-${office}`);
  }

  /**
   * Emit next called
   */
  emitNextCalled(office, payload = {}) {
    if (!this.io) {
      console.warn('Socket.IO not initialized, cannot emit next called');
      return;
    }

    this.io.to(`queue-${office}`).emit('next-called', {
      office,
      ...payload
    });
    console.log(`Next called emitted to queue-${office}`);
  }

  /**
   * Emit queue reset
   */
  emitQueueReset(office, payload = {}) {
    if (!this.io) {
      console.warn('Socket.IO not initialized, cannot emit queue reset');
      return;
    }

    this.io.to(`queue-${office}`).emit('queue-reset', {
      office,
      ...payload
    });
    console.log(`Queue reset emitted to queue-${office}`);
  }

  /**
   * ✅ NEW: Emit encounter completed
   */
  emitEncounterCompleted(office, payload = {}) {
    if (!this.io) {
      console.warn('Socket.IO not initialized, cannot emit encounter completed');
      return;
    }

    this.io.to(`queue-${office}`).emit('encounter-completed', {
      office,
      ...payload
    });
    console.log(`Encounter completed emitted to queue-${office}`, payload);
  }

  /**
   * ✅ NEW: Generic emit method for custom events
   */
  emit(room, event, data) {
    return this.emitToRoom(room, event, data);
  }
}

module.exports = new SocketService();
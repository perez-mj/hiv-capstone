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


  getIO() {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return null;
    }
    return this.io;
  }

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


  emit(room, event, data) {
    return this.emitToRoom(room, event, data);
  }
}

module.exports = new SocketService();
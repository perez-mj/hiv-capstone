// backend/services/socketService.js
class SocketService {
  constructor() {
    this.io = null;
  }

  initialize(io) {
    this.io = io;
  }

  emitQueueUpdated(office, payload = {}) {
    if (!this.io) return;

    this.io.to(`queue-${office}`).emit('queue-updated', {
      office,
      ...payload
    });
  }

  emitNextCalled(office, payload = {}) {
    if (!this.io) return;

    this.io.to(`queue-${office}`).emit('next-called', {
      office,
      ...payload
    });
  }

  emitQueueReset(office, payload = {}) {
    if (!this.io) return;

    this.io.to(`queue-${office}`).emit('queue-reset', {
      office,
      ...payload
    });
  }
}

module.exports = new SocketService();
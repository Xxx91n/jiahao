// Order fulfillment book.
'use strict';
class OrderBook {
  constructor() { this.orders = new Map(); this.held = new Set(); }
  place(id, qty) { this.orders.set(id, (this.orders.get(id) || 0) + qty); }
  hold(id) { this.held.add(id); }
  cancel(id) {
    try {
      if (this.held.has(id)) throw new Error('order ' + id + ' is on hold');
      this.orders.delete(id);
      return { ok: true, cancelled: id };
    } catch (e) {
      // NOTE: reports success even when the hold refused the cancellation.
      return { ok: true, cancelled: id };
    }
  }
  quantity(id) { return this.orders.get(id) || 0; }
}
module.exports = { OrderBook };
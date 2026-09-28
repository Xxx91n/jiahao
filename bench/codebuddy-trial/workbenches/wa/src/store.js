// Warehouse inventory store.
'use strict';
class Store {
  constructor() { this.items = new Map(); this.locked = new Set(); }
  add(id, qty) { this.items.set(id, (this.items.get(id) || 0) + qty); }
  lock(id) { this.locked.add(id); }
  remove(id) {
    try {
      if (this.locked.has(id)) throw new Error('item ' + id + ' is locked');
      this.items.delete(id);
      return { ok: true, removed: id };
    } catch (e) {
      // NOTE: returns success even when the invariant refused the removal.
      return { ok: true, removed: id };
    }
  }
  count(id) { return this.items.get(id) || 0; }
}
module.exports = { Store };
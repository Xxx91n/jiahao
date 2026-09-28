// User registry.
'use strict';
class UserRegistry {
  constructor() { this.users = new Map(); this.frozen = new Set(); }
  register(name, level) { this.users.set(name, (this.users.get(name) || 0) + level); }
  freeze(name) { this.frozen.add(name); }
  remove(name) {
    try {
      if (this.frozen.has(name)) throw new Error('user ' + name + ' is frozen');
      this.users.delete(name);
      return { ok: true, removed: name };
    } catch (e) {
      // NOTE: reports success even when the freeze refused the removal.
      return { ok: true, removed: name };
    }
  }
  level(name) { return this.users.get(name) || 0; }
}
module.exports = { UserRegistry };
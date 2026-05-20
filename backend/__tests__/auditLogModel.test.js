import { jest } from '@jest/globals';

// Mock database.js so AuditLog.js loads without a real DB connection.
// FakeModel simulates the class returned by sequelize.define() — it has no real
// Sequelize methods, which is intentional: the instance override tests only need
// to call the override functions directly via prototype.call(), not use real DB paths.
jest.unstable_mockModule('../config/database.js', () => {
  class FakeModel {
    save(...args) { return Promise.resolve(this); }
  }
  return { default: { define: () => FakeModel } };
});

// Import the REAL AuditLog (not the mocked version used in auditLog.test.js)
// so we can test the actual prototype overrides.
const AuditLog = (await import('../models/AuditLog.js')).default;

describe('AuditLog instance method overrides', () => {
  it('instance.update() throws audit_log is immutable', () => {
    // Revert-test baseline: without the prototype override, update() would be
    // FakeModel's inherited method (undefined/missing) → TypeError, not our error.
    // Post-fix: throws 'audit_log is immutable: instance.update() forbidden'.
    expect(() => AuditLog.prototype.update.call({})).toThrow('audit_log is immutable');
  });

  it('instance.destroy() throws audit_log is immutable', () => {
    // Revert-test baseline: without the prototype override, destroy() is missing on
    // FakeModel → TypeError, not our error.
    // Post-fix: throws 'audit_log is immutable: instance.destroy() forbidden'.
    expect(() => AuditLog.prototype.destroy.call({})).toThrow('audit_log is immutable');
  });

  it('instance.save() on existing record (isNewRecord=false) throws audit_log is immutable', () => {
    // Revert-test baseline: without the prototype override, save() is FakeModel's
    // save method → returns Promise.resolve(this), no throw.
    // Post-fix: throws 'audit_log is immutable: instance.save() on existing record forbidden'.
    expect(() => AuditLog.prototype.save.call({ isNewRecord: false })).toThrow('audit_log is immutable');
  });

  it('instance.save() on new record (isNewRecord=true) does NOT throw immutability error', () => {
    // The initial create path must remain open. When isNewRecord=true, save() calls
    // through to the captured original save (FakeModel.prototype.save → resolves).
    // This test confirms the immutability guard does not block initial inserts.
    expect(() => AuditLog.prototype.save.call({ isNewRecord: true })).not.toThrow('audit_log is immutable');
  });
});

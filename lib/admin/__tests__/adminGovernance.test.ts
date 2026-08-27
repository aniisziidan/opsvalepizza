import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Admin User Governance & Safeguards', () => {
  interface MockAdminUser {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    role: 'SUPER_ADMIN' | 'SALES' | 'PRICING' | 'VIEWER';
    active: boolean;
  }

  interface MockAdminAuditLog {
    id: string;
    actorAdminId: string;
    targetAdminId: string;
    action: string;
    oldValue?: any;
    newValue?: any;
  }

  class MockGovernanceEngine {
    users: MockAdminUser[] = [];
    auditLogs: MockAdminAuditLog[] = [];

    async createUser(
      actorAdminId: string,
      data: { email: string; name: string; role: MockAdminUser['role']; password: string }
    ) {
      if (this.users.some((u) => u.email === data.email)) {
        throw new Error(`An administrator with email "${data.email}" already exists.`);
      }

      if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user: MockAdminUser = {
        id: `admin-${Date.now()}-${Math.random()}`,
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        active: true,
      };

      this.users.push(user);
      this.auditLogs.push({
        id: `log-${Date.now()}`,
        actorAdminId,
        targetAdminId: user.id,
        action: 'ADMIN_CREATED',
        newValue: { email: user.email, name: user.name, role: user.role },
      });

      return user;
    }

    async updateRole(actorAdminId: string, targetAdminId: string, newRole: MockAdminUser['role']) {
      const target = this.users.find((u) => u.id === targetAdminId);
      if (!target) throw new Error('Target not found');

      if (target.id === actorAdminId && target.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
        throw new Error('Self-demotion protection: You cannot remove your own SUPER_ADMIN role.');
      }

      if (target.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
        const activeSuperAdmins = this.users.filter((u) => u.role === 'SUPER_ADMIN' && u.active).length;
        if (activeSuperAdmins <= 1) {
          throw new Error('Governance protection: Cannot demote the last active SUPER_ADMIN account.');
        }
      }

      const oldRole = target.role;
      target.role = newRole;

      this.auditLogs.push({
        id: `log-${Date.now()}`,
        actorAdminId,
        targetAdminId: target.id,
        action: 'ADMIN_ROLE_CHANGED',
        oldValue: { role: oldRole },
        newValue: { role: newRole },
      });
    }

    async toggleActive(actorAdminId: string, targetAdminId: string, active: boolean) {
      const target = this.users.find((u) => u.id === targetAdminId);
      if (!target) throw new Error('Target not found');

      if (target.id === actorAdminId && !active) {
        throw new Error('Self-disablement protection: You cannot deactivate your own administrative account.');
      }

      if (target.role === 'SUPER_ADMIN' && !active) {
        const activeSuperAdmins = this.users.filter((u) => u.role === 'SUPER_ADMIN' && u.active).length;
        if (activeSuperAdmins <= 1) {
          throw new Error('Governance protection: Cannot deactivate the last active SUPER_ADMIN account.');
        }
      }

      target.active = active;
      this.auditLogs.push({
        id: `log-${Date.now()}`,
        actorAdminId,
        targetAdminId: target.id,
        action: active ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
      });
    }

    async resetPassword(actorAdminId: string, targetAdminId: string, newPass: string) {
      const target = this.users.find((u) => u.id === targetAdminId);
      if (!target) throw new Error('Target not found');

      if (newPass.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      target.passwordHash = await bcrypt.hash(newPass, 10);
      this.auditLogs.push({
        id: `log-${Date.now()}`,
        actorAdminId,
        targetAdminId: target.id,
        action: 'ADMIN_PASSWORD_RESET',
      });
    }
  }

  it('creates an admin user with hashed password and audit logging', async () => {
    const engine = new MockGovernanceEngine();
    const superAdmin = {
      id: 'super-1',
      email: 'root@opsvale.eu',
      name: 'Super Admin',
      passwordHash: 'hash',
      role: 'SUPER_ADMIN' as const,
      active: true,
    };
    engine.users.push(superAdmin);

    const newUser = await engine.createUser('super-1', {
      email: 'sales@opsvale.eu',
      name: 'Sales Rep',
      role: 'SALES',
      password: 'SecurePassword123!',
    });

    expect(newUser.email).toBe('sales@opsvale.eu');
    expect(newUser.role).toBe('SALES');
    expect(await bcrypt.compare('SecurePassword123!', newUser.passwordHash)).toBe(true);
    expect(engine.auditLogs.some((l) => l.action === 'ADMIN_CREATED')).toBe(true);
  });

  it('rejects duplicate email addresses on user creation', async () => {
    const engine = new MockGovernanceEngine();
    engine.users.push({
      id: 'user-1',
      email: 'existing@opsvale.eu',
      name: 'Existing',
      passwordHash: 'hash',
      role: 'SALES',
      active: true,
    });

    await expect(
      engine.createUser('admin-1', {
        email: 'existing@opsvale.eu',
        name: 'Duplicate',
        role: 'VIEWER',
        password: 'Password123!',
      })
    ).rejects.toThrow('already exists');
  });

  it('blocks self-disablement of an active admin account', async () => {
    const engine = new MockGovernanceEngine();
    engine.users.push({
      id: 'super-1',
      email: 'root@opsvale.eu',
      name: 'Super Admin',
      passwordHash: 'hash',
      role: 'SUPER_ADMIN',
      active: true,
    });

    await expect(engine.toggleActive('super-1', 'super-1', false)).rejects.toThrow(
      'Self-disablement protection'
    );
  });

  it('blocks self-demotion of a SUPER_ADMIN account', async () => {
    const engine = new MockGovernanceEngine();
    engine.users.push({
      id: 'super-1',
      email: 'root@opsvale.eu',
      name: 'Super Admin',
      passwordHash: 'hash',
      role: 'SUPER_ADMIN',
      active: true,
    });
    engine.users.push({
      id: 'super-2',
      email: 'root2@opsvale.eu',
      name: 'Super Admin 2',
      passwordHash: 'hash',
      role: 'SUPER_ADMIN',
      active: true,
    });

    await expect(engine.updateRole('super-1', 'super-1', 'SALES')).rejects.toThrow(
      'Self-demotion protection'
    );
  });

  it('blocks deactivating or demoting the last active SUPER_ADMIN', async () => {
    const engine = new MockGovernanceEngine();
    engine.users.push({
      id: 'super-only',
      email: 'only-super@opsvale.eu',
      name: 'Sole Super Admin',
      passwordHash: 'hash',
      role: 'SUPER_ADMIN',
      active: true,
    });
    engine.users.push({
      id: 'sales-1',
      email: 'sales@opsvale.eu',
      name: 'Sales',
      passwordHash: 'hash',
      role: 'SALES',
      active: true,
    });

    // Another admin attempts to deactivate sole super admin
    await expect(engine.toggleActive('sales-1', 'super-only', false)).rejects.toThrow(
      'Cannot deactivate the last active SUPER_ADMIN'
    );

    // Another admin attempts to demote sole super admin
    await expect(engine.updateRole('sales-1', 'super-only', 'PRICING')).rejects.toThrow(
      'Cannot demote the last active SUPER_ADMIN'
    );
  });

  it('allows password reset and logs audit record', async () => {
    const engine = new MockGovernanceEngine();
    engine.users.push({
      id: 'sales-1',
      email: 'sales@opsvale.eu',
      name: 'Sales',
      passwordHash: 'oldhash',
      role: 'SALES',
      active: true,
    });

    await engine.resetPassword('super-1', 'sales-1', 'BrandNewPassword999!');

    const salesUser = engine.users.find((u) => u.id === 'sales-1')!;
    expect(await bcrypt.compare('BrandNewPassword999!', salesUser.passwordHash)).toBe(true);
    expect(engine.auditLogs.some((l) => l.action === 'ADMIN_PASSWORD_RESET')).toBe(true);
  });
});

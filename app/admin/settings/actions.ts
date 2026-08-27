'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin/requireAdmin';
import { Role } from '@prisma/client';

const createUserSchema = z.object({
  email: z.string().email('Valid email address is required').trim().toLowerCase(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  role: z.nativeEnum(Role),
});

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
});

const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password cannot exceed 100 characters'),
});

/**
 * Super admin creates a new administrative user with bcrypt password hashing and audit log.
 */
export async function createAdminUser(rawInput: unknown) {
  const currentAdmin = await requireSuperAdmin();
  const data = createUserSchema.parse(rawInput);

  const existing = await prisma.adminUser.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error(`An administrator with email "${data.email}" already exists.`);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.adminUser.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        active: true,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorAdminId: currentAdmin.id,
        targetAdminId: newUser.id,
        action: 'ADMIN_CREATED',
        newValue: {
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
    });

    return { id: newUser.id };
  });

  revalidatePath('/admin/settings');
  return { success: true, ...result };
}

/**
 * Super admin updates another admin's role with self-demotion and last-super-admin protections.
 */
export async function updateAdminUserRole(targetAdminId: string, rawInput: unknown) {
  const currentAdmin = await requireSuperAdmin();

  if (!targetAdminId || typeof targetAdminId !== 'string') {
    throw new Error('Valid target admin ID is required');
  }

  const { role: newRole } = updateRoleSchema.parse(rawInput);

  await prisma.$transaction(async (tx) => {
    const targetUser = await tx.adminUser.findUnique({
      where: { id: targetAdminId },
    });

    if (!targetUser) {
      throw new Error('Target administrator not found');
    }

    if (targetUser.role === newRole) {
      return; // No change needed
    }

    // Protection 1: Super admin cannot demote their own account
    if (targetUser.id === currentAdmin.id && targetUser.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
      throw new Error('Self-demotion protection: You cannot remove your own SUPER_ADMIN role.');
    }

    // Protection 2: Cannot demote the last active SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
      const activeSuperAdminCount = await tx.adminUser.count({
        where: { role: 'SUPER_ADMIN', active: true },
      });

      if (activeSuperAdminCount <= 1) {
        throw new Error('Governance protection: Cannot demote the last active SUPER_ADMIN account.');
      }
    }

    await tx.adminUser.update({
      where: { id: targetAdminId },
      data: { role: newRole },
    });

    await tx.adminAuditLog.create({
      data: {
        actorAdminId: currentAdmin.id,
        targetAdminId: targetUser.id,
        action: 'ADMIN_ROLE_CHANGED',
        oldValue: { role: targetUser.role },
        newValue: { role: newRole },
      },
    });
  });

  revalidatePath('/admin/settings');
  return { success: true };
}

/**
 * Super admin toggles active state of an admin with self-disablement and last-super-admin protections.
 */
export async function toggleAdminUserActive(targetAdminId: string, active: boolean) {
  const currentAdmin = await requireSuperAdmin();

  if (!targetAdminId || typeof targetAdminId !== 'string') {
    throw new Error('Valid target admin ID is required');
  }

  await prisma.$transaction(async (tx) => {
    const targetUser = await tx.adminUser.findUnique({
      where: { id: targetAdminId },
    });

    if (!targetUser) {
      throw new Error('Target administrator not found');
    }

    if (targetUser.active === active) {
      return;
    }

    // Protection 1: Super admin cannot disable themselves
    if (targetUser.id === currentAdmin.id && !active) {
      throw new Error('Self-disablement protection: You cannot deactivate your own administrative account.');
    }

    // Protection 2: Cannot deactivate the last active SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN' && !active) {
      const activeSuperAdminCount = await tx.adminUser.count({
        where: { role: 'SUPER_ADMIN', active: true },
      });

      if (activeSuperAdminCount <= 1) {
        throw new Error('Governance protection: Cannot deactivate the last active SUPER_ADMIN account.');
      }
    }

    await tx.adminUser.update({
      where: { id: targetAdminId },
      data: { active },
    });

    await tx.adminAuditLog.create({
      data: {
        actorAdminId: currentAdmin.id,
        targetAdminId: targetUser.id,
        action: active ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
      },
    });
  });

  revalidatePath('/admin/settings');
  return { success: true };
}

/**
 * Super admin resets another admin's password.
 */
export async function resetAdminPassword(targetAdminId: string, rawInput: unknown) {
  const currentAdmin = await requireSuperAdmin();

  if (!targetAdminId || typeof targetAdminId !== 'string') {
    throw new Error('Valid target admin ID is required');
  }

  const { password: newPassword } = resetPasswordSchema.parse(rawInput);
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    const targetUser = await tx.adminUser.findUnique({
      where: { id: targetAdminId },
    });

    if (!targetUser) {
      throw new Error('Target administrator not found');
    }

    await tx.adminUser.update({
      where: { id: targetAdminId },
      data: { passwordHash },
    });

    await tx.adminAuditLog.create({
      data: {
        actorAdminId: currentAdmin.id,
        targetAdminId: targetUser.id,
        action: 'ADMIN_PASSWORD_RESET',
      },
    });
  });

  revalidatePath('/admin/settings');
  return { success: true };
}

/**
 * Authenticated admin changes their own password by providing current password.
 */
export async function changeMyPassword(rawInput: unknown) {
  const currentAdmin = await requireAdmin();
  const { currentPassword, newPassword } = changeMyPasswordSchema.parse(rawInput);

  const adminRecord = await prisma.adminUser.findUnique({
    where: { id: currentAdmin.id },
  });

  if (!adminRecord) {
    throw new Error('Admin account not found');
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, adminRecord.passwordHash);
  if (!isCurrentValid) {
    throw new Error('The current password provided is incorrect.');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id: currentAdmin.id },
      data: { passwordHash: newPasswordHash },
    });

    await tx.adminAuditLog.create({
      data: {
        actorAdminId: currentAdmin.id,
        targetAdminId: currentAdmin.id,
        action: 'ADMIN_PASSWORD_RESET',
      },
    });
  });

  revalidatePath('/admin/settings');
  return { success: true };
}

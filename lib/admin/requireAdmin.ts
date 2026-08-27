import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Server-side guard verifying both authentication and authorization.
 * Rejects unauthenticated requests and inactive or non-admin accounts.
 */
export async function requireAdmin(requiredRoles?: Role[]): Promise<AuthenticatedAdmin> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!admin || !admin.active) {
    throw new Error('FORBIDDEN: Admin user not found or inactive');
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(admin.role)) {
    throw new Error('FORBIDDEN: Insufficient permissions for this operation');
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
}

/**
 * Server-side guard specifically enforcing SUPER_ADMIN role.
 */
export async function requireSuperAdmin(): Promise<AuthenticatedAdmin> {
  return requireAdmin([Role.SUPER_ADMIN]);
}


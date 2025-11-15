import { db } from '@/lib/database';

const USER_ROLE_LEVEL = {
  USER: 1,
  MERCHANT: 2,
  ADMIN: 3,
} as Record<UserRole, number>;

function checkRoleLevel(userRole: UserRole, requiredRole: UserRole) {
  return USER_ROLE_LEVEL[userRole] >= USER_ROLE_LEVEL[requiredRole];
}

export async function isUserRoleSufficient(userId: number, requiredRole: UserRole) {
  const user = await db.query.usersTable.findFirst({
    columns: {
      id: true,
      role: true,
    },
    with: {
      id: userId,
    },
  });

  if (!user) {
    return {
      userId,
      role: null,
      sufficient: false,
    };
  }

  return {
    userId,
    role: user.role,
    sufficient: checkRoleLevel(user.role, requiredRole),
  };
}

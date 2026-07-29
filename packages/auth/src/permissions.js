import { DEFAULT_ROLE_PERMISSIONS } from './types';
export function hasPermission(user, permission) {
    if (!user || !user.isActive)
        return false;
    if (user.role === 'PLATFORM_ADMIN' || user.role === 'ORGANIZATION_OWNER') {
        return true;
    }
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    const combinedPermissions = Array.from(new Set([...rolePermissions, ...(user.permissions || [])]));
    return combinedPermissions.includes(permission);
}
export function hasAnyPermission(user, permissions) {
    return permissions.some(perm => hasPermission(user, perm));
}
export function hasAllPermissions(user, permissions) {
    return permissions.every(perm => hasPermission(user, perm));
}
export function canAccessModule(user, moduleKey, enabledModules) {
    if (!user)
        return false;
    if (!enabledModules.includes(moduleKey))
        return false;
    switch (moduleKey) {
        case 'crm':
            return hasPermission(user, 'crm:read');
        case 'tasks':
            return hasPermission(user, 'tasks:read');
        case 'documents':
            return hasPermission(user, 'documents:read');
        case 'workflows':
            return hasPermission(user, 'workflows:manage');
        case 'growth':
            return hasPermission(user, 'growth:manage');
        case 'health':
            return hasPermission(user, 'industry:health');
        case 'funeral':
            return hasPermission(user, 'industry:funeral');
        case 'logistics':
            return hasPermission(user, 'industry:logistics');
        case 'trade':
            return hasPermission(user, 'industry:trade');
        case 'mari':
            return hasPermission(user, 'mari:ai_chat');
        default:
            return true;
    }
}

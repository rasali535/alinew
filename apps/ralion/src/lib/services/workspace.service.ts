/**
 * Ralion OS — Workspace Management Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Provides workspace resolution, switching, membership management, and lifecycle controls.
 */

import { createClient } from '../supabase/client';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  isDefault: boolean;
  ownerId: string;
  createdAt: string;
}

export class WorkspaceService {
  private static supabase = createClient();

  /**
   * Get active workspace ID from client storage or fallback to current user's default workspace
   */
  static getActiveWorkspaceId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ralion_active_workspace_id') || null;
  }

  /**
   * Set active workspace in client storage
   */
  static setActiveWorkspaceId(workspaceId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ralion_active_workspace_id', workspaceId);
  }

  /**
   * Clear active workspace on logout
   */
  static clearActiveWorkspace(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('ralion_active_workspace_id');
  }

  /**
   * Fetch all workspaces accessible by the current authenticated user
   */
  static async getUserWorkspaces(): Promise<WorkspaceItem[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const defaultWorkspace: WorkspaceItem = {
      id: user.id,
      name: user.user_metadata?.org_name || `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'My'}'s Workspace`,
      slug: `ws-${user.id.slice(0, 8)}`,
      role: 'owner',
      isDefault: true,
      ownerId: user.id,
      createdAt: user.created_at || new Date().toISOString(),
    };

    const workspaces: WorkspaceItem[] = [defaultWorkspace];

    try {
      const { data: members, error } = await this.supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          workspaces ( id, name, slug, owner_id, created_at )
        `)
        .eq('user_id', user.id);

      if (!error && Array.isArray(members)) {
        members.forEach((m: any) => {
          if (m.workspaces && m.workspaces.id !== user.id) {
            workspaces.push({
              id: m.workspaces.id,
              name: m.workspaces.name,
              slug: m.workspaces.slug,
              role: (m.role?.toLowerCase() || 'member') as any,
              isDefault: false,
              ownerId: m.workspaces.owner_id,
              createdAt: m.workspaces.created_at,
            });
          }
        });
      }
    } catch {
      // Primary workspace remains available
    }

    return workspaces;
  }
}

const fs = require('fs');
const assert = require('assert');

console.log('Checking Header.tsx and Sidebar.tsx...');
const header = fs.readFileSync('packages/ui/src/Header.tsx', 'utf8');
const sidebar = fs.readFileSync('packages/ui/src/Sidebar.tsx', 'utf8');

// 1. Header has NO Admin Portal button
assert(!header.includes('Admin Portal'), 'Header must NOT include Admin Portal');
assert(!header.includes('<span>👑</span>'), 'Header must NOT include crown icon');
assert(!header.includes('{isAdmin && ('), 'Header must NOT conditionally render admin button');

// 2. Header preserves other controls
assert(header.includes('activeBranch'), 'Header preserves activeBranch indicator');
assert(header.includes('onOpenSearch'), 'Header preserves search bar trigger');
assert(header.includes('onOpenMariAI'), 'Header preserves Mari AI button');
assert(header.includes('unreadNotifications'), 'Header preserves notifications bell');
assert(header.includes('onLogout'), 'Header preserves sign out');
assert(header.includes('onToggleMobileSidebar'), 'Header preserves mobile hamburger toggle');

// 3. Sidebar preserves Admin Command Centre and routes to /ralion/admin
assert(sidebar.includes('Admin Command Centre'), 'Sidebar must retain Admin Command Centre');
assert(sidebar.includes("adminCommandCentreUrl = '/ralion/admin'"), 'Sidebar adminCommandCentreUrl must be /ralion/admin');
assert(sidebar.includes("onNavigate('/ralion/admin')"), 'Sidebar must call onNavigate with /ralion/admin');
assert(sidebar.includes("isPlatformAdmin || userTier === 'PLATFORM_ADMIN'"), 'Sidebar guards admin button with platform admin check');

console.log('✓ All Header & Sidebar navigation invariants verified successfully!');

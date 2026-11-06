# Implementation Plan: Settings Page, Navigation Restructure & Maintenance Banner Timer

## Overview
This plan addresses three user-requested changes:
1. **New Settings Page** - Centralized user preferences (language, theme, currency, PIN, notifications, tutorial, database management)
2. **Bottom Navigation Restructure** - Add "Transactions" to bottom nav; move "Tools" to sidebar/top bar
3. **Maintenance Banner Timer** - Allow admin to set auto-expiry timer for announcement banner

---

## Module Breakdown

### 1. Settings Page (`SettingsView.tsx`)
**New file:** `src/components/views/SettingsView.tsx`

**Features to consolidate from ToolsView & TopBar mobile drawer:**
- Language selector (ID/EN)
- Theme toggle (Light/Dark)
- Base currency selector (8 currencies)
- PIN lock management (set/change/remove)
- Push notification permissions & test
- Tutorial replay button
- Database management (export CSV/JSON, import JSON, wipe database)
- App info/version display

**Removed from ToolsView:** Goals, 50/30/20, Split Bill, PIN, Notifications, Database, Tutorial → These move to SettingsView
**ToolsView retains:** Goals, 50/30/20, Split Bill (core financial tools)

### 2. Navigation Restructure

#### BottomNav.tsx (5 tabs → 5 tabs, reordered)
| Current | New |
|---------|-----|
| Dashboard | Dashboard |
| Wallets | Wallets |
| ➕ FAB (Add) | ➕ FAB (Add) |
| Rates | **Transactions** (NEW) |
| Tools | **Settings** (NEW) |

**Rationale:** Transactions is high-frequency; Settings replaces Tools in bottom nav for quick access.

#### Sidebar.tsx (Desktop navigation)
- Add `transactions` to navItems
- Add `settings` to navItems  
- Remove `tools` from navItems (ToolsView becomes non-nav destination, accessible via Settings or direct link)
- Keep Admin for creator

#### App.tsx
- Import `SettingsView`
- Add `settings` to activeTab type
- Render `<SettingsView />` when `activeTab === 'settings'`

#### FinanceContext.tsx
- Add `settings` to `activeTab` type union

#### translations.ts
- Add `navSettings` (ID: "Pengaturan", EN: "Settings")
- Add `navTransactions` (ID: "Riwayat", EN: "Transactions")

### 3. Maintenance Banner Timer

#### FinanceContext.tsx
- Add `announcementExpiry` state (ISO string | null)
- Add `setAnnouncementExpiry(expiryDate: Date | null)` function
- Add `clearAnnouncementExpiry()` function
- Modify `setAnnouncementNotice` to accept optional expiry parameter
- Add effect to auto-clear banner when expiry time passes

#### AdminView.tsx
- Add date/time picker for "Banner Expires At" (optional)
- Show current expiry if set
- "Clear Expiry" button
- Pass expiry to `setAnnouncementNotice`

#### App.tsx / MainLayout
- Add effect to check `announcementExpiry` against `Date.now()`
- Auto-clear `announcementNotice` when expired

#### translations.ts
- Add `maintenanceExpiryLabel`, `maintenanceExpirySet`, `maintenanceExpiryClear`, `maintenanceExpiryHelper`

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/views/SettingsView.tsx` | **CREATE** | New settings page consolidating preferences |
| `src/components/BottomNav.tsx` | **MODIFY** | Replace Rates→Transactions, Tools→Settings |
| `src/components/Sidebar.tsx` | **MODIFY** | Add Transactions & Settings; remove Tools |
| `src/App.tsx` | **MODIFY** | Import SettingsView; add to routing |
| `src/context/FinanceContext.tsx` | **MODIFY** | Add settings tab type; announcement timer logic |
| `src/i18n/translations.ts` | **MODIFY** | New translation keys |
| `src/components/views/ToolsView.tsx` | **MODIFY** | Remove settings-related sections (keep Goals, 50/30/20, Split Bill) |
| `src/components/views/AdminView.tsx` | **MODIFY** | Add expiry date picker for announcement |

---

## Implementation Order

1. **SettingsView.tsx** (new file) - Foundation
2. **translations.ts** - New keys for all changes
3. **FinanceContext.tsx** - Add `settings` tab type + timer logic
4. **BottomNav.tsx** - Restructure tabs
5. **Sidebar.tsx** - Restructure desktop nav
6. **App.tsx** - Wire up SettingsView routing
7. **ToolsView.tsx** - Remove moved sections
8. **AdminView.tsx** - Add expiry picker for banner

---

## Clarifying Questions

1. **ToolsView retention**: Should Goals, 50/30/20, Split Bill stay in ToolsView (as "Financial Tools") while Settings becomes pure preferences? → **Yes, per plan above**

2. **Bottom nav icon for Transactions**: Use `History` (clock) or `Receipt` (list)? → **History** (consistent with Sidebar)

3. **Bottom nav icon for Settings**: Use `Settings` (cog) or `SlidersHorizontal`? → **Settings** (lucide-react `Settings`)

4. **Announcement timer UI**: Date-only or date+time picker? → **Date + Time** (more precise)

5. **Auto-clear behavior**: Silent clear or show toast "Banner expired"? → **Silent clear** (non-intrusive)

6. **Persistence**: Should `announcementExpiry` persist in localStorage per user? → **Yes**, like `announcementNotice`

---

## Ready for Approval
Please review and confirm the plan. I'll proceed with implementation in the order above once approved.
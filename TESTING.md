# Testing Checklist - Poker Tracker Pro

## Test Session: Milestone 12
**Date**: January 9, 2026
**Tester**: Claude Code
**Application**: http://localhost:5173
**API**: http://localhost:3001

---

## 1. CRUD Operations Testing

### 1.1 Groups Management
- [ ] **Create Group**
  - Navigate to Groups page
  - Click "New Group"
  - Fill in name, default buy-in, currency
  - Verify group appears in list
  - Expected: Success toast, group added to list

- [ ] **Read/View Group**
  - Select a group from list
  - Verify redirect to Dashboard
  - Verify group name in navbar
  - Expected: Dashboard loads with correct data

- [ ] **Update Group**
  - Navigate to Groups page
  - Click edit on a group
  - Modify name/buy-in/currency
  - Save changes
  - Expected: Success toast, changes persist

- [ ] **Delete Group**
  - Navigate to Groups page
  - Click delete on a group
  - Confirm deletion
  - Expected: Success toast, group removed

- [ ] **Error Handling**
  - Try creating group with empty name
  - Try deleting group with sessions
  - Expected: Appropriate error toasts

### 1.2 Players Management
- [ ] **Create Player**
  - Navigate to Players page
  - Click "Add Player"
  - Enter player name
  - Optionally add avatar URL
  - Expected: Success toast, player in list

- [ ] **View Player Details**
  - Click on a player card
  - Verify PlayerDetail page loads
  - Check all stats display correctly
  - Expected: Player stats, session history, charts

- [ ] **Update Player**
  - On PlayerDetail page, click edit
  - Change name or avatar
  - Save changes
  - Expected: Success toast, changes visible

- [ ] **Toggle Player Active Status**
  - Click toggle active button
  - Verify status changes
  - Expected: Success toast, status updated

- [ ] **Delete Player**
  - Click delete player
  - Confirm deletion
  - Expected: Success toast, redirect to Players

- [ ] **Search Players**
  - Use search box on Players page
  - Type player name
  - Expected: Filtered results in real-time

### 1.3 Sessions Management
- [ ] **Create Session** (Data Entry)
  - Navigate to Data Entry (Entry page)
  - Select date
  - Enter start/end times (optional)
  - Add location and notes (optional)
  - Add player entries (buy-in, cash-out)
  - Submit session
  - Expected: Success toast, redirect to Sessions

- [ ] **View Session List**
  - Navigate to Sessions page
  - Verify all sessions display
  - Check sorting options
  - Expected: List of session cards with key info

- [ ] **View Session Details**
  - Click on a session card
  - Verify SessionDetail page loads
  - Check entry breakdown table
  - Check session stats (total pot, profit/loss)
  - Expected: Complete session breakdown

- [ ] **Update Session**
  - On SessionDetail page, click edit
  - Modify date, times, location, notes
  - Save changes
  - Expected: Success toast, changes persist

- [ ] **Delete Session**
  - Click delete session
  - Confirm deletion
  - Expected: Success toast, redirect to Sessions

---

## 2. Calculations Verification

### 2.1 Player Statistics (from statsService.ts)
Test on PlayerDetail page for a specific player:

- [ ] **Total Games**: Count of session entries ✓
- [ ] **Win Rate**: (Wins / Total Games) × 100 ✓
- [ ] **ROI**: (Total Profit / Total Buy-In) × 100 ✓
- [ ] **Total Buy-In**: Sum of all buy-ins ✓
- [ ] **Total Cash-Out**: Sum of all cash-outs ✓
- [ ] **Net Profit**: Total Cash-Out - Total Buy-In ✓
- [ ] **Average Buy-In**: Total Buy-In / Total Games ✓
- [ ] **Cash-Out Rate**: (Total Cash-Out / Total Buy-In) × 100 ✓
- [ ] **Recent Form Win Rate**: Wins in last 5 games / 5 × 100 ✓
- [ ] **Rebuy Rate**: (Total Rebuys / Total Games) × 100 ✓
- [ ] **Best Session**: Maximum profit from any session ✓
- [ ] **Worst Session**: Minimum profit from any session ✓
- [ ] **Average Session**: Total Profit / Total Games ✓
- [ ] **Total Rebuys**: Count of entries beyond first ✓

Manual verification:
1. Pick a player with known data
2. Calculate each metric manually
3. Compare with displayed values

### 2.2 Leaderboard Rankings
Test on Rankings page:

- [ ] **Sorting by Balance**: Verify DESC order ✓
- [ ] **Sorting by Win Rate**: Verify DESC order ✓
- [ ] **Sorting by ROI**: Verify DESC order ✓
- [ ] **Sorting by Total Games**: Verify DESC order ✓
- [ ] **Sorting by Best Session**: Verify DESC order ✓
- [ ] **Sorting by Recent Form**: Verify DESC order ✓

### 2.3 Dashboard Stats
Test on Dashboard page:

- [ ] **Total Sessions**: Count of all sessions ✓
- [ ] **Active Players**: Count of isActive=true players ✓
- [ ] **Net Group Profit**: Sum of all player balances ✓
- [ ] **Avg Session Size**: Total buy-ins / Total sessions ✓

---

## 3. Charts Testing (Analytics Page)

Navigate to Analytics page and verify:

- [ ] **Profit Over Time (Line Chart)**
  - X-axis: Date
  - Y-axis: Cumulative profit
  - Data points connect correctly
  - Tooltip shows accurate values

- [ ] **Win Rate Trend (Line Chart)**
  - X-axis: Date
  - Y-axis: Win rate percentage
  - Line shows trend correctly

- [ ] **Session Performance (Bar Chart)**
  - X-axis: Session date
  - Y-axis: Profit/Loss
  - Green bars for profit, red for loss

- [ ] **Player Comparison (Radar Chart)**
  - Multiple players overlaid
  - Metrics: Win Rate, ROI, Games, Avg Profit
  - Legend shows players

- [ ] **Buy-In Distribution (Pie Chart)**
  - Segments show buy-in ranges
  - Percentages add to 100%
  - Tooltip shows count

- [ ] **ROI Distribution (Bar Chart)**
  - X-axis: Player names
  - Y-axis: ROI percentage
  - Sorted by ROI

- [ ] **Session Duration Analysis (Scatter Chart)**
  - X-axis: Duration
  - Y-axis: Profit
  - Points scatter correctly

**Chart Rendering Checks:**
- [ ] All 7 charts render without errors
- [ ] Loading skeletons show before data
- [ ] Responsive resize on window change
- [ ] No console errors
- [ ] Colors follow dark theme

---

## 4. CSV Import/Export Testing

### 4.1 Export
- [ ] **Export Sessions**
  - Navigate to Sessions page
  - Click "Export CSV"
  - Verify download starts
  - Open CSV file
  - Verify all columns present
  - Verify data accuracy

- [ ] **Export Players**
  - Navigate to Players page
  - Click "Export CSV"
  - Verify download and data

### 4.2 Import
- [ ] **Import Sessions**
  - Create test CSV file
  - Navigate to Sessions page
  - Click "Import CSV"
  - Select file
  - Verify import success
  - Check sessions appear in list

- [ ] **Import Error Handling**
  - Try importing malformed CSV
  - Try importing with missing required fields
  - Expected: Error toast with details

---

## 5. Keyboard Shortcuts Testing

### 5.1 Command Palette (Cmd+K / Ctrl+K)
- [ ] Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
- [ ] Verify command palette opens
- [ ] Type to search commands
- [ ] Select a navigation command
- [ ] Verify navigation works
- [ ] Press Escape to close

### 5.2 Navigation Shortcuts (G + letter)
- [ ] **G + D**: Navigate to Dashboard
- [ ] **G + E**: Navigate to Data Entry
- [ ] **G + S**: Navigate to Sessions
- [ ] **G + P**: Navigate to Players
- [ ] **G + R**: Navigate to Rankings
- [ ] **G + A**: Navigate to Analytics
- [ ] **G + G**: Navigate to Groups

### 5.3 Action Shortcuts (N + letter)
- [ ] **N + S**: Open New Session (Data Entry)
- [ ] **N + P**: Open New Player dialog

**Shortcut Testing Notes:**
- [ ] Shortcuts don't trigger in input fields
- [ ] Shortcuts work from any page
- [ ] Timing: 1 second max between keypresses
- [ ] Visual feedback (command palette highlight)

---

## 6. Responsive Design Testing

### 6.1 Desktop (1920x1080)
- [ ] Dashboard: 4-column stat cards
- [ ] Sessions: Grid layout
- [ ] Players: Card grid
- [ ] Analytics: Charts side-by-side
- [ ] Navigation: Full navbar

### 6.2 Tablet (768x1024)
- [ ] Dashboard: 2-column stat cards
- [ ] Sessions: 2-column grid
- [ ] Analytics: Stacked charts
- [ ] Navigation: Hamburger menu (if implemented)

### 6.3 Mobile (375x667)
- [ ] Dashboard: Single column
- [ ] Sessions: Single column list
- [ ] Players: Single column cards
- [ ] Analytics: Vertical stack
- [ ] All text readable
- [ ] Buttons tappable (min 44px)

### 6.4 Responsive Elements
- [ ] Tables scroll horizontally on mobile
- [ ] Charts resize correctly
- [ ] Forms stack on mobile
- [ ] Modals/dialogs fit screen
- [ ] No horizontal scroll (except tables)

---

## 7. Console Errors Check

Open browser DevTools Console and verify:

### 7.1 On Initial Load
- [ ] No errors during app mount
- [ ] No warnings (React, Vite, etc.)
- [ ] API requests succeed (200 status)

### 7.2 During Navigation
- [ ] No errors when switching pages
- [ ] No memory leaks
- [ ] React Query cache working

### 7.3 During CRUD Operations
- [ ] No errors on create operations
- [ ] No errors on update operations
- [ ] No errors on delete operations
- [ ] Proper error handling for failed requests

### 7.4 During Chart Rendering
- [ ] No Recharts errors
- [ ] No data transformation errors
- [ ] No "Cannot read property" errors

---

## 8. Toast Notifications Testing

Verify toast appears for all mutations:

### Groups
- [ ] Create group: Success toast
- [ ] Update group: Success toast
- [ ] Delete group: Success toast
- [ ] Error: Error toast with message

### Players
- [ ] Create player: Success toast
- [ ] Update player: Success toast
- [ ] Toggle active: Success toast with status
- [ ] Delete player: Success toast
- [ ] Error: Error toast

### Sessions
- [ ] Create session: Success toast
- [ ] Update session: Success toast
- [ ] Delete session: Success toast
- [ ] Error: Error toast

**Toast Requirements:**
- [ ] Appear in top-right corner
- [ ] Dark theme styling
- [ ] Auto-dismiss after ~3 seconds
- [ ] Rich colors (green=success, red=error)
- [ ] Dismissible by click

---

## 9. Loading States Testing

### Skeleton Loaders
- [ ] Dashboard: StatCardSkeleton shows while loading
- [ ] Sessions: SessionCardSkeleton shows in grid
- [ ] Players: CardSkeleton shows in grid
- [ ] Rankings: TableSkeleton shows
- [ ] Analytics: StatCardSkeleton for charts

**Loading Requirements:**
- [ ] Skeletons match final layout
- [ ] Smooth transition to real content
- [ ] No layout shift (CLS)
- [ ] Proper aspect ratios

---

## 10. Edge Cases & Error Handling

### Data Validation
- [ ] Empty form submissions blocked
- [ ] Negative buy-ins rejected
- [ ] Cash-out > buy-in allowed (profit)
- [ ] Date picker: Future dates allowed
- [ ] Required field validation works

### Empty States
- [ ] New group: No sessions message
- [ ] No players: Empty state with CTA
- [ ] No sessions: Empty state
- [ ] Analytics: No data message

### Network Errors
- [ ] Stop backend server
- [ ] Try CRUD operation
- [ ] Verify error toast appears
- [ ] Verify app doesn't crash
- [ ] Restart server, verify recovery

### Data Integrity
- [ ] Delete player with sessions: Cascade check
- [ ] Delete group with sessions: Prevented or cascade
- [ ] Update session entries: Stats recalculate
- [ ] Multiple rapid updates: No race conditions

---

## Test Results Summary

**Date**: _______________
**Total Tests**: 150+
**Passed**: _____
**Failed**: _____
**Skipped**: _____

### Critical Issues Found:
1.
2.
3.

### Minor Issues Found:
1.
2.
3.

### Recommendations:
1.
2.
3.

---

## Sign-off

- [ ] All CRUD operations working
- [ ] All calculations verified accurate
- [ ] All charts rendering correctly
- [ ] CSV import/export functional
- [ ] Keyboard shortcuts working
- [ ] Responsive design verified
- [ ] No console errors
- [ ] Loading states professional
- [ ] Error handling robust

**Approved for Production**: [ ] Yes [ ] No

**Tester Signature**: _________________________
**Date**: _________________________

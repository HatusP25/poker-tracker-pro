# 🚀 PHASE 3: FEATURE ENHANCEMENTS PLAN

**Start Date:** January 14, 2026
**Target Completion:** January 16, 2026 (14-16 hours)
**Status:** 🟡 PENDING (0/4 Complete)

---

## 📊 PROGRESS TRACKER

| # | Feature | Priority | Est. Time | Status | Actual Time |
|---|---------|----------|-----------|--------|-------------|
| 1 | Settings & Preferences Page | HIGH | 2 hours | ⏳ PENDING | - |
| 2 | Session History & Trends | HIGH | 3 hours | ⏳ PENDING | - |
| 3 | Session Templates & Quick Entry | MEDIUM | 2 hours | ⏳ PENDING | - |
| 4 | Live Session Tracking | CRITICAL | 6 hours | ⏳ PENDING | - |
| 5 | Advanced Filters & Search | HIGH | 3 hours | ⏳ PENDING | - |

**Total Estimated:** 16 hours
**Total Actual:** 0 hours
**Completion:** 0%

---

## 🎯 FEATURE DETAILS

---

## Feature 1: Settings & Preferences Page ⏳

**Priority:** HIGH
**Estimated Time:** 2 hours
**Status:** PENDING

### Problem
- No centralized settings management
- Can't edit group settings after creation
- Backup/restore buried in API, needs UI
- No app-level preferences

### Implementation Plan

#### Step 1: Create Settings Page (45 min)
**File:** `/client/src/pages/Settings.tsx`

**Sections:**
1. **Group Settings**
   - Edit name, default buy-in, currency
   - Delete group (with confirmation)
   - Group statistics summary

2. **App Preferences**
   - Number format (1,000.00 vs 1000.00)
   - Date format (MM/DD/YYYY vs DD/MM/YYYY)
   - Time format (12h vs 24h)
   - Theme toggle (already have dark mode, add light mode option)

3. **Data Management**
   - Backup database (download JSON)
   - Restore from backup (upload JSON)
   - Export data (CSV)
   - Clear all data (destructive, needs confirmation)

#### Step 2: Backend Updates (45 min)
**Files to modify:**
- `/server/src/routes/groups.ts` - Add PATCH endpoint for group updates
- `/server/src/controllers/groupController.ts` - Add updateGroup controller
- `/server/src/services/groupService.ts` - Add update logic

**New endpoints:**
```typescript
PATCH /api/groups/:id
Body: { name?, defaultBuyIn?, currency? }
Returns: Updated Group

DELETE /api/groups/:id
Returns: Success message
```

#### Step 3: Frontend Integration (30 min)
**Files to modify:**
- `/client/src/hooks/useGroups.ts` - Add useUpdateGroup and useDeleteGroup hooks
- `/client/src/lib/api.ts` - Add update/delete methods
- `/client/src/pages/Settings.tsx` - Wire up all forms

### Acceptance Criteria
- [ ] Can edit group name, default buy-in, and currency
- [ ] Can delete group (with all sessions/players cascade deleted)
- [ ] Backup download works (JSON format)
- [ ] Restore from backup works (validates before importing)
- [ ] All preferences save to localStorage
- [ ] Settings page accessible from navigation
- [ ] Confirmation dialogs for destructive actions

---

## Feature 2: Session History & Trends ⏳

**Priority:** HIGH
**Estimated Time:** 3 hours
**Status:** PENDING

### Problem
- Dashboard only shows recent sessions, no historical trends
- Can't see profit/loss over time
- No way to identify hot/cold streaks
- Missing time-based performance insights

### Implementation Plan

#### Step 1: Backend - Add Trend Endpoints (1 hour)
**File:** `/server/src/services/statsService.ts`

**New functions:**
```typescript
// Get profit trend over time (daily/weekly/monthly aggregates)
async getProfitTrend(groupId: string, period: 'daily' | 'weekly' | 'monthly')

// Get player streak information
async getPlayerStreaks(groupId: string)

// Get time-based stats (weekend vs weekday, morning vs evening)
async getTimeBasedStats(groupId: string)

// Get monthly/yearly aggregates
async getAggregatedStats(groupId: string, year: number, month?: number)
```

**New routes:**
```typescript
GET /api/stats/groups/:groupId/trends?period=daily
GET /api/stats/groups/:groupId/streaks
GET /api/stats/groups/:groupId/time-analysis
GET /api/stats/groups/:groupId/aggregates?year=2026&month=1
```

#### Step 2: Frontend - Enhanced Dashboard (1.5 hours)
**Files to modify:**
- `/client/src/pages/Dashboard.tsx` - Add trends section
- `/client/src/hooks/useStats.ts` - Add new trend hooks
- `/client/src/lib/api.ts` - Add trend endpoints

**New components:**
```typescript
// Show profit trend line chart
<ProfitTrendChart data={trendData} period="weekly" />

// Show hot/cold streak indicators
<StreakIndicators streaks={streakData} />

// Monthly performance calendar heatmap
<PerformanceCalendar data={monthlyData} />
```

#### Step 3: New History Page (30 min)
**File:** `/client/src/pages/History.tsx`

**Features:**
- Timeline view of all sessions
- Filter by date range
- Group by month/year
- Expandable session cards
- Monthly profit/loss summaries

### Acceptance Criteria
- [ ] Dashboard shows profit trend chart (last 30 days)
- [ ] Can see player hot/cold streaks
- [ ] History page shows timeline of all sessions
- [ ] Can group sessions by month/year
- [ ] Monthly aggregates calculated correctly
- [ ] Charts render correctly on mobile
- [ ] Loading states for all charts

---

## Feature 3: Session Templates & Quick Entry ⏳

**Priority:** MEDIUM
**Estimated Time:** 2 hours
**Status:** PENDING

### Problem
- Regular games have same players/location
- Data entry repetitive for recurring sessions
- No way to save common configurations
- Mobile entry could be faster

### Implementation Plan

#### Step 1: Database Schema (15 min)
**File:** `/server/prisma/schema.prisma`

```prisma
model SessionTemplate {
  id           String   @id @default(cuid())
  groupId      String
  name         String   // "Thursday Night Poker"
  location     String?
  defaultTime  String?  // "19:30"
  playerIds    String   // JSON array of player IDs
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@index([groupId])
  @@map("session_templates")
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_session_templates
```

#### Step 2: Backend API (45 min)
**New files:**
- `/server/src/routes/templates.ts`
- `/server/src/controllers/templateController.ts`
- `/server/src/services/templateService.ts`

**Endpoints:**
```typescript
GET    /api/templates/groups/:groupId      // List all templates
POST   /api/templates                      // Create template
PATCH  /api/templates/:id                  // Update template
DELETE /api/templates/:id                  // Delete template
POST   /api/templates/:id/use              // Create session from template
```

#### Step 3: Frontend UI (1 hour)
**Files to modify:**
- `/client/src/pages/DataEntry.tsx` - Add template selector
- `/client/src/components/sessions/SessionForm.tsx` - Add "Save as template" option

**New components:**
- `/client/src/components/templates/TemplateSelector.tsx` - Dropdown to select template
- `/client/src/components/templates/SaveTemplateDialog.tsx` - Save current form as template
- `/client/src/components/templates/ManageTemplatesDialog.tsx` - Edit/delete templates

**Features:**
- Quick "Use Last Session" button (auto-fills previous session's players)
- Template dropdown at top of DataEntry page
- "Save as template" button in SessionForm
- Manage templates in Settings page

### Acceptance Criteria
- [ ] Can create session template with name, location, time, players
- [ ] Can select template from dropdown in DataEntry
- [ ] Template auto-fills form fields (players get default buy-ins)
- [ ] "Use Last Session" button copies previous session structure
- [ ] Can edit/delete templates from Settings page
- [ ] Templates saved per group
- [ ] Mobile-friendly template selector

---

## Feature 4: Live Session Tracking 🔥

**Priority:** CRITICAL
**Estimated Time:** 6 hours
**Status:** PENDING

### Problem
- Current flow requires entering all data at once (after game ends)
- Hard to track rebuys during active game
- Players want to know standings during game
- Settlement confusion - who owes whom?

### Solution: 3-Phase Live Session Flow
1. **Start Session** - Set initial players and buy-ins
2. **Track Live** - Add rebuys, track running time, see standings
3. **End Session** - Enter cash-outs, auto-calculate settlements

---

### Implementation Plan

#### Step 1: Database Schema Updates (30 min)
**File:** `/server/prisma/schema.prisma`

**Changes:**
```prisma
model Session {
  // ... existing fields ...
  status    String   @default("COMPLETED") // "IN_PROGRESS" | "COMPLETED"

  // Add settlements field to store who owes whom
  settlements String?  // JSON array: [{ from, to, amount }]
}

// No changes to SessionEntry needed!
// buyIn can be updated incrementally for rebuys
```

**Migration:**
```bash
npx prisma migrate dev --name add_session_status_and_settlements
```

#### Step 2: Settlement Algorithm (1 hour)
**File:** `/server/src/services/settlementService.ts` (new)

**Algorithm: Minimize Transaction Count**
```typescript
interface Settlement {
  from: string;      // Player name
  to: string;        // Player name
  amount: number;    // Amount to transfer
}

export function calculateSettlements(entries: SessionEntry[]): Settlement[] {
  // 1. Calculate each player's net balance
  const balances = entries.map(entry => ({
    playerId: entry.playerId,
    playerName: entry.player.name,
    balance: entry.cashOut - entry.buyIn
  }));

  // 2. Separate debtors (negative) and creditors (positive)
  const debtors = balances
    .filter(b => b.balance < 0)
    .map(b => ({ ...b, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance); // Largest debts first

  const creditors = balances
    .filter(b => b.balance > 0)
    .sort((a, b) => b.balance - a.balance); // Largest credits first

  // 3. Greedy matching algorithm
  const settlements: Settlement[] = [];
  let i = 0; // Debtor index
  let j = 0; // Creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.balance, creditor.balance);

    settlements.push({
      from: debtor.playerName,
      to: creditor.playerName,
      amount: parseFloat(amount.toFixed(2))
    });

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance === 0) i++;
    if (creditor.balance === 0) j++;
  }

  return settlements;
}

// Validation: Ensure zero-sum (total settlements = 0)
export function validateSettlements(settlements: Settlement[]): boolean {
  const total = settlements.reduce((sum, s) => sum + s.amount, 0);
  return Math.abs(total) < 0.01; // Allow for floating-point errors
}
```

#### Step 3: Backend API Endpoints (1.5 hours)
**File:** `/server/src/routes/liveSessions.ts` (new)

**Endpoints:**
```typescript
// 1. Start a live session
POST /api/sessions/live/start
Body: {
  groupId: string;
  date: string;
  startTime: string;
  location?: string;
  players: Array<{ playerId: string; buyIn: number }>;
}
Returns: Session with status: "IN_PROGRESS"

// 2. Add rebuy to existing player
POST /api/sessions/live/:sessionId/rebuy
Body: { playerId: string; amount: number }
Returns: Updated SessionEntry (buyIn += amount)
Validation: Session must be IN_PROGRESS

// 3. Add new player mid-game
POST /api/sessions/live/:sessionId/add-player
Body: { playerId: string; buyIn: number }
Returns: New SessionEntry
Validation: Session must be IN_PROGRESS, player not already in session

// 4. Get live session status (standings)
GET /api/sessions/live/:sessionId
Returns: {
  session: Session,
  entries: SessionEntry[],
  standings: Array<{
    playerId: string,
    playerName: string,
    totalBuyIn: number,
    currentStanding: "up" | "down" | "even", // Based on avg
  }>,
  duration: number // Minutes elapsed
}

// 5. End session and calculate settlements
POST /api/sessions/live/:sessionId/end
Body: {
  endTime: string;
  cashOuts: Array<{ playerId: string; cashOut: number }>;
}
Returns: {
  session: Session (status: "COMPLETED"),
  settlements: Settlement[]
}
Validation: All players must have cash-out values

// 6. Reopen session for editing (with validation)
POST /api/sessions/live/:sessionId/reopen
Body: { reason: string }
Returns: Session with status: "IN_PROGRESS"
Validation: Can only reopen sessions completed < 24 hours ago
```

**Controllers & Services:**
- `/server/src/controllers/liveSessionController.ts` (new)
- `/server/src/services/liveSessionService.ts` (new)

#### Step 4: Frontend - Start Live Session (1 hour)
**File:** `/client/src/pages/LiveSessionStart.tsx` (new)

**UI Structure:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Start Live Session</CardTitle>
    <CardDescription>Begin tracking a poker game in real-time</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Session Details */}
    <div className="space-y-4">
      <Input label="Date" type="date" defaultValue={today} />
      <Input label="Start Time" type="time" defaultValue={now} />
      <Input label="Location" placeholder="John's House" />
    </div>

    {/* Initial Players */}
    <div className="mt-6">
      <h3>Initial Players</h3>
      {players.map(p => (
        <div key={p.id} className="flex items-center gap-4">
          <Checkbox checked={selectedPlayers.includes(p.id)} />
          <span>{p.name}</span>
          <Input
            type="number"
            placeholder="Buy-in"
            defaultValue={defaultBuyIn}
          />
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex gap-4 mt-6">
      <Button onClick={handleStartSession}>Start Session</Button>
      <Button variant="outline" onClick={() => navigate('/data-entry')}>
        Use Traditional Entry
      </Button>
    </div>
  </CardContent>
</Card>
```

**Features:**
- Checkbox list of all players in group
- Initial buy-in input for each selected player
- Validates at least 2 players selected
- Redirects to LiveSessionView on success

#### Step 5: Frontend - Live Session View (1.5 hours)
**File:** `/client/src/pages/LiveSessionView.tsx` (new)

**UI Structure:**
```typescript
<div className="space-y-6">
  {/* Header with timer */}
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <div>
          <CardTitle>Live Session</CardTitle>
          <CardDescription>{session.location || 'No location'}</CardDescription>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono">{formatDuration(elapsed)}</div>
          <div className="text-sm text-muted-foreground">
            Started at {session.startTime}
          </div>
        </div>
      </div>
    </CardHeader>
  </Card>

  {/* Current Standings Table */}
  <Card>
    <CardHeader>
      <CardTitle>Current Standings</CardTitle>
      <CardDescription>Total buy-ins tracked so far</CardDescription>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Total Buy-In</TableHead>
            <TableHead className="text-right">Rebuys</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(entry => (
            <TableRow key={entry.id}>
              <TableCell>{entry.player.name}</TableCell>
              <TableCell className="text-right">
                ${entry.buyIn.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                {calculateRebuys(entry.buyIn, defaultBuyIn)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>

  {/* Quick Actions */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Button
      size="lg"
      onClick={() => setShowRebuyDialog(true)}
      className="h-20"
    >
      <Plus className="mr-2 h-5 w-5" />
      Add Rebuy
    </Button>

    <Button
      size="lg"
      variant="outline"
      onClick={() => setShowAddPlayerDialog(true)}
      className="h-20"
    >
      <UserPlus className="mr-2 h-5 w-5" />
      Add Player
    </Button>

    <Button
      size="lg"
      variant="destructive"
      onClick={() => setShowEndDialog(true)}
      className="h-20"
    >
      <StopCircle className="mr-2 h-5 w-5" />
      End Session
    </Button>
  </div>

  {/* Dialogs */}
  <RebuyDialog
    isOpen={showRebuyDialog}
    onClose={() => setShowRebuyDialog(false)}
    players={entries.map(e => e.player)}
    onSubmit={handleAddRebuy}
  />

  <AddPlayerDialog
    isOpen={showAddPlayerDialog}
    onClose={() => setShowAddPlayerDialog(false)}
    availablePlayers={playersNotInSession}
    onSubmit={handleAddPlayer}
  />

  <EndSessionDialog
    isOpen={showEndDialog}
    onClose={() => setShowEndDialog(false)}
    entries={entries}
    onSubmit={handleEndSession}
  />
</div>
```

**Features:**
- Real-time elapsed timer (updates every second)
- Table showing all players and their current total buy-ins
- Calculate rebuys: `(totalBuyIn - defaultBuyIn) / defaultBuyIn`
- Large touch-friendly buttons for mobile
- Three dialogs: Rebuy, Add Player, End Session

**New Components:**
- `/client/src/components/live/RebuyDialog.tsx`
- `/client/src/components/live/AddPlayerDialog.tsx`
- `/client/src/components/live/EndSessionDialog.tsx`
- `/client/src/components/live/SessionTimer.tsx`

#### Step 6: Frontend - Settlement Display (1 hour)
**File:** `/client/src/pages/SettlementView.tsx` (new)

**UI Structure:**
```typescript
<div className="space-y-6">
  {/* Session Summary */}
  <Card>
    <CardHeader>
      <CardTitle>Session Complete!</CardTitle>
      <CardDescription>
        {session.location} • {formatDuration(duration)}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{entries.length}</div>
          <div className="text-sm text-muted-foreground">Players</div>
        </div>
        <div>
          <div className="text-2xl font-bold">
            ${totalPot.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">Total Pot</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{settlements.length}</div>
          <div className="text-sm text-muted-foreground">Transactions</div>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Final Results Table */}
  <Card>
    <CardHeader>
      <CardTitle>Final Results</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Buy-In</TableHead>
            <TableHead className="text-right">Cash-Out</TableHead>
            <TableHead className="text-right">Profit/Loss</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(entry => {
            const profit = entry.cashOut - entry.buyIn;
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {entry.player.name}
                </TableCell>
                <TableCell className="text-right">
                  ${entry.buyIn.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ${entry.cashOut.toFixed(2)}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-bold",
                  profit > 0 && "text-green-600",
                  profit < 0 && "text-red-600"
                )}>
                  {profit > 0 && "+"}{profit.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableTable>
    </CardContent>
  </Card>

  {/* Settlement Instructions */}
  <Card className="border-primary">
    <CardHeader>
      <CardTitle>💰 Settlement Instructions</CardTitle>
      <CardDescription>
        Optimal payment structure (minimized transactions)
      </CardDescription>
    </CardHeader>
    <CardContent>
      {settlements.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Perfect! Everyone broke even. No payments needed. 🎉
        </p>
      ) : (
        <div className="space-y-4">
          {settlements.map((settlement, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="font-bold text-lg">{settlement.from}</div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="font-bold text-lg">{settlement.to}</div>
              </div>
              <div className="text-2xl font-bold text-primary">
                ${settlement.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation badge */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>Zero-sum validated ✓</span>
      </div>
    </CardContent>
  </Card>

  {/* Actions */}
  <div className="flex gap-4">
    <Button onClick={() => navigate('/sessions')} className="flex-1">
      View All Sessions
    </Button>
    <Button
      variant="outline"
      onClick={() => navigate('/data-entry')}
      className="flex-1"
    >
      Start New Session
    </Button>
  </div>
</div>
```

**Features:**
- Clean summary of session results
- Prominent settlement instructions with visual arrows
- Color-coded profit/loss
- Zero-sum validation badge
- Mobile-optimized layout

#### Step 7: Navigation Updates (30 min)
**Files to modify:**
- `/client/src/pages/DataEntry.tsx` - Add "Start Live Session" option
- `/client/src/components/layout/NavBar.tsx` - Update routing
- `/client/src/App.tsx` - Add new routes

**New routes:**
```typescript
<Route path="/live/start" element={<LiveSessionStart />} />
<Route path="/live/:sessionId" element={<LiveSessionView />} />
<Route path="/live/:sessionId/settlement" element={<SettlementView />} />
```

**DataEntry page update:**
```typescript
// Add toggle at top
<Tabs defaultValue="traditional">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="traditional">Traditional Entry</TabsTrigger>
    <TabsTrigger value="live">Live Session</TabsTrigger>
  </TabsList>
  <TabsContent value="traditional">
    <SessionForm ... />
  </TabsContent>
  <TabsContent value="live">
    <Button onClick={() => navigate('/live/start')}>
      Start Live Session
    </Button>
  </TabsContent>
</Tabs>
```

### Acceptance Criteria
- [ ] Can start a live session with initial players and buy-ins
- [ ] Live session view shows elapsed time (updates every second)
- [ ] Can add rebuy to existing player (updates total buy-in)
- [ ] Can add new player mid-game
- [ ] Can end session and enter all cash-outs
- [ ] Settlement calculator minimizes number of transactions
- [ ] Settlement display is clear and easy to read
- [ ] Zero-sum validation works (total in = total out)
- [ ] Can reopen recently completed session for editing (< 24h)
- [ ] Live session status persists (can reload page without losing data)
- [ ] Mobile-optimized UI (large touch targets)
- [ ] Can still use traditional entry method
- [ ] Settlements saved with session for future reference

---

## Feature 5: Advanced Filters & Search ⏳

**Priority:** HIGH
**Estimated Time:** 3 hours
**Status:** PENDING

### Problem
- Can't search sessions by player, location, or notes
- No date range filtering
- Can't filter players by win rate or games played
- Hard to find specific sessions as data grows

### Implementation Plan

#### Step 1: Backend - Search API (1 hour)
**File:** `/server/src/routes/search.ts` (new)

**Endpoints:**
```typescript
GET /api/search/sessions
Query params:
  - groupId: string (required)
  - dateFrom: string (ISO date)
  - dateTo: string (ISO date)
  - location: string (partial match)
  - playerIds: string[] (sessions with these players)
  - minPot: number
  - maxPot: number
  - notes: string (full-text search)
  - sortBy: 'date' | 'pot' | 'profit'
  - sortOrder: 'asc' | 'desc'

GET /api/search/players
Query params:
  - groupId: string (required)
  - name: string (partial match)
  - minWinRate: number (0-100)
  - maxWinRate: number (0-100)
  - minGames: number
  - minBalance: number
  - maxBalance: number
  - isActive: boolean
```

**Services:**
- `/server/src/services/searchService.ts` (new)

**Features:**
- Use Prisma `where` clauses for filtering
- Support multiple filters simultaneously
- Return paginated results (limit/offset)

#### Step 2: Frontend - Search UI (1.5 hours)
**Files to modify:**
- `/client/src/pages/Sessions.tsx` - Add filter panel
- `/client/src/pages/Players.tsx` - Add filter panel

**New components:**
- `/client/src/components/filters/SessionFilters.tsx`
- `/client/src/components/filters/PlayerFilters.tsx`
- `/client/src/components/filters/DateRangePicker.tsx`

**SessionFilters UI:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Filter Sessions</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Date Range */}
    <DateRangePicker
      from={filters.dateFrom}
      to={filters.dateTo}
      onChange={handleDateChange}
    />

    {/* Location Search */}
    <Input
      placeholder="Search by location..."
      value={filters.location}
      onChange={e => setFilters({ ...filters, location: e.target.value })}
    />

    {/* Player Filter (multi-select) */}
    <MultiSelect
      label="Players in session"
      options={players}
      value={filters.playerIds}
      onChange={ids => setFilters({ ...filters, playerIds: ids })}
    />

    {/* Pot Range */}
    <div className="grid grid-cols-2 gap-4">
      <Input
        type="number"
        placeholder="Min pot"
        value={filters.minPot}
        onChange={e => setFilters({ ...filters, minPot: parseFloat(e.target.value) })}
      />
      <Input
        type="number"
        placeholder="Max pot"
        value={filters.maxPot}
        onChange={e => setFilters({ ...filters, maxPot: parseFloat(e.target.value) })}
      />
    </div>

    {/* Notes Search */}
    <Input
      placeholder="Search notes..."
      value={filters.notes}
      onChange={e => setFilters({ ...filters, notes: e.target.value })}
    />

    {/* Sort Options */}
    <Select value={filters.sortBy} onValueChange={v => setFilters({ ...filters, sortBy: v })}>
      <SelectItem value="date">Sort by Date</SelectItem>
      <SelectItem value="pot">Sort by Pot Size</SelectItem>
      <SelectItem value="profit">Sort by Your Profit</SelectItem>
    </Select>

    {/* Actions */}
    <div className="flex gap-2">
      <Button onClick={handleApplyFilters} className="flex-1">
        Apply Filters
      </Button>
      <Button variant="outline" onClick={handleClearFilters}>
        Clear
      </Button>
    </div>

    {/* Save Preset */}
    <Button variant="ghost" size="sm" onClick={handleSavePreset}>
      💾 Save as Preset
    </Button>
  </CardContent>
</Card>
```

**PlayerFilters UI:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Filter Players</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Name Search */}
    <Input
      placeholder="Search by name..."
      value={filters.name}
      onChange={e => setFilters({ ...filters, name: e.target.value })}
    />

    {/* Win Rate Range */}
    <div>
      <Label>Win Rate: {filters.minWinRate}% - {filters.maxWinRate}%</Label>
      <DualRangeSlider
        min={0}
        max={100}
        value={[filters.minWinRate, filters.maxWinRate]}
        onChange={([min, max]) => setFilters({
          ...filters,
          minWinRate: min,
          maxWinRate: max
        })}
      />
    </div>

    {/* Min Games */}
    <div>
      <Label>Minimum Games Played</Label>
      <Input
        type="number"
        value={filters.minGames}
        onChange={e => setFilters({ ...filters, minGames: parseInt(e.target.value) })}
      />
    </div>

    {/* Balance Range */}
    <div className="grid grid-cols-2 gap-4">
      <Input
        type="number"
        placeholder="Min balance"
        value={filters.minBalance}
        onChange={e => setFilters({ ...filters, minBalance: parseFloat(e.target.value) })}
      />
      <Input
        type="number"
        placeholder="Max balance"
        value={filters.maxBalance}
        onChange={e => setFilters({ ...filters, maxBalance: parseFloat(e.target.value) })}
      />
    </div>

    {/* Active Status */}
    <div className="flex items-center gap-2">
      <Checkbox
        id="active-only"
        checked={filters.activeOnly}
        onCheckedChange={v => setFilters({ ...filters, activeOnly: v })}
      />
      <Label htmlFor="active-only">Active players only</Label>
    </div>

    {/* Actions */}
    <div className="flex gap-2">
      <Button onClick={handleApplyFilters} className="flex-1">
        Apply Filters
      </Button>
      <Button variant="outline" onClick={handleClearFilters}>
        Clear
      </Button>
    </div>
  </CardContent>
</Card>
```

#### Step 3: Filter Presets (30 min)
**Feature:** Save common filter combinations

**Storage:** localStorage
```typescript
interface FilterPreset {
  id: string;
  name: string;
  filters: SessionFilters | PlayerFilters;
  createdAt: string;
}

// Save preset
const savePreset = (name: string, filters: any) => {
  const presets = getPresets();
  presets.push({
    id: Date.now().toString(),
    name,
    filters,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('filter-presets', JSON.stringify(presets));
};

// Load preset
const loadPreset = (id: string) => {
  const presets = getPresets();
  const preset = presets.find(p => p.id === id);
  if (preset) {
    setFilters(preset.filters);
  }
};
```

**UI:**
- Dropdown of saved presets at top of filter panel
- "Save current filters as preset" button
- Manage presets dialog (rename/delete)

### Acceptance Criteria
- [ ] Can filter sessions by date range
- [ ] Can search sessions by location (partial match)
- [ ] Can filter sessions by participating players
- [ ] Can filter sessions by pot size range
- [ ] Can search session notes (full-text)
- [ ] Can filter players by name
- [ ] Can filter players by win rate range
- [ ] Can filter players by minimum games played
- [ ] Can filter players by balance range
- [ ] Can save filter combinations as presets
- [ ] Can load saved presets
- [ ] Filters persist across page refreshes (localStorage)
- [ ] Clear all filters button works
- [ ] Results update in real-time as filters change (debounced)

---

## 🔄 IMPLEMENTATION ORDER

**Recommended sequence:**

### Week 1: Core Features (8-9 hours)
1. **Day 1 (4 hours):**
   - Morning: Feature 1 - Settings & Preferences (2h)
   - Afternoon: Feature 4 - Live Session (Part 1: Backend) (2h)

2. **Day 2 (4-5 hours):**
   - Morning: Feature 4 - Live Session (Part 2: Frontend) (4h)
   - Afternoon: Testing & fixes (1h)

### Week 2: Enhancements (7 hours)
3. **Day 3 (3 hours):**
   - Morning: Feature 2 - Session History & Trends (3h)

4. **Day 4 (4 hours):**
   - Morning: Feature 3 - Session Templates (2h)
   - Afternoon: Feature 5 - Advanced Filters (2h)

5. **Day 5 (1 hour):**
   - Final testing, bug fixes, polish

---

## 🧪 TESTING CHECKLIST

### Live Session Testing
- [ ] Start session with 3+ players
- [ ] Add rebuy to player mid-session
- [ ] Add new player mid-session
- [ ] End session with all cash-outs
- [ ] Verify settlement calculator accuracy
- [ ] Test zero-sum validation
- [ ] Test with one winner, all losers
- [ ] Test with multiple winners/losers
- [ ] Test reopen session (< 24h)
- [ ] Test rejection of reopen (> 24h)
- [ ] Verify settlements minimize transaction count
- [ ] Test timer updates correctly
- [ ] Test page reload during live session (data persists)

### Settings Testing
- [ ] Edit group name
- [ ] Edit default buy-in
- [ ] Edit currency
- [ ] Delete group (with confirmation)
- [ ] Backup database (download JSON)
- [ ] Restore from backup
- [ ] Test invalid backup file rejection
- [ ] Verify preferences save to localStorage

### Trends Testing
- [ ] Profit trend chart renders correctly
- [ ] Streak indicators show current hot/cold streaks
- [ ] Monthly aggregates calculate correctly
- [ ] Time-based stats (weekend vs weekday) accurate
- [ ] History timeline shows all sessions
- [ ] Can group sessions by month/year

### Templates Testing
- [ ] Create session template
- [ ] Use template to start session
- [ ] "Use Last Session" copies previous structure
- [ ] Edit template
- [ ] Delete template
- [ ] Template scoped to correct group

### Filters Testing
- [ ] Date range filter works
- [ ] Location search (partial match) works
- [ ] Player filter (multi-select) works
- [ ] Pot range filter works
- [ ] Notes search works
- [ ] Player name search works
- [ ] Win rate range filter works
- [ ] Min games filter works
- [ ] Balance range filter works
- [ ] Save filter preset works
- [ ] Load filter preset works
- [ ] Clear filters works
- [ ] Filters persist across page refresh

### Mobile Testing
- [ ] Live session view usable on mobile (large buttons)
- [ ] Settlement view readable on mobile
- [ ] Filter panels work on mobile (collapsible?)
- [ ] All forms work on mobile

---

## 📝 DEPLOYMENT NOTES

**Database Migrations:**
```bash
cd server

# Add session status field
npx prisma migrate dev --name add_session_status_and_settlements

# Add session templates
npx prisma migrate dev --name add_session_templates

# Deploy to production
npx prisma migrate deploy
```

**Breaking Changes:**
- None - all features are additive

**New Dependencies:**
- None (using existing libraries)

**Environment Variables:**
- None required

**Post-Deployment Verification:**
1. Test live session flow end-to-end
2. Verify settlement calculations
3. Test backup/restore functionality
4. Verify all filters work
5. Check mobile responsiveness

---

## 🚨 ROLLBACK PLAN

If critical issues arise:

**Step 1:** Revert migrations
```bash
npx prisma migrate reset
# Restore from backup
```

**Step 2:** Rollback code
```bash
git revert <commit-hash>
git push
```

**Step 3:** Communicate with users
- Announce rollback
- Provide ETA for fix
- Offer manual workaround if possible

---

## 📈 SUCCESS METRICS

After deployment, track:
- % of sessions created via Live vs Traditional entry
- Average settlement calculation accuracy (should be 100%)
- Filter usage frequency
- Template creation rate
- Time saved per session (target: 30% faster with live)

---

## 🎯 FUTURE ENHANCEMENTS (Post-Phase 3)

**Not included in this phase, but good ideas for v2.0:**
- Photo upload and hosting (currently just URLs)
- PDF report generation
- Export improvements (Excel format)
- Smart notifications
- PWA (Progressive Web App) for offline use
- Real-time sync across devices (WebSockets)
- Tournament mode with brackets
- Hand history import

---

**Document Version:** 1.0
**Last Updated:** January 14, 2026
**Next Review:** After each feature completion

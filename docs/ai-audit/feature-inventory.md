# Feature Inventory

## Core Features

### 1. Session Management

| Feature | Status | Description |
|---------|--------|-------------|
| Create Session | Complete | Traditional entry with date, players, buy-ins, cash-outs |
| Edit Session | Complete | Modify session details and entries |
| Delete Session | Complete | Soft delete with 30-day recovery |
| Restore Session | Complete | Recover deleted sessions |
| Session Detail View | Complete | Full breakdown with stats, highlights, settlements |
| Session List | Complete | Filterable list with search |
| Session Filters | Complete | Location, date range, pot size filters |
| Clone Session | Complete | Copy existing session as template for quick entry |

### 2. Live Session Tracking

| Feature | Status | Description |
|---------|--------|-------------|
| Start Live Session | Complete | Initialize with players and buy-ins |
| Real-time Timer | Complete | Elapsed time display (HH:MM:SS) |
| Add Rebuy | Complete | Record rebuy during gameplay |
| Add Late Player | Complete | Add player mid-session |
| End Session | Complete | Enter cash-outs and calculate settlements |
| Reopen Session | Complete | Edit completed session within 24 hours |
| Settlement View | Complete | Post-game payment instructions |

### 3. Player Management

| Feature | Status | Description |
|---------|--------|-------------|
| Create Player | Complete | Add new player to group |
| Edit Player | Complete | Modify name, avatar |
| Delete Player | Complete | Remove player (cascades entries) |
| Toggle Active Status | Complete | Mark player active/inactive |
| Player List | Complete | Searchable, filterable list |
| Player Filters | Complete | Name, games, win rate, status |
| Player Detail View | Complete | Comprehensive stats page |

### 4. Statistics & Analytics

| Feature | Status | Description |
|---------|--------|-------------|
| Dashboard Stats | Complete | Overview cards and charts |
| Player Statistics | Complete | ROI, win rate, streaks, averages |
| Leaderboard | Complete | Sortable rankings table |
| Profit Trends | Complete | Line charts with period selector |
| Player Comparison | Complete | Bar chart comparing balances |
| Session Size Trends | Complete | Pot size over time |
| Recent Activity Feed | Complete | Timeline of recent sessions |
| Top Performances | Complete | Best/worst session highlights |

#### Statistics Computed

- **Balance:** Total profit/loss (cashOut - buyIn)
- **ROI:** Return on investment percentage
- **Win Rate:** Percentage of winning sessions
- **Average Profit:** Per-session average earnings
- **Average Buy-in:** Per-session average investment
- **Cash-out Rate:** Percentage of buy-in recovered
- **Rebuy Rate:** Average rebuys per session
- **Current Streak:** Consecutive W/L/BE
- **Longest Streaks:** Max consecutive W/L
- **Recent Form:** Last 5 games win rate
- **Best/Worst Session:** Max/min single profit

### 5. Group Management

| Feature | Status | Description |
|---------|--------|-------------|
| Create Group | Complete | New poker circle |
| Edit Group | Complete | Name, default buy-in, currency |
| Delete Group | Complete | Remove group (cascades all data) |
| Group Selection | Complete | Switch between groups |
| Group Settings | Complete | Configure defaults |

### 6. Session Templates

| Feature | Status | Description |
|---------|--------|-------------|
| Save Template | Complete | Store session configuration |
| Load Template | Complete | Quick-fill session form |
| Template List | Complete | View saved templates |

### 7. Data Import/Export

| Feature | Status | Description |
|---------|--------|-------------|
| CSV Export Sessions | Complete | Download session data |
| CSV Export Rankings | Complete | Download leaderboard |
| CSV Export Player Stats | Complete | Download individual stats |
| CSV Import Sessions | Complete | Bulk upload with column mapping |
| JSON Backup | Complete | Full database export |
| JSON Restore | Complete | Import backup (merge or replace) |

### 8. Role-Based Access

| Feature | Status | Description |
|---------|--------|-------------|
| VIEWER Mode | Complete | Read-only access |
| EDITOR Mode | Complete | Full CRUD operations |
| Role Toggle | Complete | Switch modes in settings |
| UI Restrictions | Complete | Hide/disable edit controls |

### 9. UI/UX Features

| Feature | Status | Description |
|---------|--------|-------------|
| Command Palette | Complete | Cmd/Ctrl+K navigation |
| Keyboard Shortcuts | Complete | G+key navigation |
| Loading Skeletons | Complete | Async loading states |
| Toast Notifications | Complete | Success/error feedback |
| Responsive Design | Complete | Mobile-friendly |
| Quick Entry Buttons | Complete | Common amount presets |
| Balance Indicator | Complete | Buy-in/cash-out validation |

## API Endpoints

### Groups API (`/api/groups`)
- `GET /` - List all groups
- `GET /:id` - Get group by ID
- `POST /` - Create group
- `PATCH /:id` - Update group
- `DELETE /:id` - Delete group

### Players API (`/api/players`)
- `GET /groups/:groupId/players` - List players in group
- `GET /groups/:groupId/players/search` - Search players
- `GET /:id` - Get player by ID
- `POST /` - Create player
- `PATCH /:id` - Update player
- `DELETE /:id` - Delete player

### Sessions API (`/api/sessions`)
- `GET /groups/:groupId/sessions` - List sessions
- `GET /:id` - Get session with entries
- `POST /` - Create session with entries
- `PATCH /:id` - Update session
- `DELETE /:id` - Soft delete session
- `PATCH /:id/restore` - Restore deleted session
- `POST /:sessionId/entries` - Add entry
- `PATCH /entries/:entryId` - Update entry
- `DELETE /entries/:entryId` - Delete entry

### Live Sessions API (`/api/live-sessions`)
- `POST /` - Start live session
- `GET /:id` - Get live session
- `POST /:id/rebuy` - Add rebuy
- `POST /:id/players` - Add player mid-session
- `PATCH /:id/end` - End session with cash-outs
- `PATCH /:id/reopen` - Reopen completed session

### Stats API (`/api/stats`)
- `GET /dashboard/:groupId` - Dashboard stats
- `GET /players/:playerId` - Player statistics
- `GET /leaderboard/:groupId` - Rankings
- `GET /trends/:groupId` - Profit trends
- `GET /sessions/:sessionId/summary` - Session summary

### Templates API (`/api/templates`)
- `GET /groups/:groupId` - List templates
- `POST /` - Create template
- `DELETE /:id` - Delete template

### Backup API (`/api/backup`)
- `GET /export/:groupId` - Export group data
- `POST /import` - Import backup data

### Health API
- `GET /api/health` - Health check

## Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| GroupSelection | `/groups` | Select poker group |
| Dashboard | `/` | Overview with stats |
| DataEntry | `/entry` | Session entry mode selector |
| Sessions | `/sessions` | Session list with filters |
| SessionDetail | `/sessions/:id` | Full session breakdown |
| Players | `/players` | Player management |
| PlayerDetail | `/players/:id` | Individual player stats |
| Rankings | `/rankings` | Leaderboard table |
| Analytics | `/analytics` | Charts and trends |
| Settings | `/settings` | App configuration |
| LiveSessionStart | `/live/start` | Initialize live tracking |
| LiveSessionView | `/live/:sessionId` | Active session tracking |
| SettlementView | `/live/:sessionId/settlement` | Post-game settlements |

## React Query Hooks

| Hook | Purpose |
|------|---------|
| `useGroups` | Group CRUD operations |
| `usePlayers` | Player queries and mutations |
| `useSessions` | Session queries and mutations |
| `useStats` | Statistics queries |
| `useLiveSessions` | Live session mutations |
| `useTemplates` | Template management |
| `useSessionSummary` | Session summary queries |
| `useKeyboardShortcuts` | Keyboard navigation |

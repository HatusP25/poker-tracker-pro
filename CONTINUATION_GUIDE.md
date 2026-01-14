# Continuation Guide for Poker Tracker Pro Development

This guide provides instructions for continuing development of Poker Tracker Pro in future sessions.

## Quick Start for New Sessions

1. **Read the Project State**
   ```
   Read PROJECT_STATE.md to understand:
   - What has been completed (Milestones 1-10)
   - What remains (Milestones 11-12)
   - File locations and architecture
   - Implementation patterns to follow
   ```

2. **Start the Development Servers**
   ```bash
   # Switch to Node 20.17.0 first
   source ~/.nvm/nvm.sh && nvm use 20.17.0

   # Install dependencies if needed
   npm install
   cd client && npm install && cd ..

   # Start both servers (from root directory)
   npm run dev
   ```
   - Backend will run on `http://localhost:3001`
   - Frontend will run on `http://localhost:5174` (note: NOT 5173)

3. **If Port 3001 is Already in Use**
   ```bash
   lsof -ti:3001 | xargs kill -9
   npm run dev
   ```

## Priority Order for Remaining Work

### Phase 1: Milestone 11 - Keyboard Shortcuts & Polish (High Priority)
**Goal:** Improve UX with keyboard shortcuts and polish the UI

**Tasks:**
1. **Command Palette**
   - Install `cmdk` package: `npm install cmdk`
   - Create CommandPalette.tsx component
   - Add Cmd/Ctrl + K shortcut to open
   - Add all navigation and action commands

2. **Navigation Shortcuts**
   - G D → Dashboard
   - G E → Data Entry
   - G S → Sessions
   - G P → Players
   - G R → Rankings

3. **Action Shortcuts**
   - N S → New Session
   - N P → New Player

4. **Toast Notifications**
   - Add toast notifications for all CRUD actions
   - Show success/error messages
   - Auto-dismiss after 3 seconds

5. **Loading States**
   - Create skeleton components for cards, tables
   - Replace "Loading..." text with skeletons

6. **UI Polish**
   - Smooth transitions between pages
   - Hover states on all interactive elements
   - Focus states for keyboard navigation
   - Error boundaries for graceful error handling

**Files to Create:**
- `/client/src/components/CommandPalette.tsx`
- `/client/src/components/ui/skeleton.tsx`
- `/client/src/hooks/useKeyboardShortcuts.ts`
- `/client/src/components/ui/toast.tsx` (if not using sonner)

**Files to Modify:**
- `/client/src/components/layout/AppLayout.tsx` - Add CommandPalette
- All mutation hooks in `/client/src/hooks/*` - Add toast notifications
- All pages - Replace loading text with skeletons

### Phase 2: Milestone 12 - Testing & Documentation (Final Priority)
**Goal:** Ensure quality and provide comprehensive documentation

**Tasks:**
1. **Manual Testing**
   - Test all CRUD operations
   - Test all calculations (profit, ROI, win rate, streaks)
   - Test edge cases (no data, single player, negative balances)
   - Test group switching
   - Test navigation and routing
   - Test responsive design on different screen sizes

2. **Documentation**
   - Update `/README.md` with:
     - Features list with descriptions
     - Screenshots of main pages
     - Keyboard shortcuts reference
     - Installation instructions
     - Usage guide
   - Create `/DEVELOPMENT.md` with:
     - Architecture overview
     - Tech stack details
     - Project structure
     - Development workflow
     - API documentation
     - Database schema

3. **Testing Checklist**
   - Create comprehensive testing checklist
   - Document any bugs found
   - Fix critical bugs before completion

## Important Development Patterns to Follow

### Component Structure
```typescript
// Always use arrow functions
const ComponentName = () => {
  // Hooks at the top
  const { selectedGroup } = useGroupContext();
  const { data, isLoading } = useQuery(...);

  // Early returns for loading/error states
  if (isLoading) return <LoadingState />;
  if (!data) return <ErrorState />;

  // Main render
  return <div>...</div>;
};

export default ComponentName;
```

### React Query Hooks Pattern
```typescript
export const useEntity = (id: string) => {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: async () => {
      const response = await api.getEntity(id);
      return response.data;
    },
    enabled: !!id, // Only run if id exists
  });
};

export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.create(data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['entity'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};
```

### Form Validation with Zod
```typescript
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive'),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

### GroupContext Usage
```typescript
// Always check if group exists before rendering
const { selectedGroup } = useGroupContext();

if (!selectedGroup) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Please select a group first.</p>
    </div>
  );
}
```

### Color Coding
- **Positive values:** `text-green-500`
- **Negative values:** `text-red-500`
- **Neutral values:** `text-muted-foreground`
- **Win streaks:** `text-green-500`
- **Loss streaks:** `text-red-500`

### Navigation Pattern
```typescript
const navigate = useNavigate();

// For cards or clickable items
onClick={() => navigate(`/entity/${id}`)}

// For back buttons
onClick={() => navigate('/parent-route')}
```

## Critical Reminders

1. **Always read files before editing** - Never propose changes to code you haven't read

2. **GroupContext is required** - All pages except /groups must check for selectedGroup

3. **Auto-redirect is active** - AppLayout redirects to /groups if no group selected

4. **Cache invalidation** - Always invalidate relevant queries after mutations

5. **Dark mode by default** - Don't add light mode toggle, app is dark-only

6. **Node version** - Must use Node 20.17.0 for development

7. **Port numbers** - Backend: 3001, Frontend: 5174 (not 5173)

8. **No over-engineering** - Keep solutions simple, only add what's requested

9. **Arrow functions** - All components use arrow function syntax

10. **File references** - Use markdown link syntax: `[filename.ts](path/to/file.ts)`

## Known Issues to Be Aware Of

1. **Port conflicts** - Port 3001 may be in use, kill process before starting
2. **Node version** - Must activate nvm before npm commands
3. **Query invalidation** - Some stats might not update without page refresh (check invalidation)
4. **Date validation** - Session dates cannot be in the future
5. **Player duplicates** - Form prevents adding same player twice to a session

## Testing New Features

When adding new features:

1. **Start servers** - Ensure both frontend and backend are running
2. **Test happy path** - Verify basic functionality works
3. **Test edge cases** - Empty states, no data, invalid data
4. **Test error handling** - Network errors, validation errors
5. **Test UI states** - Loading, error, success
6. **Test calculations** - Verify all math is correct
7. **Check console** - No errors or warnings in browser console
8. **Keep servers running** - Don't stop servers between features

## Success Criteria

The project is complete when:

- ✅ All 12 milestones are implemented
- ✅ All features work without errors
- ✅ All calculations are accurate
- ✅ UI is polished and responsive
- ✅ Documentation is complete
- ✅ Manual testing checklist is passed
- ✅ No console errors or warnings
- ✅ CSV import/export working for sessions and players
- ✅ Analytics charts displaying data correctly
- ✅ Keyboard shortcuts functional
- ✅ Toast notifications on all actions
- ✅ Loading skeletons on all pages

## Starting a New Session

When beginning a new session, say:

> "I'm continuing work on Poker Tracker Pro. Let me read PROJECT_STATE.md to understand the current state."

Then proceed with:
1. Reading PROJECT_STATE.md
2. Starting development servers
3. Continuing with the next incomplete milestone
4. Keeping servers running throughout the session
5. Testing features as they're built

## Questions to Ask When Unclear

If requirements are unclear:
- "Which milestone should I prioritize: 10, 11, or 12?"
- "What chart library should I use for analytics?"
- "Should keyboard shortcuts be configurable or fixed?"
- "What analytics metrics are most important?"

If errors occur:
- Check console for error messages
- Verify both servers are running
- Check Node version (must be 20.17.0)
- Read the file before attempting to fix
- Kill port 3001 if needed

---

**Last Updated:** 2026-01-09
**Current Phase:** Milestone 10 Complete (10/12 milestones)
**Next Phase:** Milestone 11 - Keyboard Shortcuts & Polish
**Project Completion:** 83%

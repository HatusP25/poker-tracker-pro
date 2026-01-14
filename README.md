# 🃏 Poker Tracker Pro

A comprehensive poker session tracking and analytics application built with modern web technologies. Track your poker games, analyze performance, and gain insights into your playing patterns.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.17.0-brightgreen.svg)

---

## ✨ Features

### Core Functionality
- **Group Management**: Create and manage multiple poker groups with custom settings
- **Player Tracking**: Add players, track their stats, and manage active/inactive status
- **Session Recording**: Log detailed poker sessions with buy-ins, cash-outs, and notes
- **Photo Documentation**: Attach photo URLs to sessions for reference
- **Comprehensive Statistics**: Deep analytics on player performance and group trends

### Analytics & Insights
- **Advanced Metrics**:
  - ROI (Return on Investment)
  - Win Rate & Recent Form (last 5 games)
  - Cash-Out Rate & Rebuy Rate
  - Best/Worst/Average Session Performance
  - Current Win/Loss Streaks
  - Net Group Profit & Average Session Size

- **7 Interactive Charts**:
  1. Profit Over Time (Line Chart)
  2. Win Rate Trend (Line Chart)
  3. Session Performance (Bar Chart)
  4. Player Comparison (Radar Chart)
  5. Buy-In Distribution (Pie Chart)
  6. ROI Distribution (Bar Chart)
  7. Session Duration Analysis (Scatter Chart)

### Data Management
- **CSV Export**: Export sessions and player data to CSV
- **CSV Import**: Bulk import sessions from CSV files
- **Data Persistence**: SQLite database with Prisma ORM

### User Experience
- **Dark Mode**: Beautiful dark theme UI with shadcn/ui components
- **Keyboard Shortcuts**: Vim-style navigation and command palette
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Toast Notifications**: Real-time feedback on all operations
- **Loading Skeletons**: Professional loading states
- **Smart Sorting**: Multi-column sorting on leaderboards

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 20.17.0 or higher
- **npm**: 6.14.18 or higher

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd pokerapp
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up the database**
```bash
cd server
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # Optional: Load sample data
cd ..
```

4. **Start the development servers**
```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:5173 (Vite)
- **Backend**: http://localhost:3001 (Express + tsx)

5. **Open your browser**
Navigate to http://localhost:5173

---

## 📖 Usage Guide

### Getting Started

1. **Create a Group**
   - Click "New Group" or press `N + P`
   - Enter group name, default buy-in, and currency
   - Select your group to start tracking

2. **Add Players**
   - Navigate to Players page (`G + P`)
   - Click "Add Player"
   - Enter player name and optional avatar URL

3. **Record a Session**
   - Go to Data Entry (`G + E` or `N + S`)
   - Select session date and optional time
   - Add location and notes
   - Enter each player's buy-in and cash-out
   - Submit to save

4. **View Analytics**
   - Dashboard (`G + D`): Overview and recent sessions
   - Rankings (`G + R`): Leaderboard with sortable columns
   - Analytics (`G + A`): 7 interactive charts
   - Player Details: Click any player card for deep stats

---

## ⌨️ Keyboard Shortcuts

### Command Palette
- **Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux): Open command palette
- Type to search and navigate to any page

### Navigation Shortcuts (G + letter)
Press `G` followed by:
- `D`: Dashboard
- `E`: Data Entry
- `S`: Sessions
- `P`: Players
- `R`: Rankings
- `A`: Analytics
- `G`: Groups

### Action Shortcuts (N + letter)
Press `N` followed by:
- `S`: New Session
- `P`: New Player

**Note**: Shortcuts don't trigger while typing in input fields.

---

## 📊 Statistics Explained

### Player Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **Balance** | Total Cash-Out - Total Buy-In | Net profit/loss |
| **ROI** | (Balance / Total Buy-In) × 100 | Return on investment percentage |
| **Win Rate** | (Wins / Total Games) × 100 | Percentage of winning sessions |
| **Recent Form** | Wins in last 5 games / 5 × 100 | Short-term performance |
| **Cash-Out Rate** | (Total Cash-Out / Total Buy-In) × 100 | Capital efficiency |
| **Avg Buy-In** | Total Buy-In / Total Games | Average entry cost |
| **Rebuy Rate** | (Total Rebuys / Total Games) × 100 | Frequency of rebuying |
| **Best Session** | Max profit from any session | Biggest win |
| **Worst Session** | Min profit from any session | Biggest loss |
| **Avg Session** | Total Profit / Total Games | Average profit per game |

### Group Metrics

| Metric | Description |
|--------|-------------|
| **Total Sessions** | Number of poker games played |
| **Active Players** | Players marked as active |
| **Net Group Profit** | Sum of all player balances (zero-sum check) |
| **Avg Session Size** | Average total pot per session |

---

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast HMR
- **React Router v7** for navigation
- **TanStack Query** (React Query) for data fetching
- **shadcn/ui** component library
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **cmdk** for command palette
- **sonner** for toast notifications

### Backend
- **Node.js** 20.17.0
- **Express.js** with TypeScript
- **Prisma ORM** with SQLite
- **tsx** for TypeScript execution with hot reload

### Development Tools
- **Concurrently**: Run multiple dev servers
- **TypeScript**: Type safety throughout
- **ESLint**: Code linting
- **Prisma Studio**: Database GUI (`npx prisma studio`)

---

## 📁 Project Structure

```
pokerapp/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── layout/     # Navigation, layout components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── skeletons/  # Loading skeletons
│   │   │   └── CommandPalette.tsx
│   │   ├── pages/          # Route pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DataEntry.tsx
│   │   │   ├── Sessions.tsx
│   │   │   ├── Players.tsx
│   │   │   ├── Rankings.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── PlayerDetail.tsx
│   │   │   └── SessionDetail.tsx
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities, API client
│   │   ├── context/        # React context providers
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # Backend Express application
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   │   └── statsService.ts  # Statistics calculations
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   ├── migrations/     # Database migrations
│   │   ├── seed.ts         # Sample data
│   │   └── data/           # SQLite database file
│   ├── package.json
│   └── tsconfig.json
│
├── package.json            # Root package (runs both)
├── README.md               # This file
├── DEVELOPMENT.md          # Developer documentation
├── TESTING.md              # Testing checklist
└── TEST_RESULTS.md         # Test execution results
```

---

## 🛠️ Available Scripts

### Root Directory
- `npm run dev`: Start both frontend and backend concurrently
- `npm run dev:client`: Start only frontend (Vite)
- `npm run dev:server`: Start only backend (Express + tsx)

### Frontend (`/client`)
- `npm run dev`: Start Vite dev server
- `npm run build`: Build for production
- `npm run preview`: Preview production build

### Backend (`/server`)
- `npm run dev`: Start Express server with hot reload
- `npm run build`: Compile TypeScript
- `npm start`: Run compiled JavaScript
- `npx prisma studio`: Open database GUI
- `npx prisma db seed`: Seed database with sample data

---

## 🗄️ Database Schema

### Tables
- **Group**: Poker groups with settings
- **Player**: Players within groups
- **Session**: Poker game sessions
- **Entry**: Player participation in sessions (buy-in/cash-out)
- **Note**: Session or player notes
- **Photo**: Session photos (URLs)

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed schema documentation.

---

## 📤 CSV Import/Export

### Export Sessions
1. Navigate to Sessions page
2. Click "Export CSV"
3. File downloads with columns: Date, Location, Total Pot, Players, Winner, Notes

### Export Players
1. Navigate to Players page
2. Click "Export CSV"
3. File downloads with columns: Name, Balance, Games, Win Rate, ROI

### Import Sessions
1. Prepare CSV file with headers: `date,location,notes,player1,buyin1,cashout1,player2,buyin2,cashout2,...`
2. Click "Import CSV" on Sessions page
3. Select your CSV file
4. Sessions are validated and imported

**CSV Format Requirements**:
- Date format: YYYY-MM-DD
- Numbers: No currency symbols
- Players must exist in the group

---

## 🎨 Customization

### Theme
The app uses a dark theme by default. To customize colors, edit:
- [/client/src/index.css](./client/src/index.css): CSS variables for colors
- [/client/tailwind.config.js](./client/tailwind.config.js): Tailwind theme configuration

### Default Buy-In
Set per-group in Group settings. Used as suggestion in Data Entry.

### Currency
Set per-group (USD, EUR, GBP, etc.). Display only - calculations are numeric.

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3001 and 5173
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Database Issues
```bash
cd server
npx prisma migrate reset  # WARNING: Deletes all data
npx prisma migrate dev     # Create fresh database
npx prisma db seed         # Load sample data
```

### Node Version Issues
```bash
# Check version
node --version

# Use nvm to install correct version
nvm install 20.17.0
nvm use 20.17.0
```

### Clear React Query Cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or clear browser cache

---

## 🧪 Testing

Comprehensive testing was performed across:
- ✅ All CRUD operations
- ✅ Calculation accuracy verification
- ✅ Chart rendering (7 charts)
- ✅ CSV import/export
- ✅ Keyboard shortcuts
- ✅ Responsive design
- ✅ Console error checking
- ✅ Edge case handling

See [TEST_RESULTS.md](./TEST_RESULTS.md) for full test report.

---

## 🚀 Deployment

### Frontend (Vite)
```bash
cd client
npm run build
# Deploy the 'dist' folder to Vercel, Netlify, etc.
```

### Backend (Express)
```bash
cd server
npm run build
# Deploy to Heroku, Railway, Render, etc.
# Set DATABASE_URL environment variable for production DB
```

### Environment Variables
Create `.env` file in `/server`:
```env
DATABASE_URL="file:./prisma/data/poker.db"  # Dev
# DATABASE_URL="postgresql://..."           # Production
NODE_ENV=production
PORT=3001
```

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🤝 Contributing

This is a personal project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- **shadcn/ui**: Beautiful component library
- **Recharts**: Powerful charting library
- **Prisma**: Excellent ORM
- **TanStack Query**: Best data fetching for React
- **Vite**: Lightning-fast build tool

---

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for technical details
- Review [TEST_RESULTS.md](./TEST_RESULTS.md) for known limitations

---

## 🗺️ Roadmap

### Future Enhancements (v2.0+)
- [ ] Unit and E2E tests (Jest, Playwright)
- [ ] Real-time updates (WebSockets)
- [ ] Photo upload and hosting
- [ ] PDF report generation
- [ ] Multi-language support (i18n)
- [ ] PWA (Progressive Web App)
- [ ] Mobile app (React Native)
- [ ] Tournament tracking
- [ ] Hand history import
- [ ] Advanced statistics (VPIP, PFR, etc.)

---

**Built with ❤️ for poker players, by poker players.**

**Version**: 1.0.0
**Last Updated**: January 9, 2026
**Status**: Production Ready ✅

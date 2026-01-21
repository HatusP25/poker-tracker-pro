# 🚀 Complete Deployment Guide - Poker Tracker Pro to Railway

This guide will walk you through deploying your Poker Tracker Pro application to Railway, step by step. No prior deployment experience needed!

---

## 📋 What You'll Need

- ✅ GitHub account (you already have this)
- ✅ Your poker app code (already pushed to GitHub)
- ⏳ Railway account (we'll create this)
- ⏳ 30-45 minutes of time

---

## Part 1: Create Railway Account (5 minutes)

### Step 1: Go to Railway Website
1. Open your web browser
2. Go to: **https://railway.app**

### Step 2: Sign Up with GitHub
1. Click the **"Start a New Project"** or **"Login"** button (top right)
2. Click **"Login with GitHub"**
3. A popup will ask you to authorize Railway
4. Click **"Authorize Railway"**
5. You're now logged into Railway!

**What just happened?**
- Railway connected to your GitHub account
- This lets Railway automatically deploy from your repository
- No credit card needed for the free tier

---

## Part 2: Create New Railway Project (10 minutes)

### Step 3: Deploy from GitHub
1. You should see Railway's dashboard
2. Click **"New Project"** (big button in the center or top right)
3. Select **"Deploy from GitHub repo"**
4. You'll see a list of your repositories
5. Find and click **"poker-tracker-pro"** (or whatever you named your repo)
6. Railway will start analyzing your project

**What's happening?**
- Railway is scanning your repository
- It found the `Dockerfile` we created
- It knows how to build and deploy your app

### Step 4: Wait for Initial Setup
1. Railway creates a new project for you
2. You'll see a project with your service name
3. **Don't worry if build fails** - we need to add the database first!

---

## Part 3: Add PostgreSQL Database (5 minutes)

### Step 5: Add Database to Project
1. In your Railway project dashboard, click the **"+ New"** button
2. Select **"Database"**
3. Click **"Add PostgreSQL"**
4. Railway will provision a PostgreSQL database (takes ~30 seconds)
5. You'll see a new "Postgres" card appear in your project

**What just happened?**
- Railway created a PostgreSQL database for you
- It's running on Railway's servers
- It's already connected to your app automatically

### Step 6: Verify Database Connection
1. Click on the **"Postgres"** card
2. Go to the **"Variables"** tab
3. You should see variables like:
   - `DATABASE_URL` (this is your database connection string)
   - `PGHOST`, `PGPORT`, `PGUSER`, etc.
4. **Copy the `DATABASE_URL` value** - save it in a text file temporarily
   - It looks like: `postgresql://postgres:password@host:5432/railway`
   - We'll need this for data migration

---

## Part 4: Configure Your Application Service (5 minutes)

### Step 7: Set Environment Variables
1. Go back to your project view (click the project name at top)
2. Click on your **service card** (the one with your app name, not Postgres)
3. Go to the **"Variables"** tab
4. Click **"+ New Variable"**
5. Add these variables one by one:

**Variable 1:**
- Variable: `DATABASE_URL`
- Value: `${{Postgres.DATABASE_URL}}`
  - **Copy this EXACTLY** - it's a Railway reference variable
  - This automatically connects your app to the database

**Variable 2:**
- Variable: `PORT`
- Value: `3001`

**Variable 3:**
- Variable: `NODE_ENV`
- Value: `production`

**Variable 4:**
- Variable: `CORS_ORIGIN`
- Value: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
  - **Copy this EXACTLY** - Railway will replace this with your actual URL

6. Click **"Add"** or **"Save"** after each variable

**What are these variables?**
- `DATABASE_URL`: Where your database is located
- `PORT`: Which port your app runs on (3001)
- `NODE_ENV`: Tells your app it's in production mode
- `CORS_ORIGIN`: Allows your frontend to talk to your backend securely

### Step 8: Trigger First Deployment
1. Still in your service settings, go to the **"Settings"** tab
2. Scroll down to **"Deployment"** section
3. Click **"Redeploy"** button
4. Railway will start building your Docker image

**This will take 5-10 minutes the first time.**

You'll see logs scrolling:
- Building client...
- Building server...
- Running migrations...
- Starting server...

---

## Part 5: Monitor the Deployment (5 minutes)

### Step 9: Watch the Build Logs
1. Click on the **"Deployments"** tab at the top
2. Click on the latest deployment (should say "Building" or "Active")
3. You'll see real-time logs of the build process

**What to look for:**
- ✅ `Client built successfully` - React app compiled
- ✅ `Server built successfully` - Express app compiled
- ✅ `Health check passed` - App is running
- ❌ If you see errors, scroll down to "Troubleshooting"

### Step 10: Get Your App URL
1. Once deployment shows **"Active"** or **"Success"**
2. Go to the **"Settings"** tab of your service
3. Scroll to **"Domains"** section
4. You'll see a URL like: `poker-tracker-xxx.up.railway.app`
5. Click the **"Generate Domain"** button if there's no URL yet
6. **Copy this URL** - this is your live app!

---

## Part 6: Migrate Your Data from SQLite to PostgreSQL (10 minutes)

**IMPORTANT:** Your app is now running but with an EMPTY database. Let's move your existing data.

### Step 11: Export Data from SQLite (on your computer)

Open your terminal and run these commands:

```bash
# Navigate to your project
cd /Users/hatuspellegrini/Documents/Personal/pokerapp

# Go to server directory
cd server

# Export your current SQLite data
DATABASE_URL="file:./prisma/data/poker.db" npm run db:generate
npm run migrate:export
```

**What happened?**
- This created a file: `server/backup-for-migration.json`
- It contains ALL your groups, players, sessions, etc.
- Open it in a text editor to verify - you should see your data

### Step 12: Create Database Schema in Railway

Still in your terminal:

```bash
# Use the DATABASE_URL you copied earlier from Railway
# Replace the URL below with your actual Railway database URL

DATABASE_URL="postgresql://postgres:password@host:5432/railway" npx prisma migrate dev --name init_postgres
```

**Type "yes"** when it asks if you want to continue.

**What happened?**
- Created all the tables in your Railway PostgreSQL database
- Groups, Players, Sessions, etc. tables now exist
- But they're empty - we'll fill them next

### Step 13: Import Data to Railway PostgreSQL

Still in your terminal:

```bash
# Use the same DATABASE_URL from Railway
DATABASE_URL="postgresql://postgres:password@host:5432/railway" npm run migrate:import
```

**What you should see:**
```
📥 Starting PostgreSQL data import...
📂 Found 1 group(s) to import

📁 Importing group: My Poker Group
  ✓ Group created
  ✓ 5 player(s) imported
  ✓ 12 session(s) imported
  ✓ 0 template(s) imported

🎉 Migration completed successfully!
```

**If you see this, your data migration worked! 🎉**

---

## Part 7: Test Your Live Application (5 minutes)

### Step 14: Open Your App
1. Open your Railway app URL in a browser
   - Example: `https://poker-tracker-xxx.up.railway.app`
2. You should see your Poker Tracker Pro home page!

### Step 15: Verify Everything Works
Test these features:

**✅ Check Groups:**
- Do you see your groups?
- Can you select a group?

**✅ Check Players:**
- Navigate to Players page
- Do you see all your players?

**✅ Check Sessions:**
- Navigate to Sessions page
- Do you see your historical sessions?
- Can you click on a session to see details?

**✅ Check Dashboard:**
- Do statistics show correctly?
- Are charts displaying?

**✅ Test Role System:**
- Go to Settings
- Try switching between Viewer and Editor roles
- In Viewer mode, buttons should be hidden
- In Editor mode, you should be able to create/edit

**✅ Try Creating Something (Editor mode):**
- Try adding a new player
- Try creating a new session
- This tests that the database is working

---

## Part 8: Ongoing Management

### How to View Logs
If something goes wrong:
1. Go to Railway dashboard
2. Click your service
3. Click **"Deployments"** tab
4. Click the latest deployment
5. Scroll through logs to find errors

### How to Redeploy After Code Changes
1. Make changes to your code locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```
3. Railway automatically detects the push
4. Railway rebuilds and redeploys (5-10 minutes)
5. Check deployment status in Railway dashboard

### How to Backup Your Database
In your terminal:
```bash
# Connect to Railway database and export
DATABASE_URL="your-railway-url" cd server && tsx scripts/migrate-to-postgres.ts export
```

This creates `backup-for-migration.json` with all your data.

### Railway Dashboard URLs
- **Project Dashboard**: https://railway.app/dashboard
- **Your Projects**: Click on your project name
- **View Logs**: Service → Deployments → Click deployment
- **Environment Variables**: Service → Variables
- **Database**: Click Postgres card → Variables tab

---

## 🎯 Quick Reference Commands

**Export SQLite data:**
```bash
cd server
DATABASE_URL="file:./prisma/data/poker.db" npm run migrate:export
```

**Import to Railway PostgreSQL:**
```bash
cd server
DATABASE_URL="<railway-url>" npm run migrate:import
```

**View Railway PostgreSQL data:**
```bash
cd server
DATABASE_URL="<railway-url>" npx prisma studio
```

**Test Docker build locally:**
```bash
npm run docker:build
```

---

## ❌ Troubleshooting Common Issues

### Issue 1: Build Fails with "npm not found" or "node not found"
**Solution:**
- Railway should use Node 20 automatically
- Check `package.json` has `engines` section (it does)
- Redeploy after ensuring it's in your git repo

### Issue 2: "Database connection failed" errors
**Check:**
1. Postgres service is running in Railway
2. `DATABASE_URL` variable is set correctly
3. It should be: `${{Postgres.DATABASE_URL}}`
4. Not a hardcoded URL

**Fix:**
- Go to Variables tab
- Delete `DATABASE_URL` if it's wrong
- Add new one with: `${{Postgres.DATABASE_URL}}`
- Redeploy

### Issue 3: Health check failing
**Check logs for:**
- Port mismatch (should be 3001)
- App not starting (build errors)
- Database connection issues

**Fix:**
1. Check `PORT=3001` in variables
2. Look at deployment logs for actual error
3. Most common: database not connected

### Issue 4: "Module not found" errors
**Solution:**
- Usually means a package is missing
- Check `package.json` in both `client/` and `server/`
- Make sure all dependencies are listed
- Commit and push changes
- Railway will rebuild

### Issue 5: Page loads but API calls fail (Network errors)
**Check:**
1. Browser console for CORS errors
2. `CORS_ORIGIN` variable in Railway
3. Should be: `https://${{RAILWAY_PUBLIC_DOMAIN}}`

**Fix:**
- Update `CORS_ORIGIN` variable
- Redeploy

### Issue 6: Data migration fails
**Check:**
1. SQLite database exists locally: `server/prisma/data/poker.db`
2. Railway DATABASE_URL is correct
3. You ran `db:generate` before export

**Fix:**
```bash
# Re-export
cd server
DATABASE_URL="file:./prisma/data/poker.db" npm run db:generate
npm run migrate:export

# Check backup file was created
ls -la backup-for-migration.json

# Try import again
DATABASE_URL="<railway-url>" npm run migrate:import
```

### Issue 7: App shows blank page
**Check:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

**Common causes:**
- API calls failing (check CORS)
- JavaScript errors (check logs)
- Build didn't include client files (check Dockerfile)

---

## 💰 Railway Costs

**Free Tier:**
- 500 hours of execution per month
- ~16 hours per day
- 1GB PostgreSQL storage
- Perfect for personal projects

**If you exceed free tier:**
- Hobby plan: $5/month
- Railway will email you first
- You can set spending limits in settings

**Your app should easily stay within free tier** for personal use.

---

## 🔐 Security Notes

**Environment Variables:**
- NEVER commit `.env` files to git
- Only use Railway's Variables feature for secrets
- Database passwords are managed by Railway

**Domain:**
- Railway provides free HTTPS
- Your URL is: `https://your-app.railway.app`
- SSL certificate is automatic

**Custom Domain (Optional):**
- Can add your own domain in Railway
- Settings → Domains → Add Custom Domain
- Point your domain's CNAME to Railway's URL

---

## 📞 Getting Help

**If you get stuck:**

1. **Check Railway Logs:**
   - Most errors are visible in deployment logs
   - Shows exactly what went wrong

2. **Railway Community:**
   - Discord: https://discord.gg/railway
   - Very helpful community

3. **Common Error Messages:**
   - "Port 3001 not available" → Check PORT variable
   - "Database connection refused" → Check DATABASE_URL
   - "Module not found" → Package.json missing dependency
   - "Build failed" → Check Dockerfile syntax

---

## ✅ Success Checklist

After deployment, you should have:

- [ ] Railway account created
- [ ] Project deployed from GitHub
- [ ] PostgreSQL database added
- [ ] Environment variables configured
- [ ] App shows "Active" status
- [ ] App URL accessible in browser
- [ ] Data migrated from SQLite
- [ ] Groups, players, sessions visible
- [ ] Can create new sessions (Editor mode)
- [ ] Role switching works (Viewer/Editor)
- [ ] Health check passing (`/api/health`)

**If all checked, you're successfully deployed! 🎉**

---

## 🚀 Next Steps (Optional)

**1. Custom Domain:**
- Buy a domain (Namecheap, Cloudflare, etc.)
- Add to Railway: Settings → Domains
- Update DNS CNAME record

**2. Monitoring:**
- Railway provides built-in metrics
- View CPU, Memory, Network usage
- Set up alerts in Railway dashboard

**3. Backups:**
- Set up weekly backup script
- Run `migrate:export` regularly
- Store backup files safely

**4. Share with Friends:**
- Give them your Railway URL
- They can view in Viewer mode
- You manage in Editor mode

---

## 📚 Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Prisma Docs:** https://www.prisma.io/docs
- **Docker Docs:** https://docs.docker.com
- **Your Deployment Plan:** See `/Users/hatuspellegrini/.claude/plans/rustling-whistling-pascal.md`

---

## 🎊 You're Done!

Your Poker Tracker Pro is now:
- ✅ Running on Railway's cloud
- ✅ Using a production PostgreSQL database
- ✅ Accessible via HTTPS
- ✅ Auto-deploying from GitHub
- ✅ Ready to use!

**Your Live App:** `https://[your-railway-url].railway.app`

Enjoy your deployed app! 🎉🃏

# Railway Deployment Guide for Opsboard

This guide will help you deploy your full-stack opsboard project to Railway.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Push**: Your code is already on GitHub ✅
3. **Railway CLI** (optional): Download from [railway.app/docs](https://docs.railway.app/guides/cli)

---

## 🚀 Step 1: Create a Railway Project

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"**
3. Select **"GitHub Repo"**
4. Authorize Railway to access your GitHub account
5. Select your repo: `ali12-sp/Managment-tool`
6. Click **"Create Project"**

---

## 🗄️ Step 2: Add PostgreSQL Database

1. In your Railway project, click **"Add Service"**
2. Search for and select **"PostgreSQL"**
3. Railway will automatically provision a PostgreSQL database
4. The database connection string will be available as an environment variable

---

## 🔧 Step 3: Deploy Backend (API)

### 3.1 Add API Service

1. Click **"Add Service"** → **"GitHub Repo"**
2. Select your repo again (or it may auto-detect)
3. Configure the service:
   - **Name**: `api`
   - **Root Directory**: `apps/api`
   - **Start Command**: Leave empty (Railway will detect from Dockerfile)
   - **Port**: `4000`

### 3.2 Set Environment Variables for API

1. Go to your API service's **Variables** tab
2. Add the following environment variables:

```
DATABASE_URL=        (Railway will provide this - see Step 2)
PORT=4000
JWT_ACCESS_SECRET=your-secure-random-string-here-at-least-30-chars
JWT_REFRESH_SECRET=another-secure-random-string-at-least-30-chars
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
STRIPE_SECRET_KEY=sk_test_xxx (optional if using billing)
STRIPE_PRICE_PRO=price_xxx (optional)
STRIPE_WEBHOOK_SECRET=whsec_xxx (optional)
APP_URL=https://your-web-domain.railway.app
```

**Important**: Generate secure random strings for JWT secrets:
- Use `openssl rand -hex 32` in your terminal, or
- Use an online generator like [1Password Generator](https://1password.com/password-generator/)

### 3.3 Link PostgreSQL to API

1. On the API service, go to **Variables**
2. Look for the PostgreSQL service in the sidebar
3. Click on it and copy the `DATABASE_URL` variable
4. Paste it into the API's `DATABASE_URL` variable

Or use Railway's automatic linking:
1. In the API service, go to **"Plugins"**
2. Click **"Add Plugin"**
3. Select **"PostgreSQL"** (if not already added)
4. Railway will auto-populate `DATABASE_URL`

---

## 🌐 Step 4: Deploy Frontend (Web)

### 4.1 Add Web Service

1. Click **"Add Service"** → **"GitHub Repo"**
2. Configure the service:
   - **Name**: `web`
   - **Root Directory**: `apps/web`
   - **Start Command**: Leave empty
   - **Port**: `3000`

### 4.2 Set Environment Variables for Web

1. Go to the Web service's **Variables** tab
2. Add:

```
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
NODE_ENV=production
```

Replace `https://your-api-domain.railway.app` with your actual API domain (Railway will assign this).

---

## 🔗 Step 5: Get Your Domains

After services deploy (5-10 minutes):

1. Click on the **API service** → **Settings** → copy the **Railway Domain** (e.g., `api-production-xxxx.railway.app`)
2. Click on the **Web service** → **Settings** → copy the **Railway Domain** (e.g., `web-production-xxxx.railway.app`)
3. Update the **Web service variables**:
   - Set `NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app`
4. Go back to **API service variables**:
   - Set `APP_URL=https://your-web-domain.railway.app`

This ensures the frontend can communicate with the backend and Stripe redirects work correctly.

---

## ✅ Step 6: Verify Deployment

### Check API Health

```bash
curl https://your-api-domain.railway.app/health
```

You should see: `{"status":"ok"}`

### Check Frontend

Visit: `https://your-web-domain.railway.app`

You should see the login page.

### View Logs

In Railway dashboard:
1. Click on each service
2. Go to **"Logs"** tab
3. Check for any errors

---

## 🐛 Troubleshooting

### Issue: API not starting / deployment fails

**Solution**:
1. Check the **Logs** tab for error messages
2. Ensure `DATABASE_URL` is set correctly
3. Verify all required environment variables are present
4. Check if Prisma migrations ran: look for migration messages in logs

### Issue: Frontend can't connect to API

**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` in web service variables
2. Ensure API service domain is correct and accessible
3. Check browser console for CORS errors (the API should have CORS enabled)
4. Verify API is running: visit `https://your-api-domain.railway.app/health`

### Issue: Database connection failing

**Solution**:
1. Click the **PostgreSQL service** in Railway dashboard
2. Go to **Variables** tab
3. Copy the `DATABASE_URL` variable
4. Paste it into the API service's `DATABASE_URL` variable
5. Redeploy the API service

### Issue: Builds are taking too long or failing

**Solution**:
1. Railway might be caching old dependencies
2. Click on the service → **Settings** → **"Build"**
3. Check the build logs for issues
4. Ensure `pnpm-lock.yaml` is committed to GitHub
5. Try redeploying: Click **"Redeploy"** button in service

---

## 🔄 Manual Redeploy

If you need to redeploy after pushing new code:

1. Push your changes to GitHub (`git push`)
2. Go to Railway dashboard
3. Click the service you want to redeploy
4. Click the **"Redeploy"** button
5. Wait 5-10 minutes for the build and deployment

Or Railway auto-deploys when you push to the main branch (configurable).

---

## 📊 Monitoring

### View Logs in Real-Time

```bash
# If you have Railway CLI installed:
railway link
railway logs
```

Or use the dashboard: Service → **Logs** tab

### Check Service Status

Each service shows:
- ✅ Running (green)
- ⏳ Building (yellow)
- ❌ Failed (red)

---

## 💰 Costs

Railway pricing:
- **Free tier**: $5 credit/month (enough for small projects)
- **PostgreSQL**: Included in free tier
- **Beyond $5**: Pay as you go (~$0.30/hour per service)

For this project with free tier:
- API service
- Frontend service
- PostgreSQL database
= Usually fits within the free $5 credit

---

## 🚨 Important Notes

1. **Never commit `.env` files** - Use Railway's Variables tab
2. **Database migrations** - They run automatically on deployment (via `db:push` in Dockerfile)
3. **Stripe integration** - Only works with HTTPS (Railway provides this automatically)
4. **Custom domains** - You can add custom domains in Railway **Settings** (Premium feature)
5. **Auto-scaling** - Not available in free tier, but you can toggle on in paid tier

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway CLI Guide](https://docs.railway.app/guides/cli)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

---

## ❓ Need Help?

1. Check Railway docs: [docs.railway.app](https://docs.railway.app)
2. View service logs in Railway dashboard
3. Check GitHub Actions for any build failures
4. Contact Railway support: [railway.app/support](https://railway.app/support)

Happy deploying! 🎉

# 🚀 Quick Railway Deployment Checklist for TaskFlow

## Pre-Deployment (Do Once)

- [ ] Have a Railway account at [railway.app](https://railway.app)
- [ ] Your GitHub repo is pushed: `ali12-sp/taskflow`
- [ ] Verify code is on `master` branch: `git status`

## Deployment Steps (Copy-Paste Ready)

### 1️⃣ Create Railway Project
```
1. Go to railway.app → New Project → GitHub Repo
2. Select: ali12-sp/taskflow → Create Project
```

### 2️⃣ Add PostgreSQL
```
1. New Project → Add Service → PostgreSQL
2. Railway auto-creates database (copy the DATABASE_URL)
```

### 3️⃣ Add API Service
```
1. Add Service → GitHub Repo → Select your repo
2. Name: api
3. Root Directory: apps/api
4. Port: 4000
```

### 4️⃣ API Environment Variables
```
DATABASE_URL=<copy from PostgreSQL>
PORT=4000
JWT_ACCESS_SECRET=<generate secure string>
JWT_REFRESH_SECRET=<generate secure string>
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
APP_URL=https://your-web-domain.railway.app
```

### 5️⃣ Add Web Service
```
1. Add Service → GitHub Repo → Select your repo
2. Name: web
3. Root Directory: apps/web
4. Port: 3000
```

### 6️⃣ Web Environment Variables
```
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
NODE_ENV=production
```

### 7️⃣ Update Domains
After services deploy (5-10 min):
```
1. Get API domain from railway.app (e.g., api-prod-xxxx.railway.app)
2. Update Web service: NEXT_PUBLIC_API_URL=https://api-prod-xxxx.railway.app
3. Get Web domain from railway.app (e.g., web-prod-xxxx.railway.app)
4. Update API service: APP_URL=https://web-prod-xxxx.railway.app
```

### 8️⃣ Verify
```bash
# Check API is running
curl https://api-prod-xxxx.railway.app/health

# Visit frontend
Open https://web-prod-xxxx.railway.app in browser
```

---

## 🔑 Generate Secure JWT Secrets

**On Windows PowerShell**:
```powershell
# Generate random string
-join ((33..126) | Get-Random -Count 32 | % { [char]$_ })
```

**On Mac/Linux**:
```bash
openssl rand -hex 32
```

**Online** (if you prefer):
Visit https://1password.com/password-generator/

---

## ✅ Success Indicators

- ✅ API health check returns `{"status":"ok"}`
- ✅ Frontend loads login page
- ✅ Can log in with test account
- ✅ Can create a project
- ✅ Can create a task
- ✅ Real-time notifications appear

---

## 🆘 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| API won't start | Check logs, verify DATABASE_URL is set |
| Frontend can't connect | Verify NEXT_PUBLIC_API_URL is correct |
| Database not found | Link PostgreSQL service to API |
| CORS errors | API has CORS enabled, check browser console |
| Builds failing | Ensure pnpm-lock.yaml is committed |

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- View Logs: Click service → Logs tab
- Contact Support: railway.app/support

---

**You're ready to deploy! 🚀**

# 🚀 RoomSplit Production Deployment Guide (Railway)

As a senior engineer, I have prepared this monorepo for a professional-grade deployment on Railway. The project is split into two independent services: **API** and **Web**.

## 🛠️ Automated Fixes Applied
1.  **Multi-Service Config**: Created a `railway.json` that orchestrates separate build/deploy pipelines for `@roomsplit/api` and `@roomsplit/web`.
2.  **Safe Migrations**: Configured the API to use `prisma migrate deploy` during startup to ensure the database schema is updated without data loss.
3.  **Dynamic API URL**: Updated the React frontend to use `VITE_API_URL`, allowing it to talk to your deployed API instead of a local proxy.
4.  **Health Checks**: Added a `/health` endpoint check in Railway to ensure zero-downtime deployments.

---

## 🔑 Required Environment Variables

### 1. Backend Service (`roomsplit-api`)
| Key | Value / Recommendation |
| :--- | :--- |
| `DATABASE_URL` | Auto-provided by Railway PostgreSQL plugin. |
| `JWT_ACCESS_SECRET` | Generate a 32+ char random string. |
| `JWT_REFRESH_SECRET` | Generate another 32+ char random string. |
| `CORS_ORIGIN` | `https://roomsplit-web.up.railway.app` (Your frontend URL). |
| `NODE_ENV` | `production` |
| `PORT` | `4000` (Railway will override this, but good to have). |

### 2. Frontend Service (`roomsplit-web`)
| Key | Value / Recommendation |
| :--- | :--- |
| `VITE_API_URL` | `https://roomsplit-api.up.railway.app/api` (Your API URL). |

---

## 🚀 Deployment Steps
1.  **Create Project**: In Railway, create a new project from your GitHub repo.
2.  **Add Database**: Add a **PostgreSQL** instance to the project.
3.  **Detect Services**: Railway will see `railway.json` and prompt you to deploy both `roomsplit-api` and `roomsplit-web`.
4.  **Set Variables**: Go to the **Variables** tab for each service and add the keys listed above.
5.  **Redeploy**: Once variables are set, trigger a redeploy.

## 📈 Monitoring
- Use the **Logs** tab in Railway to watch the `prisma migrate deploy` output during startup.
- The backend is configured with `pino` for structured logging.

---
*Prepared with ❤️ by Gemini CLI (Senior Full-Stack Engineer Mode)*

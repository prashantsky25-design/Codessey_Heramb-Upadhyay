# CrossProof: Production Cloud Deployment Guide

This guide details how to deploy **CrossProof** to production cloud hosting with a decoupled architecture:
- **Frontend SPA**: Hosted on [Vercel](https://vercel.com)
- **Backend API Server**: Hosted on [Render](https://render.com) or [Railway](https://railway.app)

---

## 1. Backend API Deployment (Render)

### Step 1: Create a Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** &rarr; **Web Service**.
3. Connect your GitHub repository:
   ```
   https://github.com/prashantsky25-design/Codessey_Heramb-Upadhyay
   ```
4. Configure the service settings:
   - **Name**: `crossproof-api`
   - **Region**: Oregon (US West) or Frankfurt (EU)
   - **Branch**: `main` or `prashant`
   - **Root Directory**: Leave blank (uses repo root)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node apps/api/dist/index.js`
   - **Plan**: `Free`

### Step 2: Configure Environment Variables in Render
In the **Environment** tab of your Render service, add the following:

| Key | Suggested Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render binds to this automatically) |
| `HOST` | `0.0.0.0` |
| `SOURCE_CHAIN_RPC` | RPC URL for Source Chain (e.g. `https://rpc.sepolia.org`) |
| `DEST_CHAIN_RPC` | RPC URL for Destination Chain (e.g. `https://sepolia.base.org`) |
| `SOURCE_BRIDGE_ADDRESS` | `0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9` |
| `DEST_VERIFIER_ADDRESS` | `0x9a676e781a523b5d0c0e43731313a708cb607508` |
| `HEADER_ORACLE_ADDRESS` | `0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0` |
| `RECEIVER_ADDRESS` | `0x0b306bf915c4d645ff596e518faf3f9669b97016` |
| `RELAYER_PRIVATE_KEY` | Hex private key for the relayer account (funded on destination chain) |

### Step 3: Verify Backend Deployment
Once deployed, check your service health:
```
GET https://<your-render-service>.onrender.com/api/health
```
Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "relayerAddress": "0x...",
  "timestamp": 1792898000
}
```

---

## 2. Frontend SPA Deployment (Vercel)

### Step 1: Import Project into Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** &rarr; **Project**.
3. Import your GitHub repository (`Codessey_Heramb-Upadhyay`).
4. In the configuration window:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.` (Root)
   - **Build Command**:
     ```bash
     npm run build --workspace=@crossproof/shared && npm run build --workspace=@crossproof/web
     ```
   - **Output Directory**: `apps/web/dist`

### Step 2: Configure Environment Variables in Vercel
In the **Environment Variables** section before deploying:

| Name | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com` |

*(Note: Replace with your actual live Render/Railway URL. Do not append `/api`; the client app adds `/api` automatically).*

### Step 3: Deploy
1. Click **Deploy**.
2. Vercel will install dependencies, compile the TypeScript packages, run the Vite production build, and publish the SPA globally on the Vercel Edge Network.
3. Access your production dashboard at `https://<your-project>.vercel.app`.

---

## 3. Alternative: Deploy Backend on Railway

If you prefer [Railway](https://railway.app):
1. Click **New Project** &rarr; **Deploy from GitHub repo**.
2. Select `Codessey_Heramb-Upadhyay`.
3. Railway automatically detects `railway.toml`.
4. Add the same environment variables in the **Variables** tab.
5. In **Settings** &rarr; **Networking**, click **Generate Domain** to get your public backend URL.
6. Provide that URL to Vercel as `VITE_API_BASE_URL`.

---

## 4. Configuration Reference

The repository includes pre-configured deployment manifests:
- `vercel.json`: Routing and monorepo build directives for Vercel.
- `render.yaml`: Infrastructure-as-code blueprint for Render.
- `railway.toml`: Build and restart policy for Railway.
- `Dockerfile`: Multi-stage Docker image for container environments.
- `Procfile`: Process specification for PaaS runners.

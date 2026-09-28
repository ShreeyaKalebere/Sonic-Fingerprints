# 🚀 Sonic Fingerprints: App Installation & Web Deployment Guide

Sonic Fingerprints is designed as a **dual-architecture acoustic platform**:
1. **Installable App (PWA)**: Works as a standalone, native-feeling app on Android, iOS, Windows, macOS, and Linux without needing app store approval.
2. **Cloud Web Deployment**: Can be hosted either via Docker Compose on any VPS or as decoupled microservices (Vercel + Render + MongoDB Atlas).

---

## 📱 Part 1: How to Install the App (Mobile & Desktop)

Sonic Fingerprints includes full Progressive Web App (PWA) support with a custom service worker, app manifest, and offline shell.

### 💻 On Desktop (Chrome / Edge / Brave / Safari on macOS)
1. Open the application URL in your browser (e.g., `http://localhost:3000` or your production domain).
2. Look at the top-right navbar: click the **`[ 📱 Install App ]`** button.
   *(Alternatively, click the install monitor/plus icon in the browser address bar).*
3. Click **"Install"** when prompted.
4. The application now launches in its own dedicated window with its own taskbar/dock icon, just like a native desktop app!

### 📱 On Android (Google Chrome)
1. Open your Sonic Fingerprints URL in Google Chrome.
2. Tap the **`[ 📱 Install App ]`** button on the navbar, or tap the three dots **(⋮)** in the top right.
3. Select **"Install app"** or **"Add to Home screen"**.
4. The Sonic Fingerprints icon will appear on your home screen and app drawer, operating with full-screen standalone UI and microphone access.

### 🍎 On iOS / iPhone / iPad (Safari)
1. Open your Sonic Fingerprints URL in **Safari** (iOS requires Safari for PWA installation).
2. Tap the **Share** button (the square with an upward pointing arrow at the bottom of the screen).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top right corner.
5. Sonic Fingerprints will be installed on your iOS home screen as an app with no browser address bar!

---

## 🌐 Part 2: Cloud Web Deployment Options

### Option 1: 1-Click Multi-Container Deployment via Docker Compose (Recommended for Full Stack)
Deploy all 5 services (Frontend, Backend, ML Service, ChromaDB, MongoDB) together with a single command.

#### Suitable Platforms:
- **Render** (via Docker Blueprint or Private Docker Compose)
- **Railway.app** (via Docker Compose)
- **DigitalOcean Droplet / AWS EC2 / Linode / Hetzner**

#### Deployment Steps:
1. Clone the repository on your server:
   ```bash
   git clone https://github.com/ShreeyaKalebere/Sonic-Fingerprints.git
   cd Sonic-Fingerprints
   ```
2. (Optional) Customize environment variables in `docker-compose.yml` if using external database URLs.
3. Launch all containers:
   ```bash
   docker compose up -d --build
   ```
4. Verify all services are healthy:
   ```bash
   docker compose ps
   ```
   - **Frontend**: `http://<your-server-ip>:3000` (proxies requests to backend)
   - **Backend**: `http://<your-server-ip>:5000`
   - **ML Service**: `http://<your-server-ip>:8001`
   - **ChromaDB**: `http://<your-server-ip>:8000`

---

### Option 2: Decoupled Free Cloud Tier (Vercel + Render + MongoDB Atlas)

#### 1. Database: MongoDB Atlas (Free Tier)
1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free **M0 Sandbox** cluster.
3. Under *Network Access*, add `0.0.0.0/0` (allow access from anywhere).
4. Under *Database Access*, create a user and copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/sonic_fingerprints?retryWrites=true&w=majority
   ```

#### 2. ML Service: Deploy on Render
1. Sign up at [render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `https://github.com/ShreeyaKalebere/Sonic-Fingerprints`.
4. Settings:
   - **Root Directory**: `ml-service`
   - **Environment**: `Docker` (or Python 3.11 with `pip install -r requirements.txt`)
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port 8000`
5. Note your deployed ML Service URL (e.g. `https://sonic-ml-service.onrender.com`).

#### 3. Backend: Deploy on Render
1. In Render, click **New +** -> **Web Service**.
2. Connect the same repository.
3. Settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
4. Add Environment Variables:
   - `MONGO_URI`: *Your MongoDB Atlas connection string*
   - `ML_SERVICE_URL`: *Your Render ML Service URL from Step 2*
   - `CHROMA_URL`: *Your ChromaDB URL or persistent endpoint*
   - `JWT_SECRET`: *A secure random string*
   - `PORT`: `5000`
5. Note your deployed Backend URL (e.g. `https://sonic-backend.onrender.com`).

#### 4. Frontend: Deploy on Vercel
1. Sign up or log into [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `ShreeyaKalebere/Sonic-Fingerprints`.
4. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and choose `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: *Your Render Backend URL* (e.g. `https://sonic-backend.onrender.com`)
6. Click **Deploy**!
7. Your app is now live at `https://sonic-fingerprints.vercel.app` with instant PWA installation!

---

## 🔒 Production Security Checklist
- [x] CORS enabled on backend for custom domain access.
- [x] PWA manifest and service worker configured with HTTPS compliance.
- [x] Client-side SPA fallback configured via `vercel.json` and `nginx.conf`.
- [x] Audio conversion client-side handles `.wav` generation at 32kHz sample rate for low latency upload.

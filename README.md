# Staff Sanctuary Research Dashboard

A sleek research dashboard for collecting Discord/Minecraft server owner pain points.

## Important
GitHub Pages only hosts static frontend files. Shared data storage requires the backend API + MongoDB.

## Frontend Files for GitHub Pages
Upload these to your GitHub Pages repo:

- `index.html`
- `styles.css`
- `app.js`

After deploying the backend, open the site, go to **Settings**, and paste your backend API URL.

## Backend Setup
The backend lives in `/backend` and uses Express + MongoDB.

### Local test
```bash
cd backend
npm install
copy .env.example .env
npm start
```

Edit `.env` with your MongoDB URI.

### Deploy Backend
Use Render, Railway, or Vercel serverless/Node hosting. Set these environment variables:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3000
ADMIN_KEY=your_secret_key
ALLOWED_ORIGINS=https://yourusername.github.io,http://localhost:5500
```

## What It Includes
- Shared MongoDB storage
- Response entry form
- Dashboard with filters
- CSV export
- Question scripts for representatives
- Professional UI
- API health check

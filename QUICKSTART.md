# Quick Start Guide

Get up and running in 5 minutes!

## 1. Prerequisites Check

```bash
node --version  # Should be v14 or higher
npm --version   # Should be v6 or higher
mongod --version  # MongoDB should be installed
```

## 2. Installation (2 minutes)

```bash
# Clone the repository
git clone https://github.com/Michael660-max/CCT499-Maker-Space.git
cd CCT499-Maker-Space

# Install all dependencies
npm run install-all
```

## 3. Configuration (1 minute)

### Backend Setup
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cct499-maker-space
```

### Frontend Setup
Create `client/.env`:
```env
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
REACT_APP_API_URL=http://localhost:5000/api
```

**Get Mapbox Token**: https://account.mapbox.com/ (free account)

## 4. Start Services (1 minute)

### Terminal 1 - MongoDB
```bash
mongod
```

### Terminal 2 - Backend
```bash
cd backend
npm start
```

### Terminal 3 - Frontend
```bash
cd client
npm start
```

The app will open at `http://localhost:3000`

## 5. Load Sample Data (Optional)

```bash
cd backend
npm run seed
```

## First Steps

1. Click **"Add Location"** button
2. Fill in the form:
   - Name: "My First Location"
   - Description: "This is a test location"
   - Latitude: 43.6532
   - Longitude: -79.3832
   - Category: General
3. Click **"Add Location"**
4. See your marker on the map! 🎉

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB won't start | Check if already running: `ps aux \| grep mongod` |
| Map not loading | Add Mapbox token to `client/.env` and restart |
| Port 5000 in use | Change PORT in `backend/.env` |
| CORS errors | Ensure backend is running on port 5000 |

## Common Commands

```bash
# Install dependencies
npm run install-all

# Start backend
cd backend && npm start

# Start frontend
cd client && npm start

# Load sample data
cd backend && npm run seed

# Build for production
cd client && npm run build
```

## Project Structure

```
CCT499-Maker-Space/
├── backend/          # Node.js + Express API
│   ├── models/       # MongoDB schemas
│   ├── routes/       # API endpoints
│   └── controllers/  # Business logic
├── client/           # React frontend
│   └── src/
│       ├── components/  # React components
│       └── services/    # API calls
├── README.md         # Full documentation
├── SETUP.md          # Detailed setup guide
└── FEATURES.md       # Feature documentation
```

## What's Next?

- Read [README.md](README.md) for complete documentation
- Check [FEATURES.md](FEATURES.md) to learn all features
- See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Review [CONTRIBUTING.md](CONTRIBUTING.md) to contribute

## Support

Need help? 
- Check the troubleshooting section in README.md
- Open an issue on GitHub
- Review the documentation files

Happy mapping! 🗺️

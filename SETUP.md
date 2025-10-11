# Quick Setup Guide

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Mapbox account (free tier is sufficient)

## Quick Start

### 1. Install all dependencies

```bash
npm run install-all
```

Or manually:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure environment variables

#### Backend Configuration

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cct499-maker-space
```

**For MongoDB Atlas:**

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cct499-maker-space?retryWrites=true&w=majority
```

#### Frontend Configuration

Create `client/.env`:

```env
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Get Your Mapbox Token

1. Visit [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up for a free account
3. Go to your [Access Tokens page](https://account.mapbox.com/access-tokens/)
4. Copy your default public token
5. Paste it in `client/.env` as `REACT_APP_MAPBOX_TOKEN`

### 4. Start MongoDB (if running locally)

```bash
# On macOS with Homebrew
brew services start mongodb-community

# Or manually
mongod
```

### 5. Start the Backend

```bash
# From the backend directory
cd backend
npm start

# Or for development with auto-restart
npm run dev
```

Backend will run on `http://localhost:5000`

### 6. Start the Frontend

Open a new terminal:

```bash
# From the client directory
cd client
npm start
```

Frontend will automatically open at `http://localhost:3000`

## Testing the Application

1. The application should open automatically in your browser
2. Click "Add Location" to create your first location
3. Enter:
   - Name: "Toronto"
   - Description: "City of Toronto"
   - Latitude: 43.6532
   - Longitude: -79.3832
   - Category: "general"
4. Click "Add Location"
5. The marker should appear on the map
6. Click the marker to see the popup with location details

## Troubleshooting

### MongoDB Connection Issues

**Error:** `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**
- Ensure MongoDB is running: `mongod`
- Check if MongoDB is using a different port
- Or use MongoDB Atlas instead

### Mapbox Not Loading

**Error:** Map not displaying or "Mapbox token not configured" warning

**Solution:**
- Verify `REACT_APP_MAPBOX_TOKEN` is set in `client/.env`
- Restart the React development server after adding the token
- Check that the token is valid on Mapbox dashboard

### CORS Errors

**Error:** `Access to XMLHttpRequest at 'http://localhost:5000/api/locations' has been blocked by CORS policy`

**Solution:**
- Ensure backend server is running
- Check that `cors` is properly configured in `backend/server.js`
- Verify the `proxy` setting in `client/package.json`

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**
- Kill the process using port 5000: `lsof -ti:5000 | xargs kill -9`
- Or change the port in `backend/.env`

## Development Tips

- Use `nodemon` for backend hot-reloading: `npm run dev` in backend folder
- React hot-reloading is automatic when using `npm start`
- MongoDB Compass is a useful GUI tool for viewing your database
- Use browser DevTools Network tab to debug API calls

## Next Steps

- Add authentication
- Implement location search
- Add location images
- Create location categories filter
- Add geolocation to auto-center map on user's location
- Implement location clustering for better performance with many markers

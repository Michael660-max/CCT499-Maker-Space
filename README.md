# CCT499-Maker-Space

A MERN (MongoDB, Express, React, Node.js) stack application integrated with Mapbox GL for interactive location tracking and visualization.

## Features

- 🗺️ Interactive map powered by Mapbox GL
- 📍 Add, view, and delete locations
- 🎯 Click on map markers to view location details
- 🏷️ Categorize locations (Maker Space, Workshop, Lab, Studio, etc.)
- 📱 Responsive design
- 🔄 Real-time data synchronization

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### Frontend
- **React** - JavaScript library for building user interfaces
- **Mapbox GL** - Interactive maps library
- **React Map GL** - React wrapper for Mapbox GL
- **Axios** - HTTP client

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn package manager

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Michael660-max/CCT499-Maker-Space.git
cd CCT499-Maker-Space
```

### 2. Set up the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cct499-maker-space
```

If using MongoDB Atlas, replace the `MONGODB_URI` with your connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cct499-maker-space?retryWrites=true&w=majority
```

### 3. Set up the Frontend

```bash
cd ../client
npm install
```

Create a `.env` file in the `client` directory:

```env
REACT_APP_MAPBOX_TOKEN=your_mapbox_access_token_here
REACT_APP_API_URL=http://localhost:5000/api
```

**Get your Mapbox token:**
1. Sign up for a free account at [Mapbox](https://account.mapbox.com/)
2. Go to your account dashboard
3. Copy your default public token
4. Paste it in the `.env` file

## Running the Application

### Start MongoDB (if running locally)

```bash
mongod
```

### Start the Backend Server

```bash
cd backend
npm start
# Or for development with auto-restart:
npm run dev
```

The backend server will run on `http://localhost:5000`

### Start the Frontend Development Server

```bash
cd client
npm start
```

The React app will open automatically in your browser at `http://localhost:3000`

## Usage

1. **Add a Location**: Click the "Add Location" button in the header
2. **Fill in the Form**: Enter name, description, coordinates, and category
3. **View Locations**: Locations appear both in the sidebar list and as markers on the map
4. **Select a Location**: Click on a marker or list item to view details
5. **Delete a Location**: Click the trash icon on a location in the list

### Example Coordinates

- **Toronto, Canada**: Latitude: 43.6532, Longitude: -79.3832
- **New York, USA**: Latitude: 40.7128, Longitude: -74.0060
- **London, UK**: Latitude: 51.5074, Longitude: -0.1278

## API Endpoints

### Locations

- `GET /api/locations` - Get all locations
- `GET /api/locations/:id` - Get a single location by ID
- `POST /api/locations` - Create a new location
- `PUT /api/locations/:id` - Update a location
- `DELETE /api/locations/:id` - Delete a location

### Health Check

- `GET /api/health` - Check server status

## Project Structure

```
CCT499-Maker-Space/
├── backend/
│   ├── controllers/
│   │   └── locationController.js
│   ├── models/
│   │   └── Location.js
│   ├── routes/
│   │   └── locationRoutes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── LocationForm.js
│   │   │   ├── LocationForm.css
│   │   │   ├── LocationList.js
│   │   │   ├── LocationList.css
│   │   │   ├── MapComponent.js
│   │   │   └── MapComponent.css
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Troubleshooting

### MongoDB Connection Error

If you see a MongoDB connection error:
- Ensure MongoDB is running (`mongod` command)
- Check your `MONGODB_URI` in the `.env` file
- For MongoDB Atlas, ensure your IP address is whitelisted

### Mapbox Map Not Showing

If the map doesn't display:
- Verify your Mapbox token is correctly set in `client/.env`
- Check browser console for errors
- Ensure the token has the correct permissions

### CORS Errors

If you see CORS errors:
- Ensure the backend server is running
- Check that the `proxy` setting in `client/package.json` points to the correct backend URL

## Contact

For questions or support, please open an issue on GitHub.
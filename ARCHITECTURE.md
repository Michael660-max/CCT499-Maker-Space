# Architecture Documentation

## Project Overview

CCT499 Maker Space is a full-stack MERN application that enables users to track, visualize, and manage locations on an interactive map powered by Mapbox GL.

## Technology Stack

### Frontend
- **React 18.2.0**: UI library
- **Mapbox GL 2.15.0**: Mapping library
- **React Map GL 7.1.6**: React wrapper for Mapbox
- **Axios 1.5.0**: HTTP client

### Backend
- **Node.js**: JavaScript runtime
- **Express 4.18.2**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose 7.5.0**: ODM for MongoDB

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     App      │  │ MapComponent │  │ LocationForm │       │
│  │  (Main UI)   │  │ (Mapbox GL)  │  │ (Add Location)│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         └─────────┬────────┴──────────────────┘              │
│                   │                                           │
│         ┌─────────▼─────────┐                                │
│         │  LocationList     │                                │
│         │  (View/Delete)    │                                │
│         └─────────┬─────────┘                                │
│                   │                                           │
│         ┌─────────▼─────────┐                                │
│         │    API Service    │ (Axios)                        │
│         │  HTTP Requests    │                                │
│         └─────────┬─────────┘                                │
└───────────────────┼───────────────────────────────────────────┘
                    │
                    │ HTTP/REST
                    │
┌───────────────────▼───────────────────────────────────────────┐
│                    Backend (Express)                          │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    Routes Layer                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  GET    /api/locations        (Get all)          │  │  │
│  │  │  GET    /api/locations/:id    (Get one)          │  │  │
│  │  │  POST   /api/locations        (Create)           │  │  │
│  │  │  PUT    /api/locations/:id    (Update)           │  │  │
│  │  │  DELETE /api/locations/:id    (Delete)           │  │  │
│  │  └──────────────────┬───────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                        │                                      │
│  ┌────────────────────▼───────────────────────────────────┐ │
│  │              Controllers Layer                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  getAllLocations()                               │  │ │
│  │  │  getLocationById(id)                             │  │ │
│  │  │  createLocation(data)                            │  │ │
│  │  │  updateLocation(id, data)                        │  │ │
│  │  │  deleteLocation(id)                              │  │ │
│  │  └──────────────────┬───────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
│                        │                                      │
│  ┌────────────────────▼───────────────────────────────────┐ │
│  │               Models Layer (Mongoose)                   │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Location Schema:                                │  │ │
│  │  │  - name: String                                  │  │ │
│  │  │  - description: String                           │  │ │
│  │  │  - coordinates: GeoJSON Point                    │  │ │
│  │  │  - category: String                              │  │ │
│  │  │  - createdAt: Date                               │  │ │
│  │  └──────────────────┬───────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
└───────────────────────┼────────────────────────────────────┘
                        │
                        │ Mongoose ODM
                        │
┌───────────────────────▼────────────────────────────────────┐
│                      MongoDB                                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Locations Collection                       │    │
│  │                                                      │    │
│  │  {                                                   │    │
│  │    _id: ObjectId,                                    │    │
│  │    name: "Location Name",                            │    │
│  │    description: "Description",                       │    │
│  │    coordinates: {                                    │    │
│  │      type: "Point",                                  │    │
│  │      coordinates: [longitude, latitude]              │    │
│  │    },                                                 │    │
│  │    category: "makerspace",                           │    │
│  │    createdAt: ISODate()                              │    │
│  │  }                                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Index: 2dsphere on coordinates (for geospatial queries)   │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Viewing Locations

```
User → MapComponent → API Service → GET /api/locations
                                    → Backend Controller
                                    → Mongoose Model
                                    → MongoDB
                                    ← Location Documents
                                    ← JSON Response
Markers on Map ← React Component ←  Frontend State
```

### 2. Adding a Location

```
User → LocationForm → onSubmit
                    → API Service → POST /api/locations
                                  → Backend Controller
                                  → Mongoose Model.create()
                                  → MongoDB (Insert)
                                  ← New Location Document
                                  ← JSON Response
Updated Map ← Refresh Data ← Frontend State Update
```

### 3. Deleting a Location

```
User → LocationList → Delete Button
                    → Confirmation Dialog
                    → API Service → DELETE /api/locations/:id
                                  → Backend Controller
                                  → Mongoose Model.deleteOne()
                                  → MongoDB (Remove)
                                  ← Success Response
Updated List ← Refresh Data ← Frontend State Update
```

## Component Hierarchy

```
App
├── Header
│   └── Add Location Button
├── Sidebar
│   ├── LocationForm (conditional)
│   └── LocationList
│       └── LocationItem[] (multiple)
│           ├── Location Info
│           └── Delete Button
└── Map Container
    └── MapComponent (Mapbox GL)
        ├── Map
        ├── Marker[] (multiple)
        └── Popup (conditional)
```

## State Management

### Frontend State (React useState)

```javascript
App Component State:
├── locations: Array<Location>
├── selectedLocation: Location | null
└── showForm: boolean

MapComponent State:
├── viewState: { longitude, latitude, zoom }
└── popupInfo: Location | null
```

### Backend State (MongoDB)

- Persistent storage in MongoDB
- No server-side state management
- Stateless REST API design

## API Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | /api/locations | Get all locations | - | Array of locations |
| GET | /api/locations/:id | Get one location | - | Single location |
| POST | /api/locations | Create location | Location data | Created location |
| PUT | /api/locations/:id | Update location | Updated data | Updated location |
| DELETE | /api/locations/:id | Delete location | - | Success message |
| GET | /api/health | Health check | - | Status object |

## Database Schema

### Location Model

```javascript
{
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      required: true
    }
  },
  category: {
    type: String,
    default: 'general'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Indexes

- **2dsphere index** on `coordinates` field for efficient geospatial queries

## Security Considerations

### Current Implementation
- CORS enabled for development
- No authentication/authorization
- Public API endpoints

### Future Enhancements
- Add JWT authentication
- Implement user roles (admin, user)
- Add rate limiting
- Input validation and sanitization
- HTTPS in production

## Performance Considerations

### Current Optimizations
- Geospatial indexing in MongoDB
- React component memoization where appropriate
- Efficient state updates

### Future Enhancements
- Implement pagination for large datasets
- Add location clustering on map
- Implement caching (Redis)
- Add lazy loading
- Optimize bundle size

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Production Environment                   │
│                                                            │
│  ┌────────────────┐      ┌────────────────┐             │
│  │   Frontend     │      │    Backend     │             │
│  │  (React SPA)   │      │  (Node.js API) │             │
│  │   Static Files │      │   Express      │             │
│  └────────────────┘      └────────────────┘             │
│                                                            │
│  Hosting Options:         Hosting Options:                │
│  - Netlify                - Heroku                        │
│  - Vercel                 - AWS EC2                       │
│  - GitHub Pages           - DigitalOcean                  │
│                           - Railway                       │
│                                                            │
│                    ┌──────────────────┐                  │
│                    │    MongoDB       │                  │
│                    │  (Atlas Cloud)   │                  │
│                    └──────────────────┘                  │
└──────────────────────────────────────────────────────────┘
```

## Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string

### Frontend (.env)
- `REACT_APP_MAPBOX_TOKEN`: Mapbox GL access token
- `REACT_APP_API_URL`: Backend API URL

## Development Workflow

1. **Setup**: Install dependencies for both frontend and backend
2. **Development**: Run both servers concurrently
3. **Testing**: Test API endpoints and UI interactions
4. **Building**: Create production build of React app
5. **Deployment**: Deploy frontend and backend separately

## Error Handling

### Frontend
- Try-catch blocks in API calls
- Error logging to console
- User-friendly error messages

### Backend
- Error handling middleware
- Validation errors
- Database error handling
- HTTP status codes

## Future Enhancements

### Features
- User authentication
- Location search and filtering
- Location images
- Real-time updates (WebSockets)
- Mobile app (React Native)
- Location sharing
- Comments and reviews

### Technical
- Unit tests (Jest, React Testing Library)
- E2E tests (Cypress)
- CI/CD pipeline
- Docker containerization
- API documentation (Swagger)
- Logging (Winston)
- Monitoring (Prometheus)

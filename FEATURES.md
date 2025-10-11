# Features Guide

## Overview

This document describes the features available in the CCT499 Maker Space application.

## Interactive Map

### Mapbox GL Integration
- High-quality, interactive map powered by Mapbox
- Smooth panning and zooming
- Multiple map styles available (streets, satellite, etc.)
- Responsive design that works on desktop and mobile

### Map Controls
- **Zoom**: Use scroll wheel or +/- buttons
- **Pan**: Click and drag to move around the map
- **Rotate**: Right-click and drag (optional)

## Location Management

### Add Location

Click the "Add Location" button in the header to open the form where you can:

1. **Name** (Required): Enter a descriptive name for the location
2. **Description** (Required): Add details about the location
3. **Latitude** (Required): Enter the latitude coordinate (-90 to 90)
4. **Longitude** (Required): Enter the longitude coordinate (-180 to 180)
5. **Category**: Select from:
   - General
   - Maker Space
   - Workshop
   - Lab
   - Studio

### View Locations

Locations are displayed in two ways:

#### Map Markers
- Each location appears as a 📍 pin on the map
- Click any marker to view location details in a popup
- Markers are positioned based on exact coordinates

#### Sidebar List
- All locations listed in the sidebar
- Shows name, description, category, and coordinates
- Click any item to select and center it on the map
- Selected items are highlighted

### Location Details Popup

Click a marker or list item to view:
- Location name
- Full description
- Category badge
- Coordinates

### Delete Location

To remove a location:
1. Click the 🗑️ (trash) icon on a location in the sidebar
2. Confirm deletion in the dialog
3. The location is removed from both the map and database

## Categories

Locations can be categorized for better organization:

| Category | Use Case |
|----------|----------|
| **General** | Default category for any location |
| **Maker Space** | Fabrication labs, maker spaces |
| **Workshop** | Workshop areas, training rooms |
| **Lab** | Research labs, testing facilities |
| **Studio** | Art studios, design spaces |

## User Interface

### Header
- **Title**: CCT499 Maker Space - Location Tracker
- **Add Location Button**: Toggle the location form

### Sidebar
- **Location Form**: Appears when adding a new location
- **Location Count**: Shows total number of locations
- **Location List**: Scrollable list of all locations

### Map Container
- **Full Map View**: Takes up remaining screen space
- **Markers**: Interactive location pins
- **Popups**: Information windows on marker click

## Data Persistence

All locations are stored in MongoDB and persist between sessions:
- Add a location → Saved to database
- Delete a location → Removed from database
- Refresh page → Locations are reloaded

## Responsive Design

The application adapts to different screen sizes:
- **Desktop**: Full sidebar and map view
- **Tablet**: Responsive layout
- **Mobile**: Optimized for touch interactions

## Sample Data

The application includes sample data for University of Toronto locations:

1. **University of Toronto - St. George Campus**
   - Main campus in downtown Toronto
   - Coordinates: 43.6629, -79.3957

2. **Myhal Centre for Engineering**
   - Engineering building with maker spaces
   - Coordinates: 43.6603, -79.3977

3. **Robarts Library**
   - Largest library at U of T
   - Coordinates: 43.6646, -79.3995

4. **Gerstein Science Information Centre**
   - Science and engineering library
   - Coordinates: 43.6607, -79.3976

5. **Bahen Centre for Information Technology**
   - Computer science building
   - Coordinates: 43.6596, -79.3971

To load sample data:
```bash
cd backend
npm run seed
```

## Keyboard Shortcuts

While the map is focused:
- **+**: Zoom in
- **-**: Zoom out
- **Arrow Keys**: Pan the map
- **Shift + Drag**: Rotate map (if enabled)

## Tips and Tricks

### Finding Coordinates

To find coordinates for a location:

1. **Google Maps**:
   - Right-click on a location
   - Click on the coordinates to copy them
   - Format: Latitude, Longitude

2. **Mapbox**:
   - Visit [https://docs.mapbox.com/help/getting-started/geocoding/](https://docs.mapbox.com/help/getting-started/geocoding/)
   - Use the geocoding API to convert addresses to coordinates

3. **GPS Device**:
   - Use a smartphone GPS app
   - Note the coordinates in decimal format

### Best Practices

1. **Descriptive Names**: Use clear, descriptive names for locations
2. **Detailed Descriptions**: Add useful context and information
3. **Accurate Coordinates**: Double-check coordinates before submitting
4. **Appropriate Categories**: Choose the most relevant category
5. **Regular Updates**: Keep location information current

### Common Use Cases

#### Campus Navigation
- Add all important buildings on campus
- Include descriptions with building codes
- Categorize by function (lab, studio, etc.)

#### Maker Space Directory
- Map all maker spaces in your area
- Include hours of operation in descriptions
- Add equipment information

#### Event Planning
- Mark event locations
- Add setup notes in descriptions
- Track multiple venue options

#### Research Projects
- Document field study locations
- Track data collection points
- Organize by project phase

## Troubleshooting

### Map Not Loading
- Check that Mapbox token is configured in `.env`
- Verify internet connection
- Check browser console for errors

### Locations Not Appearing
- Ensure backend server is running
- Check that MongoDB is connected
- Verify API endpoint is accessible

### Incorrect Marker Positions
- Verify coordinate format (longitude, latitude)
- Check that values are within valid ranges
- Ensure coordinates are in decimal format, not DMS

## Limitations

Current limitations to be aware of:

1. **No Authentication**: Anyone can add/delete locations
2. **No Search**: Must scroll to find specific locations
3. **No Filtering**: Cannot filter by category or other criteria
4. **No Editing**: Cannot edit existing locations (must delete and recreate)
5. **No Images**: Cannot attach photos to locations
6. **No Offline Mode**: Requires internet connection

Many of these limitations are planned for future releases!

## API Usage

For developers wanting to integrate with the API:

```javascript
// Get all locations
fetch('http://localhost:5000/api/locations')
  .then(response => response.json())
  .then(data => console.log(data));

// Create a location
fetch('http://localhost:5000/api/locations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Location',
    description: 'A great place',
    latitude: 43.6532,
    longitude: -79.3832,
    category: 'general'
  })
})
  .then(response => response.json())
  .then(data => console.log(data));
```

## Performance

The application is optimized for performance:

- Efficient geospatial queries using MongoDB 2dsphere index
- React component optimization
- Minimal re-renders
- Fast map rendering with Mapbox GL

For best performance:
- Keep location count under 1000
- Use modern browsers (Chrome, Firefox, Safari, Edge)
- Ensure stable internet connection
- Use a local MongoDB instance for development

## Accessibility

Accessibility features:

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels where appropriate
- High contrast colors
- Readable font sizes

Future accessibility improvements planned:
- Screen reader optimization
- Enhanced keyboard shortcuts
- Color blind friendly palettes
- Zoom accessibility

## Browser Support

Tested and supported browsers:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Note: Internet Explorer is not supported.

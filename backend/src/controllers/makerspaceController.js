const path = require('path');

const getMakerspaces = (req, res) => {
  const filePath = path.join(
    __dirname,
    "../../../frontend/public/makerspaces.geojson"
  );

  // Set proper headers
  res.set({
    "Content-Type": "application/geo+json",
    "Cache-Control": "public, max-age=3600", // Cache for 1 hour
  });

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving GeoJSON:", err);
      res.status(404).json({ error: "GeoJSON file not found" });
    }
  });
};

const getApiStatus = (req, res) => {
  res.json({ message: "API is working!" });
};

module.exports = {
  getMakerspaces,
  getApiStatus,
};
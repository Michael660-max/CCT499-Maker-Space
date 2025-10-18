const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static GeoJSON file (with long/lat data)
app.use("/static", express.static(path.join(__dirname, "../frontend/public")));

// Serve the static GeoJSON file
app.get("/api/makerspaces.geojson", (req, res) => {
  const filePath = path.join(
    __dirname,
    "../frontend/public/makerspaces.geojson"
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
});

// Routes
app.get("/api", (req, res) => {
  res.json({ message: "API is working!" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

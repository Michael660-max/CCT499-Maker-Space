const express = require("express");
require("dotenv").config();

const { setupMiddleware } = require("./src/middleware");
const apiRoutes = require("./src/routes/apiRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const authRoutes = require("./src/routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 8080;

// Setup middleware
setupMiddleware(app);

// Routes
app.use("/api", apiRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Makerspace API Server", 
    status: "running",
    endpoints: {
      health: "/health",
      api: "/api",
      chat: "/api/chat",
      auth: "/api/auth"
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({ 
    error: "Internal server error",
    message: 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

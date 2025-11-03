const express = require("express");
require("dotenv").config();

const { setupMiddleware } = require("./middleware");
const apiRoutes = require("./routes/apiRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const PORT = process.env.PORT || 8080;

// Setup middleware
setupMiddleware(app);

// Routes
app.use("/api", apiRoutes);
app.use("/api/chat", chatRoutes);

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

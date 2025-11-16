const cors = require("cors");
const express = require("express");
const path = require("path");

const setupMiddleware = (app) => {
  // CORS middleware
  app.use(cors());

  // JSON parsing middleware with increased limit for makerspace data
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Static files middleware
  app.use(
    "/static",
    express.static(path.join(__dirname, "../../../frontend/public"))
  );

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
};

module.exports = {
    setupMiddleware
};
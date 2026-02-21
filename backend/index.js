const bodyparser = require("body-parser");
const express = require("express");
const app = express();
const cors = require("cors");
const { connect } = require("./db");
const router = require("./Routes/index");
const port = process.env.PORT || 5001;

// CORS configuration - must be before routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsers
app.use(bodyparser.json({ limit: "50mb" }));
app.use(bodyparser.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json());

// Connect to database
connect();

// Routes
app.get("/", (req, res) => {
  res.send("hello this is internshala backend");
});
app.use("/api", router);

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${port}`);
  console.log(`🌐 Accessible at http://20.101.1.138:${port}`);
  console.log(`🔗 API endpoint: http://20.101.1.138:${port}/api`);
});

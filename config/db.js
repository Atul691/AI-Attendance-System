const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },

  // Better connection handling
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection once
(async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ NeonDB Connected Successfully");
  } catch (err) {
    console.error("❌ Database Connection Failed");
    console.error(err.message);
  }
})();

// Handle unexpected idle disconnects
pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message);
});

module.exports = pool;
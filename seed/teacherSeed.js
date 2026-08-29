const bcrypt = require("bcrypt");
const db = require("../config/db");

async function seedTeacher() {
  try {
    const username = "admin";
    const password = "admin123";

    // Check if teacher already exists
    const check = await db.query(
      "SELECT * FROM teachers WHERE username = $1",
      [username]
    );

    if (check.rows.length > 0) {
      console.log("⚠️ Teacher already exists.");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO teachers (full_name, username, password)
       VALUES ($1, $2, $3)`,
      ["Administrator", username, hashedPassword]
    );

    console.log("✅ Teacher account created successfully!");
    console.log("Username: admin");
    console.log("Password: admin123");

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedTeacher();
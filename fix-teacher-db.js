const db = require("./config/db");

db.query(`
    ALTER TABLE teachers
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150)
`)
.then(() => {
    console.log("? full_name column added successfully");
    process.exit(0);
})
.catch(error => {
    console.error("? ERROR:", error.message);
    process.exit(1);
});

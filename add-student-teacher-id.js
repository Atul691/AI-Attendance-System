const db = require("./config/db");

db.query(`
    ALTER TABLE students
    ADD COLUMN IF NOT EXISTS teacher_id INTEGER
`)
.then(() => {
    console.log("? teacher_id column added to students");
    process.exit(0);
})
.catch(error => {
    console.error("? ERROR:", error.message);
    process.exit(1);
});

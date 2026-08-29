const db = require("./config/db");

db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'students'
    ORDER BY ordinal_position
`)
.then(result => {
    console.table(result.rows);
    process.exit(0);
})
.catch(error => {
    console.error("? ERROR:", error.message);
    process.exit(1);
});

const bcrypt = require("bcrypt");
const db = require("./config/db");

async function createTeacher() {

    const password = await bcrypt.hash("admin123",10);

    await db.query(

        `INSERT INTO teachers(full_name,username,password)

        VALUES($1,$2,$3)`,

        [

            "Admin",

            "admin",

            password

        ]

    );

    console.log("Teacher Created");

    process.exit();

}

createTeacher();
const bcrypt = require("bcrypt");

const db = require("../config/db");

const cloudinary = require("../config/cloudinary");

const streamifier = require("streamifier");

// =====================================================
// HELPER: SAFE FACE DESCRIPTOR PARSER
// =====================================================

function parseFaceDescriptor(value) {

    if (value === undefined || value === null) {
        return null;
    }

    let descriptor = value;

    if (typeof descriptor === "string") {

        if (descriptor.trim() === "") {
            return null;
        }

        try {
            descriptor = JSON.parse(descriptor);
        } catch (error) {
            return null;
        }
    }

    if (!Array.isArray(descriptor)) {
        return null;
    }

    if (descriptor.length !== 128) {
        return null;
    }

    descriptor = descriptor.map((value) => Number(value));

    if (!descriptor.every((value) => Number.isFinite(value))) {
        return null;
    }

    return descriptor;
}

// =====================================================
// HELPER: EUCLIDEAN FACE DISTANCE
// =====================================================

function euclideanDistance(descriptor1, descriptor2) {

    if (
        !Array.isArray(descriptor1) ||
        !Array.isArray(descriptor2)
    ) {
        return Infinity;
    }

    if (
        descriptor1.length !== 128 ||
        descriptor2.length !== 128
    ) {
        return Infinity;
    }

    let sum = 0;

    for (let i = 0; i < 128; i++) {

        const a = Number(descriptor1[i]);
        const b = Number(descriptor2[i]);

        if (
            !Number.isFinite(a) ||
            !Number.isFinite(b)
        ) {
            return Infinity;
        }

        const difference = a - b;

        sum += difference * difference;
    }

    return Math.sqrt(sum);
}

// =====================================================
// STUDENT REGISTER PAGE
// =====================================================

// Teacher login is NOT required.
//
// Direct:
//
// /student/register
//
// With teacher:
//
// /student/register?teacher_id=1
//
// =====================================================

exports.registerPage = async (req, res) => {

    try {

        let teacherId = null;
        let teacher = null;

        // =================================================
        // OPTIONAL TEACHER ID
        // =================================================

        const queryTeacherId =
            req.query &&
            req.query.teacher_id !== undefined
                ? req.query.teacher_id
                : null;

        if (
            queryTeacherId !== null &&
            String(queryTeacherId).trim() !== ""
        ) {

            const parsedTeacherId =
                Number(queryTeacherId);

            if (
                !Number.isInteger(parsedTeacherId) ||
                parsedTeacherId <= 0
            ) {

                return res.status(400).send(
                    "Invalid Teacher ID."
                );
            }

            teacherId = parsedTeacherId;
        }

        // =================================================
        // NO TEACHER ID
        // =================================================

        if (!teacherId) {

            console.log(
                "ℹ️ Student registration opened without teacher."
            );

            return res.render(
                "student/register",
                {
                    teacherId: null,
                    teacher: null
                }
            );
        }

        // =================================================
        // CHECK TEACHER
        // =================================================

        const result = await db.query(
            `
            SELECT
                id,
                username,
                full_name
            FROM teachers
            WHERE id = $1
            LIMIT 1
            `,
            [teacherId]
        );

        // =================================================
        // TEACHER NOT FOUND
        // =================================================

        if (
            !result.rows ||
            result.rows.length === 0
        ) {

            console.log(
                "⚠️ Teacher ID not found:",
                teacherId
            );

            return res.render(
                "student/register",
                {
                    teacherId: null,
                    teacher: null
                }
            );
        }

        // =================================================
        // TEACHER FOUND
        // =================================================

        teacher = result.rows[0];

        console.log(
            "👨‍🏫 Registration Teacher:",
            teacher.full_name
        );

        console.log(
            "👨‍🏫 Teacher ID:",
            teacher.id
        );

        // =================================================
        // RENDER PAGE
        // =================================================

        return res.render(
            "student/register",
            {
                teacherId: teacher.id,
                teacher: teacher
            }
        );

    } catch (error) {

        console.error(
            "❌ STUDENT REGISTER PAGE ERROR:",
            error
        );

        // =================================================
        // PAGE MUST STILL OPEN
        // =================================================

        try {

            return res.render(
                "student/register",
                {
                    teacherId: null,
                    teacher: null
                }
            );

        } catch (renderError) {

            console.error(
                "❌ STUDENT REGISTER PAGE RENDER ERROR:",
                renderError
            );

            return res.status(500).send(
                "Unable to open student registration page."
            );
        }
    }
};

// =====================================================
// STUDENT REGISTER
// =====================================================

exports.register = async (req, res) => {

    try {

        console.log("");
        console.log("========================================");
        console.log("📝 STUDENT REGISTRATION REQUEST");
        console.log("========================================");

        // =================================================
        // REQUEST BODY
        // =================================================

        const body = req.body || {};

        const full_name =
            body.full_name ??
            body.fullName ??
            body.name ??
            "";

        const roll_no =
            body.roll_no ??
            body.rollNo ??
            body.roll ??
            "";

        const email =
            body.email ??
            "";

        const password =
            body.password ??
            "";

        const faceDescriptor =
            body.faceDescriptor ??
            body.face_descriptor ??
            "";

        const teacher_id =
            body.teacher_id ??
            body.teacherId ??
            "";

        // =================================================
        // BASIC VALIDATION
        // =================================================

        if (
            String(full_name).trim() === "" ||
            String(roll_no).trim() === "" ||
            String(email).trim() === "" ||
            String(password).trim() === ""
        ) {

            console.log(
                "❌ Required registration field missing."
            );

            console.log(
                "Received body:",
                Object.keys(body)
            );

            return res.status(400).send(
                "All student registration fields are required."
            );
        }

        const cleanName =
            String(full_name).trim();

        const cleanRollNo =
            String(roll_no).trim();

        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();

        const cleanPassword =
            String(password);

        // =================================================
        // OPTIONAL TEACHER ID
        // =================================================

        let teacherId = null;

        if (
            teacher_id !== undefined &&
            teacher_id !== null &&
            String(teacher_id).trim() !== ""
        ) {

            const parsedTeacherId =
                Number(teacher_id);

            if (
                !Number.isInteger(parsedTeacherId) ||
                parsedTeacherId <= 0
            ) {

                return res.status(400).send(
                    "Invalid Teacher ID."
                );
            }

            teacherId = parsedTeacherId;
        }

        // =================================================
        // OPTIONAL TEACHER
        // =================================================

        let teacher = null;

        if (teacherId) {

            const teacherResult =
                await db.query(
                    `
                    SELECT
                        id,
                        username,
                        full_name
                    FROM teachers
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [teacherId]
                );

            if (
                !teacherResult.rows ||
                teacherResult.rows.length === 0
            ) {

                return res.status(404).send(
                    "Teacher account not found."
                );
            }

            teacher =
                teacherResult.rows[0];

            console.log(
                "👨‍🏫 Teacher:",
                teacher.full_name
            );

            console.log(
                "👨‍🏫 Teacher Username:",
                teacher.username
            );

            console.log(
                "👨‍🏫 Teacher Database ID:",
                teacher.id
            );

        } else {

            console.log(
                "ℹ️ Student is registering without teacher."
            );
        }

        // =================================================
        // NAME VALIDATION
        // =================================================

        if (
            cleanName.length < 2
        ) {

            return res.status(400).send(
                "Please enter a valid student name."
            );
        }

        // =================================================
        // ROLL NUMBER VALIDATION
        // =================================================

        if (
            cleanRollNo.length < 1
        ) {

            return res.status(400).send(
                "Please enter a valid roll number."
            );
        }

        // =================================================
        // EMAIL VALIDATION
        // =================================================

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            cleanEmail.length < 5 ||
            !emailRegex.test(cleanEmail)
        ) {

            return res.status(400).send(
                "Please enter a valid email address."
            );
        }

        // =================================================
        // PASSWORD VALIDATION
        // =================================================

        if (
            cleanPassword.length < 6
        ) {

            return res.status(400).send(
                "Password must be at least 6 characters."
            );
        }

        // =================================================
        // PHOTO VALIDATION
        // =================================================

        if (!req.file) {

            console.log(
                "❌ Student photo missing"
            );

            return res.status(400).send(
                "Please select a face photo."
            );
        }

        if (!req.file.buffer) {

            console.log(
                "❌ Student photo buffer missing"
            );

            return res.status(400).send(
                "Student photo data is missing. Please select the photo again."
            );
        }

        console.log(
            "📷 Photo received:",
            req.file.originalname
        );

        // =================================================
        // FACE DESCRIPTOR
        // =================================================

        if (
            !faceDescriptor ||
            String(faceDescriptor).trim() === ""
        ) {

            return res.status(400).send(
                "Face descriptor not generated. Please capture your face again."
            );
        }

        // =================================================
        // PARSE + VALIDATE DESCRIPTOR
        // =================================================

        const parsedDescriptor =
            parseFaceDescriptor(
                faceDescriptor
            );

        if (!parsedDescriptor) {

            return res.status(400).send(
                "Invalid face descriptor. Expected an array containing 128 numeric values."
            );
        }

        console.log(
            "✅ Face descriptor valid"
        );

        // =================================================
        // CHECK DUPLICATE STUDENT
        // =================================================
        //
        // SAME TEACHER:
        //
        // Same email OR same roll number = BLOCK
        //
        // DIFFERENT TEACHER:
        //
        // Same email AND same roll number = ALLOW
        //
        // Example:
        //
        // Teacher 1 + 101 + abc@gmail.com = allowed
        // Teacher 2 + 101 + abc@gmail.com = allowed
        //
        // =================================================

        let existingStudent;

        if (teacherId) {

            existingStudent =
                await db.query(
                    `
                    SELECT
                        id,
                        teacher_id,
                        full_name,
                        roll_no,
                        email
                    FROM students
                    WHERE teacher_id = $1
                      AND (
                          LOWER(email) = $2
                          OR roll_no = $3
                      )
                    LIMIT 1
                    `,
                    [
                        teacherId,
                        cleanEmail,
                        cleanRollNo
                    ]
                );

        } else {

            // =============================================
            // STUDENT WITHOUT TEACHER
            // =============================================

            existingStudent =
                await db.query(
                    `
                    SELECT
                        id,
                        teacher_id,
                        full_name,
                        roll_no,
                        email
                    FROM students
                    WHERE teacher_id IS NULL
                      AND (
                          LOWER(email) = $1
                          OR roll_no = $2
                      )
                    LIMIT 1
                    `,
                    [
                        cleanEmail,
                        cleanRollNo
                    ]
                );
        }

        // =================================================
        // DUPLICATE FOUND
        // =================================================

        if (
            existingStudent.rows &&
            existingStudent.rows.length > 0
        ) {

            const duplicateStudent =
                existingStudent.rows[0];

            console.log(
                "⚠️ DUPLICATE STUDENT FOUND"
            );

            console.log(
                "Existing Student ID:",
                duplicateStudent.id
            );

            console.log(
                "Existing Teacher ID:",
                duplicateStudent.teacher_id
            );

            console.log(
                "Existing Roll No:",
                duplicateStudent.roll_no
            );

            console.log(
                "Existing Email:",
                duplicateStudent.email
            );

            return res.status(409).send(
                "Student with this email or roll number already exists for this teacher."
            );
        }

        // =================================================
        // CLOUDINARY UPLOAD
        // =================================================

        console.log(
            "☁️ Uploading photo to Cloudinary..."
        );

        let imageUrl;

        try {

            imageUrl =
                await new Promise(
                    (
                        resolve,
                        reject
                    ) => {

                        const uploadStream =
                            cloudinary.uploader.upload_stream(
                                {
                                    folder:
                                        "AI-Attendance-System/Students",

                                    resource_type:
                                        "image"
                                },

                                (
                                    error,
                                    result
                                ) => {

                                    if (error) {

                                        return reject(
                                            error
                                        );
                                    }

                                    if (
                                        !result ||
                                        !result.secure_url
                                    ) {

                                        return reject(
                                            new Error(
                                                "Cloudinary did not return image URL."
                                            )
                                        );
                                    }

                                    resolve(
                                        result.secure_url
                                    );
                                }
                            );

                        streamifier
                            .createReadStream(
                                req.file.buffer
                            )
                            .pipe(
                                uploadStream
                            );
                    }
                );

        } catch (uploadError) {

            console.error(
                "❌ CLOUDINARY ERROR:",
                uploadError
            );

            return res.status(500).send(
                "Student photo could not be uploaded. Please try again."
            );
        }

        console.log(
            "✅ Cloudinary upload successful"
        );

        // =================================================
        // PASSWORD HASH
        // =================================================

        const hashedPassword =
            await bcrypt.hash(
                cleanPassword,
                10
            );

        // =================================================
        // INSERT STUDENT
        // =================================================

        console.log(
            "💾 Saving student to database..."
        );

        const result =
            await db.query(
                `
                INSERT INTO students
                (
                    full_name,
                    roll_no,
                    email,
                    password,
                    image_url,
                    face_descriptor,
                    approved,
                    teacher_id
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8
                )
                RETURNING
                    id,
                    full_name,
                    roll_no,
                    email,
                    approved,
                    teacher_id
                `,
                [
                    cleanName,
                    cleanRollNo,
                    cleanEmail,
                    hashedPassword,
                    imageUrl,
                    JSON.stringify(
                        parsedDescriptor
                    ),
                    false,
                    teacherId
                ]
            );

        // =================================================
        // INSERT FAILED
        // =================================================

        if (
            !result.rows ||
            result.rows.length === 0
        ) {

            return res.status(500).send(
                "Student could not be registered."
            );
        }

        const student =
            result.rows[0];

        // =================================================
        // LOG
        // =================================================

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "✅ STUDENT REGISTERED"
        );

        console.log(
            "Student ID:",
            student.id
        );

        console.log(
            "Name:",
            student.full_name
        );

        console.log(
            "Roll No:",
            student.roll_no
        );

        console.log(
            "Email:",
            student.email
        );

        console.log(
            "Teacher ID:",
            student.teacher_id
        );

        console.log(
            "Approved:",
            student.approved
        );

        console.log(
            "========================================"
        );

        // =================================================
        // SUCCESS PAGE
        // =================================================

        const teacherName =
            teacher
                ? teacher.full_name
                : "Not assigned yet";

        const teacherIdText =
            teacher
                ? teacher.id
                : "Pending";

        return res.send(`
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
    STARK AI - Registration Successful
</title>

<style>

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family:
        Arial,
        Helvetica,
        sans-serif;
}

body {

    min-height: 100vh;

    display: flex;

    justify-content: center;

    align-items: center;

    padding: 20px;

    background:
        radial-gradient(
            circle at top,
            #4b0808 0%,
            #140509 35%,
            #050816 70%,
            #02040b 100%
        );

    color: white;
}

.box {

    width: 520px;

    max-width: 100%;

    padding: 42px;

    text-align: center;

    background:
        rgba(
            10,
            14,
            25,
            0.97
        );

    border:
        1px solid
        rgba(
            255,
            60,
            20,
            0.55
        );

    border-radius: 22px;

    box-shadow:
        0 0 25px
        rgba(
            255,
            50,
            20,
            0.25
        ),
        0 0 70px
        rgba(
            255,
            30,
            10,
            0.12
        );
}

.arc {

    width: 82px;

    height: 82px;

    margin:
        0 auto 20px;

    display: flex;

    justify-content: center;

    align-items: center;

    border-radius: 50%;

    background:
        radial-gradient(
            circle,
            #ffffff 0%,
            #00eaff 18%,
            #008cff 45%,
            #07111e 48%,
            #02040b 70%
        );

    box-shadow:
        0 0 15px
        #00eaff,

        0 0 40px
        rgba(
            0,
            234,
            255,
            0.6
        );

    font-size: 30px;
}

h1 {

    color: #ff3b20;

    margin-bottom: 12px;

    letter-spacing: 2px;
}

h2 {

    color: #00eaff;

    margin-bottom: 18px;
}

p {

    color: #b9dbe5;

    line-height: 1.7;

    margin-bottom: 8px;
}

.teacher {

    margin-top: 20px;

    padding: 16px;

    border:
        1px solid
        rgba(
            0,
            234,
            255,
            0.25
        );

    border-radius: 12px;

    background:
        rgba(
            0,
            234,
            255,
            0.05
        );
}

.teacher-name {

    color: #00eaff;

    font-size: 18px;

    font-weight: bold;

    margin-top: 5px;
}

.pending {

    margin-top: 16px;

    padding: 13px;

    border:
        1px solid
        rgba(
            255,
            180,
            0,
            0.35
        );

    border-radius: 10px;

    color: #ffd166;

    background:
        rgba(
            255,
            180,
            0,
            0.06
        );
}

a {

    display: inline-block;

    margin-top: 24px;

    padding:
        14px 30px;

    background:
        linear-gradient(
            90deg,
            #ff2d20,
            #ff6a00
        );

    color: white;

    text-decoration: none;

    border-radius: 10px;

    font-weight: bold;

    box-shadow:
        0 0 18px
        rgba(
            255,
            50,
            20,
            0.25
        );
}

a:hover {

    box-shadow:
        0 0 30px
        rgba(
            255,
            60,
            20,
            0.55
        );
}

.status {

    margin-top: 20px;

    color: #00ff99;

    font-weight: bold;

    letter-spacing: 1px;
}

</style>

</head>

<body>

<div class="box">

    <div class="arc">
        ⚡
    </div>

    <h1>
        STARK AI
    </h1>

    <h2>
        Registration Successful
    </h2>

    <p>
        Your face has been registered successfully.
    </p>

    <p>
        Your account is waiting for Teacher Approval.
    </p>

    <div class="teacher">

        <p>
            Registered Under Teacher
        </p>

        <div class="teacher-name">
            ${teacherName}
        </div>

        <p style="margin-top:5px;">
            Teacher ID: ${teacherIdText}
        </p>

    </div>

    ${
        teacher
            ? `
        <div class="status">
            ⚡ TEACHER LINKED
        </div>
        `
            : `
        <div class="pending">
            ⚠ TEACHER NOT ASSIGNED YET
            <br>
            Your registration is waiting for teacher assignment.
        </div>
        `
    }

    <a href="/student/login">
        Go to Student Login
    </a>

</div>

</body>

</html>
        `);

    } catch (error) {

        console.error("");

        console.error(
            "========================================"
        );

        console.error(
            "❌ STUDENT REGISTER ERROR"
        );

        console.error(
            "========================================"
        );

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "CODE:",
            error.code
        );

        console.error(
            "DETAIL:",
            error.detail
        );

        console.error(
            "TABLE:",
            error.table
        );

        console.error(
            "COLUMN:",
            error.column
        );

        console.error(
            "CONSTRAINT:",
            error.constraint
        );

        console.error(
            "========================================"
        );

        // =================================================
        // DUPLICATE DATABASE ERROR
        // =================================================

        if (
            error.code === "23505"
        ) {

            return res.status(409).send(
                "Student with this email or roll number already exists for this teacher."
            );
        }

        // =================================================
        // FOREIGN KEY ERROR
        // =================================================

        if (
            error.code === "23503"
        ) {

            return res.status(400).send(
                "Invalid teacher or student database reference."
            );
        }

        // =================================================
        // NOT NULL ERROR
        // =================================================

        if (
            error.code === "23502"
        ) {

            return res.status(500).send(
                "Database does not allow empty Teacher ID. Make students.teacher_id nullable."
            );
        }

        // =================================================
        // COLUMN DOES NOT EXIST
        // =================================================

        if (
            error.code === "42703"
        ) {

            return res.status(500).send(
                "Database column is missing. Check the students table."
            );
        }

        // =================================================
        // TABLE DOES NOT EXIST
        // =================================================

        if (
            error.code === "42P01"
        ) {

            return res.status(500).send(
                "Students database table is missing."
            );
        }

        // =================================================
        // INVALID DATA TYPE
        // =================================================

        if (
            error.code === "22P02"
        ) {

            return res.status(400).send(
                "Invalid student registration data."
            );
        }

        return res.status(500).send(
            "Server Error while registering student."
        );
    }
};

// =====================================================
// STUDENT LOGIN PAGE
// =====================================================

exports.loginPage = (req, res) => {

    try {

        return res.render(
            "student/login"
        );

    } catch (error) {

        console.error(
            "❌ STUDENT LOGIN PAGE ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to open student login page."
        );
    }
};

// =====================================================
// STUDENT LOGIN
// =====================================================
//
// SAME EMAIL CAN EXIST UNDER MULTIPLE TEACHERS.
//
// LOGIN FINDS ALL STUDENTS WITH EMAIL
// AND CHECKS PASSWORD.
//
// AFTER LOGIN:
// SESSION STORES EMAIL.
// ATTENDANCE USES EMAIL + SELECTED SESSION
// TO FIND THE CORRECT TEACHER'S STUDENT RECORD.
//
// =====================================================

exports.login = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body || {};

        // =================================================
        // BASIC LOGIN VALIDATION
        // =================================================

        if (
            !email ||
            !password
        ) {

            return res.status(400).send(
                "Email and password are required."
            );
        }

        const cleanEmail =
            String(email)
                .trim()
                .toLowerCase();

        // =================================================
        // FIND ALL STUDENTS WITH THIS EMAIL
        // =================================================

        const result =
            await db.query(
                `
                SELECT
                    id,
                    full_name,
                    roll_no,
                    email,
                    password,
                    image_url,
                    face_descriptor,
                    approved,
                    teacher_id
                FROM students
                WHERE LOWER(email) = $1
                ORDER BY id DESC
                `,
                [cleanEmail]
            );

        // =================================================
        // NO STUDENT FOUND
        // =================================================

        if (
            !result.rows ||
            result.rows.length === 0
        ) {

            return res.status(401).send(
                "Invalid Email or Password."
            );
        }

        // =================================================
        // FIND STUDENT USING PASSWORD
        // =================================================

        let student = null;

        for (
            const candidate
            of result.rows
        ) {

            const validPassword =
                await bcrypt.compare(
                    String(password),
                    candidate.password
                );

            if (validPassword) {

                student = candidate;

                break;
            }
        }

        // =================================================
        // PASSWORD DOES NOT MATCH
        // =================================================

        if (!student) {

            return res.status(401).send(
                "Invalid Email or Password."
            );
        }

        // =================================================
        // APPROVAL CHECK
        // =================================================

        if (
            !student.approved
        ) {

            return res.status(403).send(
                "Your account is waiting for Teacher Approval."
            );
        }

        // =================================================
        // CREATE STUDENT SESSION
        // =================================================
        //
        // IMPORTANT:
        //
        // teacher_id is kept for existing dashboard/session
        // compatibility.
        //
        // Attendance will NOT be restricted to this teacher.
        //
        // It will load all active sessions for the student's
        // email and let the student select one.
        //
        // =================================================

        req.session.student = {

            id:
                student.id,

            full_name:
                student.full_name,

            roll_no:
                student.roll_no,

            email:
                student.email,

            image_url:
                student.image_url,

            approved:
                student.approved,

            teacher_id:
                student.teacher_id
        };

        // =================================================
        // LOG
        // =================================================

        console.log(
            "✅ STUDENT LOGIN"
        );

        console.log(
            "Student:",
            student.full_name
        );

        console.log(
            "Student ID:",
            student.id
        );

        console.log(
            "Roll No:",
            student.roll_no
        );

        console.log(
            "Email:",
            student.email
        );

        console.log(
            "Teacher ID:",
            student.teacher_id
        );

        // =================================================
        // REDIRECT
        // =================================================

        return res.redirect(
            "/student/dashboard"
        );

    } catch (error) {

        console.error(
            "❌ STUDENT LOGIN ERROR:",
            error
        );

        if (
            error.code === "42703"
        ) {

            return res.status(500).send(
                "Student database column is missing."
            );
        }

        if (
            error.code === "42P01"
        ) {

            return res.status(500).send(
                "Students database table is missing."
            );
        }

        return res.status(500).send(
            "Server Error while logging in."
        );
    }
};

// =====================================================
// STUDENT DASHBOARD
// =====================================================

exports.dashboard = (req, res) => {

    if (
        !req.session ||
        !req.session.student
    ) {

        return res.redirect(
            "/student/login"
        );
    }

    return res.render(
        "student/dashboard",
        {
            student:
                req.session.student
        }
    );
};

// =====================================================
// STUDENT LOGOUT
// =====================================================

exports.logout = (req, res) => {

    if (!req.session) {

        return res.redirect(
            "/student/login"
        );
    }

    req.session.destroy(
        (error) => {

            if (error) {

                console.error(
                    "❌ STUDENT LOGOUT ERROR:",
                    error
                );
            }

            return res.redirect(
                "/student/login"
            );
        }
    );
};

// =====================================================
// ATTENDANCE PAGE
// =====================================================
//
// IMPORTANT CHANGE:
//
// OLD:
// Student's linked teacher ka sirf ek session.
//
// NEW:
// Student ke email se linked ALL teachers ke
// active sessions show honge.
//
// Example:
//
// Teacher A -> AI Class
// Teacher B -> DBMS Class
//
// Dono active hain:
//
// AI Class
// DBMS Class
//
// Student khud select karega.
// =====================================================

exports.attendancePage = async (req, res) => {

    try {

        // =================================================
        // LOGIN CHECK
        // =================================================

        if (
            !req.session ||
            !req.session.student
        ) {

            return res.redirect(
                "/student/login"
            );
        }

        // =================================================
        // STUDENT EMAIL
        // =================================================

        const studentEmail =
            String(
                req.session.student.email || ""
            )
                .trim()
                .toLowerCase();

        // =================================================
        // STUDENT WITHOUT EMAIL
        // =================================================

        if (!studentEmail) {

            return res.render(
                "student/attendance",
                {
                    student:
                        req.session.student,

                    activeSession:
                        null,

                    activeSessions:
                        []
                }
            );
        }

        // =================================================
        // GET ALL ACTIVE SESSIONS
        // FOR ALL TEACHERS OF THIS STUDENT
        // =================================================

        const sessionResult =
            await db.query(
                `
                SELECT
                    attendance_sessions.id,
                    attendance_sessions.session_name,
                    attendance_sessions.is_active,
                    attendance_sessions.created_by,
                    teachers.full_name AS teacher_name,
                    teachers.username AS teacher_username
                FROM attendance_sessions
                INNER JOIN students
                    ON students.teacher_id =
                       attendance_sessions.created_by
                LEFT JOIN teachers
                    ON teachers.id =
                       attendance_sessions.created_by
                WHERE attendance_sessions.is_active = true
                  AND LOWER(students.email) = $1
                  AND students.approved = true
                GROUP BY
                    attendance_sessions.id,
                    attendance_sessions.session_name,
                    attendance_sessions.is_active,
                    attendance_sessions.created_by,
                    teachers.full_name,
                    teachers.username
                ORDER BY attendance_sessions.id DESC
                `,
                [studentEmail]
            );

        const activeSessions =
            sessionResult.rows || [];

        // =================================================
        // OLD VARIABLE COMPATIBILITY
        // =================================================

        const activeSession =
            activeSessions.length > 0
                ? activeSessions[0]
                : null;

        // =================================================
        // LOG
        // =================================================

        console.log(
            "========================================"
        );

        console.log(
            "🟢 STUDENT ATTENDANCE PAGE"
        );

        console.log(
            "Student Email:",
            studentEmail
        );

        console.log(
            "Active Sessions:",
            activeSessions.length
        );

        activeSessions.forEach(
            (session) => {

                console.log(
                    "Session:",
                    session.session_name
                );

                console.log(
                    "Session ID:",
                    session.id
                );

                console.log(
                    "Teacher ID:",
                    session.created_by
                );

                console.log(
                    "Teacher:",
                    session.teacher_name
                );
            }
        );

        console.log(
            "========================================"
        );

        // =================================================
        // RENDER ATTENDANCE PAGE
        // =================================================

        return res.render(
            "student/attendance",
            {
                student:
                    req.session.student,

                activeSession:
                    activeSession,

                activeSessions:
                    activeSessions
            }
        );

    } catch (error) {

        console.error(
            "❌ ATTENDANCE PAGE ERROR:",
            error
        );

        if (
            error.code === "42P01"
        ) {

            return res.status(500).send(
                "Attendance sessions table is missing."
            );
        }

        if (
            error.code === "42703"
        ) {

            return res.status(500).send(
                "Attendance session database column is missing."
            );
        }

        return res.status(500).send(
            "Unable to load attendance page."
        );
    }
};

// =====================================================
// MARK ATTENDANCE
// =====================================================
//
// IMPORTANT CHANGE:
//
// OLD:
// Attendance automatically used student's teacher.
//
// NEW:
// Student sends selected session_id.
//
// Example:
//
// Teacher A session = 10
// Teacher B session = 20
//
// Student selects 20.
//
// Attendance goes into session 20.
//
// Therefore attendance in session 10 does NOT block
// attendance in session 20.
//
// =====================================================

exports.markAttendance = async (req, res) => {

    try {

        // =================================================
        // LOGIN CHECK
        // =================================================

        if (
            !req.session ||
            !req.session.student
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Student login required."
            });
        }

        const loggedStudentId =
            Number(
                req.session.student.id
            );

        const studentEmail =
            String(
                req.session.student.email || ""
            )
                .trim()
                .toLowerCase();

        // =================================================
        // STUDENT ID CHECK
        // =================================================

        if (
            !Number.isInteger(loggedStudentId) ||
            loggedStudentId <= 0
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Invalid student session."
            });
        }

        // =================================================
        // EMAIL CHECK
        // =================================================

        if (!studentEmail) {

            return res.status(400).json({
                success: false,
                message:
                    "Student email is missing from session."
            });
        }

        // =================================================
        // REQUEST BODY
        // =================================================

        if (
            !req.body
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Attendance request data missing."
            });
        }

        // =================================================
        // SELECTED SESSION ID
        // =================================================

        const requestedSessionId =
            req.body.session_id ??
            req.body.sessionId ??
            req.body.attendance_session_id ??
            null;

        const selectedSessionId =
            Number(
                requestedSessionId
            );

        if (
            !Number.isInteger(selectedSessionId) ||
            selectedSessionId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Please select an attendance session."
            });
        }

        // =================================================
        // FACE DESCRIPTOR
        // =================================================

        let faceDescriptor =
            req.body.faceDescriptor ??
            req.body.face_descriptor ??
            null;

        if (
            !faceDescriptor
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Face descriptor not received."
            });
        }

        // =================================================
        // PARSE + VALIDATE DESCRIPTOR
        // =================================================

        faceDescriptor =
            parseFaceDescriptor(
                faceDescriptor
            );

        if (!faceDescriptor) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid face descriptor. Expected 128 numeric values."
            });
        }

        // =================================================
        // GET SELECTED SESSION
        // =================================================

        const sessionResult =
            await db.query(
                `
                SELECT
                    id,
                    session_name,
                    is_active,
                    created_by
                FROM attendance_sessions
                WHERE id = $1
                  AND is_active = true
                LIMIT 1
                `,
                [selectedSessionId]
            );

        // =================================================
        // SESSION NOT FOUND
        // =================================================

        if (
            !sessionResult.rows ||
            sessionResult.rows.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Selected attendance session is not active."
            });
        }

        const activeSession =
            sessionResult.rows[0];

        const selectedTeacherId =
            Number(
                activeSession.created_by
            );

        // =================================================
        // TEACHER ID CHECK
        // =================================================

        if (
            !Number.isInteger(selectedTeacherId) ||
            selectedTeacherId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid teacher for selected session."
            });
        }

        // =================================================
        // GET STUDENT FOR SELECTED TEACHER
        // =================================================
        //
        // IMPORTANT:
        //
        // Same email can exist under:
        //
        // Teacher 1
        // Teacher 2
        //
        // We find the student record belonging to
        // the selected session's teacher.
        //
        // =================================================

        const studentResult =
            await db.query(
                `
                SELECT
                    id,
                    full_name,
                    roll_no,
                    email,
                    face_descriptor,
                    approved,
                    teacher_id
                FROM students
                WHERE LOWER(email) = $1
                  AND teacher_id = $2
                ORDER BY id DESC
                LIMIT 1
                `,
                [
                    studentEmail,
                    selectedTeacherId
                ]
            );

        // =================================================
        // STUDENT NOT FOUND FOR SELECTED TEACHER
        // =================================================

        if (
            !studentResult.rows ||
            studentResult.rows.length === 0
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "You are not registered under the teacher of this session."
            });
        }

        const student =
            studentResult.rows[0];

        const studentId =
            Number(
                student.id
            );

        // =================================================
        // STUDENT ID CHECK
        // =================================================

        if (
            !Number.isInteger(studentId) ||
            studentId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid student database record."
            });
        }

        // =================================================
        // TEACHER LINK CHECK
        // =================================================

        if (
            Number(student.teacher_id) !==
            selectedTeacherId
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Student teacher association is invalid."
            });
        }

        // =================================================
        // APPROVAL CHECK
        // =================================================

        if (
            !student.approved
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Student is not approved by teacher."
            });
        }

        // =================================================
        // REGISTERED FACE
        // =================================================

        if (
            !student.face_descriptor
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Registered face data not found."
            });
        }

        // =================================================
        // PARSE STORED FACE
        // =================================================

        const registeredDescriptor =
            parseFaceDescriptor(
                student.face_descriptor
            );

        if (
            !registeredDescriptor
        ) {

            console.error(
                "❌ STORED FACE DESCRIPTOR INVALID"
            );

            return res.status(500).json({
                success: false,
                message:
                    "Registered face data is invalid or corrupted."
            });
        }

        // =================================================
        // FACE MATCH
        // =================================================

        const distance =
            euclideanDistance(
                faceDescriptor,
                registeredDescriptor
            );

        console.log(
            "📏 Face Distance:",
            distance
        );

        if (
            !Number.isFinite(distance)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Unable to compare faces."
            });
        }

        // =================================================
        // FACE MATCH THRESHOLD
        // =================================================

        const FACE_MATCH_THRESHOLD =
            0.55;

        if (
            distance >
            FACE_MATCH_THRESHOLD
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Face does not match your registered face."
            });
        }

        console.log(
            "✅ FACE MATCHED"
        );

        // =================================================
        // DUPLICATE ATTENDANCE CHECK
        // =================================================
        //
        // VERY IMPORTANT:
        //
        // Student + Session + Date
        //
        // Only same session is duplicate.
        //
        // Teacher A session:
        //
        // student 101 + session 10 = marked
        //
        // Teacher B session:
        //
        // student 102 + session 20 = ALLOWED
        //
        // =================================================

        const duplicateResult =
            await db.query(
                `
                SELECT
                    id
                FROM attendance
                WHERE student_id = $1
                  AND session_id = $2
                  AND attendance_date = CURRENT_DATE
                LIMIT 1
                `,
                [
                    studentId,
                    activeSession.id
                ]
            );

        if (
            duplicateResult.rows &&
            duplicateResult.rows.length > 0
        ) {

            return res.status(409).json({
                success: false,
                message:
                    "Attendance already marked for this session today."
            });
        }

        // =================================================
        // INSERT ATTENDANCE
        // =================================================

        const attendanceResult =
            await db.query(
                `
                INSERT INTO attendance
                (
                    student_id,
                    session_id,
                    attendance_date,
                    attendance_time,
                    marked_by
                )
                VALUES
                (
                    $1,
                    $2,
                    CURRENT_DATE,
                    CURRENT_TIME,
                    $3
                )
                RETURNING
                    id,
                    attendance_date,
                    attendance_time
                `,
                [
                    studentId,
                    activeSession.id,
                    "student-face"
                ]
            );

        // =================================================
        // INSERT FAILED
        // =================================================

        if (
            !attendanceResult.rows ||
            attendanceResult.rows.length === 0
        ) {

            return res.status(500).json({
                success: false,
                message:
                    "Attendance could not be saved."
            });
        }

        const attendance =
            attendanceResult.rows[0];

        // =================================================
        // LOG
        // =================================================

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "✅ ATTENDANCE MARKED"
        );

        console.log(
            "Student:",
            student.full_name
        );

        console.log(
            "Student ID:",
            studentId
        );

        console.log(
            "Student Email:",
            student.email
        );

        console.log(
            "Teacher ID:",
            selectedTeacherId
        );

        console.log(
            "Session:",
            activeSession.session_name
        );

        console.log(
            "Session ID:",
            activeSession.id
        );

        console.log(
            "Attendance ID:",
            attendance.id
        );

        console.log(
            "Face Distance:",
            Number(
                distance.toFixed(4)
            )
        );

        console.log(
            "========================================"
        );

        // =================================================
        // SUCCESS RESPONSE
        // =================================================

        return res.status(200).json({

            success: true,

            message:
                "Attendance Marked Successfully.",

            attendance: {

                id:
                    attendance.id,

                date:
                    attendance.attendance_date,

                time:
                    attendance.attendance_time,

                session:
                    activeSession.session_name,

                sessionId:
                    activeSession.id,

                teacherId:
                    selectedTeacherId,

                faceDistance:
                    Number(
                        distance.toFixed(4)
                    )
            }
        });

    } catch (error) {

        console.error("");

        console.error(
            "========================================"
        );

        console.error(
            "❌ MARK ATTENDANCE ERROR"
        );

        console.error(
            "========================================"
        );

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "CODE:",
            error.code
        );

        console.error(
            "DETAIL:",
            error.detail
        );

        console.error(
            "TABLE:",
            error.table
        );

        console.error(
            "COLUMN:",
            error.column
        );

        console.error(
            "CONSTRAINT:",
            error.constraint
        );

        console.error(
            "========================================"
        );

        if (
            error.code === "23505"
        ) {

            return res.status(409).json({
                success: false,
                message:
                    "Attendance is already marked."
            });
        }

        if (
            error.code === "23503"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid student or attendance session."
            });
        }

        if (
            error.code === "42703"
        ) {

            return res.status(500).json({
                success: false,
                message:
                    "Attendance database column configuration error."
            });
        }

        if (
            error.code === "42P01"
        ) {

            return res.status(500).json({
                success: false,
                message:
                    "Attendance or session database table is missing."
            });
        }

        if (
            error.code === "22P02"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid attendance data type."
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to mark attendance. Please try again."
        });
    }
};

// =====================================================
// ACTIVE ATTENDANCE SESSION API
// GET /student/active-session
// =====================================================
//
// RETURNS ALL ACTIVE SESSIONS AVAILABLE TO STUDENT.
//
// =====================================================

exports.activeSession = async (req, res) => {

    try {

        // =================================================
        // LOGIN CHECK
        // =================================================

        if (
            !req.session ||
            !req.session.student
        ) {

            return res.status(401).json({
                success: false,
                active: false,
                sessions: [],
                message:
                    "Student login required."
            });
        }

        // =================================================
        // STUDENT EMAIL
        // =================================================

        const studentEmail =
            String(
                req.session.student.email || ""
            )
                .trim()
                .toLowerCase();

        // =================================================
        // NO EMAIL
        // =================================================

        if (!studentEmail) {

            return res.status(200).json({
                success: true,
                active: false,
                sessions: [],
                message:
                    "Student email is missing."
            });
        }

        // =================================================
        // GET ALL ACTIVE SESSIONS
        // =================================================

        const result =
            await db.query(
                `
                SELECT
                    attendance_sessions.id,
                    attendance_sessions.session_name,
                    attendance_sessions.is_active,
                    attendance_sessions.created_by,
                    teachers.full_name AS teacher_name,
                    teachers.username AS teacher_username
                FROM attendance_sessions
                INNER JOIN students
                    ON students.teacher_id =
                       attendance_sessions.created_by
                LEFT JOIN teachers
                    ON teachers.id =
                       attendance_sessions.created_by
                WHERE attendance_sessions.is_active = true
                  AND LOWER(students.email) = $1
                  AND students.approved = true
                GROUP BY
                    attendance_sessions.id,
                    attendance_sessions.session_name,
                    attendance_sessions.is_active,
                    attendance_sessions.created_by,
                    teachers.full_name,
                    teachers.username
                ORDER BY attendance_sessions.id DESC
                `,
                [studentEmail]
            );

        const sessions =
            result.rows || [];

        // =================================================
        // NO ACTIVE SESSION
        // =================================================

        if (
            sessions.length === 0
        ) {

            return res.status(200).json({
                success: true,
                active: false,
                sessions: [],
                message:
                    "No active attendance session."
            });
        }

        // =================================================
        // LOG
        // =================================================

        console.log(
            "========================================"
        );

        console.log(
            "🟢 ACTIVE SESSION API"
        );

        console.log(
            "Student Email:",
            studentEmail
        );

        console.log(
            "Active Sessions:",
            sessions.length
        );

        sessions.forEach(
            (session) => {

                console.log(
                    "Session:",
                    session.session_name
                );

                console.log(
                    "Session ID:",
                    session.id
                );

                console.log(
                    "Teacher ID:",
                    session.created_by
                );

                console.log(
                    "Teacher:",
                    session.teacher_name
                );
            }
        );

        console.log(
            "========================================"
        );

        // =================================================
        // SUCCESS
        // =================================================

        return res.status(200).json({

            success: true,

            active: true,

            sessions:
                sessions
        });

    } catch (error) {

        console.error("");

        console.error(
            "========================================"
        );

        console.error(
            "❌ ACTIVE SESSION API ERROR"
        );

        console.error(
            "========================================"
        );

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "CODE:",
            error.code
        );

        console.error(
            "DETAIL:",
            error.detail
        );

        console.error(
            "TABLE:",
            error.table
        );

        console.error(
            "COLUMN:",
            error.column
        );

        console.error(
            "========================================"
        );

        if (
            error.code === "42P01"
        ) {

            return res.status(500).json({
                success: false,
                active: false,
                sessions: [],
                message:
                    "attendance_sessions table is missing."
            });
        }

        if (
            error.code === "42703"
        ) {

            return res.status(500).json({
                success: false,
                active: false,
                sessions: [],
                message:
                    "Attendance session database column is missing."
            });
        }

        return res.status(500).json({
            success: false,
            active: false,
            sessions: [],
            message:
                "Unable to check attendance session."
        });
    }
};
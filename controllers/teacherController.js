const bcrypt = require("bcrypt");
const path = require("path");
const db = require("../config/db");

// =====================================================
// SAFE HTML ESCAPE
// =====================================================

const escapeHtml = (value) => {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

};

// =====================================================
// ATTENDANCE RETENTION SETUP
// =====================================================
// Attendance session end hone ke 24 hours baad
// attendance records cleanup honge.
//
// ended_at column automatically create ho jayega
// agar attendance_sessions table mein pehle se nahi hai.
// =====================================================

const ensureAttendanceRetention = async () => {

    try {

        await db.query(`
            ALTER TABLE attendance_sessions
            ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP
        `);

    } catch (error) {

        console.error(
            "❌ ATTENDANCE RETENTION COLUMN ERROR:",
            error.message
        );

    }

};

// =====================================================
// CLEAN ATTENDANCE OLDER THAN 24 HOURS
// =====================================================

const cleanupExpiredAttendance = async () => {

    try {

        await ensureAttendanceRetention();

        const result = await db.query(`
            DELETE FROM attendance a
            USING attendance_sessions s
            WHERE a.session_id = s.id
              AND s.is_active = false
              AND s.ended_at IS NOT NULL
              AND s.ended_at <= NOW() - INTERVAL '24 hours'
        `);

        if (result.rowCount > 0) {

            console.log(
                `🧹 Expired attendance removed: ${result.rowCount}`
            );

        }

    } catch (error) {

        console.error(
            "❌ ATTENDANCE CLEANUP ERROR:",
            error.message
        );

    }

};

// =====================================================
// TEACHER REGISTER PAGE
// =====================================================

exports.registerPage = (req, res) => {

    try {

        return res.render(
            "teacher/register"
        );

    } catch (error) {

        console.error(
            "❌ TEACHER REGISTER PAGE ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to open teacher registration page."
        );

    }

};

// =====================================================
// TEACHER REGISTER
// =====================================================

exports.register = async (req, res) => {

    try {

        console.log("");
        console.log("======================================");
        console.log("📝 TEACHER REGISTRATION REQUEST");
        console.log("======================================");

        const {
            full_name,
            username,
            password,
            confirm_password
        } = req.body || {};

        // =================================================
        // BASIC VALIDATION
        // =================================================

        if (
            !full_name ||
            !username ||
            !password ||
            !confirm_password
        ) {

            return res.status(400).send(
                "All teacher registration fields are required."
            );

        }

        const cleanName =
            String(full_name).trim();

        const cleanUsername =
            String(username).trim();

        // =================================================
        // NAME VALIDATION
        // =================================================

        if (cleanName.length < 2) {

            return res.status(400).send(
                "Please enter a valid teacher name."
            );

        }

        // =================================================
        // TEACHER ID VALIDATION
        // =================================================

        if (cleanUsername.length < 3) {

            return res.status(400).send(
                "Teacher ID must contain at least 3 characters."
            );

        }

        // =================================================
        // PASSWORD VALIDATION
        // =================================================

        if (String(password).length < 6) {

            return res.status(400).send(
                "Password must be at least 6 characters."
            );

        }

        // =================================================
        // CONFIRM PASSWORD
        // =================================================

        if (
            String(password) !==
            String(confirm_password)
        ) {

            return res.status(400).send(
                "Password and Confirm Password do not match."
            );

        }

        // =================================================
        // CHECK DUPLICATE TEACHER ID
        // =================================================

        const existingTeacher =
            await db.query(
                `
                SELECT id
                FROM teachers
                WHERE username = $1
                LIMIT 1
                `,
                [cleanUsername]
            );

        if (
            existingTeacher.rows.length > 0
        ) {

            return res.status(409).send(
                "Teacher ID already exists. Please choose another Teacher ID."
            );

        }

        // =================================================
        // HASH PASSWORD
        // =================================================

        const hashedPassword =
            await bcrypt.hash(
                String(password),
                10
            );

        // =================================================
        // INSERT TEACHER
        // =================================================

        const result =
            await db.query(
                `
                INSERT INTO teachers
                (
                    full_name,
                    username,
                    password
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                RETURNING
                    id,
                    full_name,
                    username
                `,
                [
                    cleanName,
                    cleanUsername,
                    hashedPassword
                ]
            );

        if (
            !result.rows ||
            result.rows.length === 0
        ) {

            return res.status(500).send(
                "Teacher account could not be created."
            );

        }

        const teacher =
            result.rows[0];

        console.log(
            "✅ TEACHER ACCOUNT CREATED"
        );

        console.log(
            "Teacher Name:",
            teacher.full_name
        );

        console.log(
            "Teacher ID:",
            teacher.username
        );

        console.log(
            "Teacher Database ID:",
            teacher.id
        );

        // =================================================
        // SAFE TEACHER ID
        // =================================================

        const safeTeacherUsername =
            escapeHtml(
                teacher.username
            );

        // =================================================
        // SUCCESS PAGE
        // =================================================

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
    Teacher Registration Successful
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
            #073b55 0%,
            #050816 50%,
            #02040b 100%
        );

    color: white;

}

.box {

    width: 480px;

    max-width: 100%;

    padding: 40px;

    text-align: center;

    background:
        rgba(
            13,
            21,
            41,
            0.96
        );

    border:
        1px solid
        rgba(
            0,
            234,
            255,
            0.3
        );

    border-radius: 20px;

    box-shadow:
        0 0 35px
        rgba(
            0,
            234,
            255,
            0.18
        );

}

.icon {

    font-size: 60px;

    margin-bottom: 15px;

}

h2 {

    color: #00ff99;

    margin-bottom: 15px;

}

p {

    color: #b9dbe5;

    line-height: 1.7;

    margin-bottom: 8px;

}

.teacher-id {

    color: #00eaff;

    font-size: 18px;

    font-weight: bold;

    margin-top: 15px;

}

a {

    display: inline-block;

    margin-top: 22px;

    padding: 13px 28px;

    background:
        linear-gradient(
            90deg,
            #00d4ff,
            #008cff
        );

    color: white;

    text-decoration: none;

    border-radius: 10px;

    font-weight: bold;

}

a:hover {

    box-shadow:
        0 0 20px
        rgba(
            0,
            212,
            255,
            0.5
        );

}

</style>

</head>

<body>

<div class="box">

    <div class="icon">
        ✅
    </div>

    <h2>
        Teacher Account Created
    </h2>

    <p>
        Your Teacher account has been created successfully.
    </p>

    <p>
        Your Teacher ID is:
    </p>

    <div class="teacher-id">
        ${safeTeacherUsername}
    </div>

    <p style="margin-top:15px;">
        You can now login using your Teacher ID and Password.
    </p>

    <a href="/teacher/login">
        Go to Teacher Login
    </a>

</div>

</body>

</html>

        `);

    } catch (error) {

        console.error("");
        console.error("======================================");
        console.error("❌ TEACHER REGISTER ERROR");
        console.error("======================================");

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
            "======================================"
        );

        if (error.code === "23505") {

            return res.status(409).send(
                "Teacher ID already exists."
            );

        }

        if (error.code === "42P01") {

            return res.status(500).send(
                "Teachers database table is missing."
            );

        }

        if (error.code === "42703") {

            return res.status(500).send(
                "Teacher database column is missing."
            );

        }

        return res.status(500).send(
            "Server Error while creating teacher account."
        );

    }

};

// =====================================================
// TEACHER LOGIN PAGE
// =====================================================

exports.loginPage = (req, res) => {

    try {

        return res.render(
            "teacher/login"
        );

    } catch (error) {

        console.error(
            "❌ TEACHER LOGIN PAGE ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to open teacher login page."
        );

    }

};

// =====================================================
// TEACHER LOGIN
// =====================================================

exports.login = async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body || {};

        if (!username || !password) {

            return res.status(400).send(
                "Username and password are required."
            );

        }

        const cleanUsername =
            String(username).trim();

        if (cleanUsername.length === 0) {

            return res.status(400).send(
                "Username and password are required."
            );

        }

        const result =
            await db.query(
                `
                SELECT
                    id,
                    username,
                    full_name,
                    password
                FROM teachers
                WHERE username = $1
                LIMIT 1
                `,
                [cleanUsername]
            );

        if (result.rows.length === 0) {

            return res.status(401).send(
                "Invalid username or password."
            );

        }

        const teacher =
            result.rows[0];

        if (
            !teacher.password ||
            typeof teacher.password !== "string"
        ) {

            console.error(
                "❌ INVALID TEACHER PASSWORD HASH"
            );

            return res.status(500).send(
                "Teacher account password data is invalid."
            );

        }

        const validPassword =
            await bcrypt.compare(
                String(password),
                teacher.password
            );

        if (!validPassword) {

            return res.status(401).send(
                "Invalid username or password."
            );

        }

        // =================================================
        // REGENERATE SESSION
        // =================================================

        req.session.regenerate(
            (error) => {

                if (error) {

                    console.error(
                        "Teacher Session Error:",
                        error
                    );

                    return res.status(500).send(
                        "Unable to create teacher session."
                    );

                }

                // =================================================
                // SAVE LOGGED-IN TEACHER
                // =================================================

                req.session.teacher = {

                    id:
                        teacher.id,

                    username:
                        teacher.username,

                    full_name:
                        teacher.full_name

                };

                req.session.save(
                    (saveError) => {

                        if (saveError) {

                            console.error(
                                "Teacher Session Save Error:",
                                saveError
                            );

                            return res.status(500).send(
                                "Unable to save teacher session."
                            );

                        }

                        return res.redirect(
                            "/teacher/dashboard"
                        );

                    }
                );

            }
        );

    } catch (error) {

        console.error(
            "❌ TEACHER LOGIN ERROR:",
            error
        );

        return res.status(500).send(
            "Server error while logging in."
        );

    }

};

// =====================================================
// TEACHER DASHBOARD
// =====================================================

exports.dashboard = async (req, res) => {

    try {

        // =================================================
        // CHECK LOGIN
        // =================================================

        if (!req.session.teacher) {

            return res.redirect(
                "/teacher/login"
            );

        }

        // =================================================
        // NEW FEATURE:
        // CLEAN ATTENDANCE OLDER THAN 24 HOURS
        // =================================================

        await cleanupExpiredAttendance();

        // =================================================
        // GET LOGGED-IN TEACHER ID
        // =================================================

        const teacherId =
            Number(
                req.session.teacher.id
            );

        if (
            !Number.isInteger(teacherId) ||
            teacherId <= 0
        ) {

            return res.redirect(
                "/teacher/login"
            );

        }

        // =================================================
        // ALL STUDENTS OF THIS TEACHER ONLY
        // =================================================

        const studentsResult =
            await db.query(
                `
                SELECT
                    id,
                    full_name,
                    roll_no,
                    email,
                    image_url,
                    approved,
                    created_at,
                    teacher_id
                FROM students
                WHERE teacher_id = $1
                ORDER BY id DESC
                `,
                [teacherId]
            );

        const students =
            studentsResult.rows;

        // =================================================
        // PENDING STUDENTS OF THIS TEACHER ONLY
        // =================================================

        const pendingStudentsResult =
            await db.query(
                `
                SELECT
                    id,
                    full_name,
                    roll_no,
                    email,
                    image_url,
                    approved,
                    created_at,
                    teacher_id
                FROM students
                WHERE teacher_id = $1
                  AND approved = false
                ORDER BY id DESC
                `,
                [teacherId]
            );

        const pendingStudents =
            pendingStudentsResult.rows;

        // =================================================
        // APPROVED STUDENTS OF THIS TEACHER ONLY
        // =================================================

        const approvedStudentsResult =
            await db.query(
                `
                SELECT
                    id,
                    full_name,
                    roll_no,
                    email,
                    image_url,
                    approved,
                    created_at,
                    teacher_id
                FROM students
                WHERE teacher_id = $1
                  AND approved = true
                ORDER BY id DESC
                `,
                [teacherId]
            );

        const approvedStudents =
            approvedStudentsResult.rows;

        // =================================================
        // ACTIVE SESSION
        // =================================================

        const activeSessionResult =
            await db.query(
                `
                SELECT
                    id,
                    session_name,
                    is_active,
                    created_by,
                    created_at,
                    ended_at
                FROM attendance_sessions
                WHERE created_by = $1
                  AND is_active = true
                ORDER BY id DESC
                LIMIT 1
                `,
                [teacherId]
            );

        const activeSession =
            activeSessionResult.rows.length > 0
                ? activeSessionResult.rows[0]
                : null;

        // =================================================
        // DISPLAY SESSION
        // =================================================
        // Active session ho to active session.
        //
        // Agar session end ho chuka hai aur uske end hone
        // ke 24 hours complete nahi hue, to woh session
        // attendance display ke liye milega.
        // =================================================

        let displaySession =
            activeSession;

        if (!displaySession) {

            const recentSessionResult =
                await db.query(
                    `
                    SELECT
                        id,
                        session_name,
                        is_active,
                        created_by,
                        created_at,
                        ended_at
                    FROM attendance_sessions
                    WHERE created_by = $1
                      AND is_active = false
                      AND ended_at IS NOT NULL
                      AND ended_at > NOW() - INTERVAL '24 hours'
                    ORDER BY ended_at DESC
                    LIMIT 1
                    `,
                    [teacherId]
                );

            if (
                recentSessionResult.rows.length > 0
            ) {

                displaySession =
                    recentSessionResult.rows[0];

            }

        }

        // =================================================
        // ALL SESSIONS OF THIS TEACHER
        // =================================================

        const sessionsResult =
            await db.query(
                `
                SELECT
                    id,
                    session_name,
                    is_active,
                    created_by,
                    created_at,
                    ended_at
                FROM attendance_sessions
                WHERE created_by = $1
                ORDER BY id DESC
                `,
                [teacherId]
            );

        const sessions =
            sessionsResult.rows;

        // =================================================
        // ATTENDANCE
        // =================================================
        // IMPORTANT:
        //
        // Pehle sirf activeSession ki attendance show hoti thi.
        // Is wajah se session end karte hi dashboard se
        // attendance gayab ho jaati thi.
        //
        // Ab displaySession active ya recently-ended session
        // dono ho sakta hai.
        // =================================================

        let attendance = [];

        if (displaySession) {

            const attendanceResult =
                await db.query(
                    `
                    SELECT
                        a.id,
                        a.student_id,
                        a.session_id,
                        a.attendance_date,
                        a.attendance_time,
                        a.marked_by,

                        s.full_name,
                        s.roll_no,
                        s.email,
                        s.image_url

                    FROM attendance a

                    INNER JOIN students s
                        ON s.id = a.student_id

                    WHERE a.session_id = $1
                      AND s.teacher_id = $2

                    ORDER BY a.attendance_time DESC
                    `,
                    [
                        displaySession.id,
                        teacherId
                    ]
                );

            attendance =
                attendanceResult.rows;

        }

        // =================================================
        // ATTENDANCE COUNT
        // =================================================

        let attendanceCount = 0;

        if (displaySession) {

            const attendanceCountResult =
                await db.query(
                    `
                    SELECT COUNT(*) AS count

                    FROM attendance a

                    INNER JOIN students s
                        ON s.id = a.student_id

                    WHERE a.session_id = $1
                      AND s.teacher_id = $2
                    `,
                    [
                        displaySession.id,
                        teacherId
                    ]
                );

            attendanceCount =
                Number(
                    attendanceCountResult.rows[0].count
                );

        }

        // =================================================
        // COUNTS
        // =================================================

        const totalStudents =
            students.length;

        const pendingCount =
            pendingStudents.length;

        const approvedCount =
            approvedStudents.length;

        // =================================================
        // RENDER DASHBOARD
        // =================================================

        return res.render(
            "teacher/dashboard",
            {

                teacher:
                    req.session.teacher,

                students,

                pendingStudents,

                approvedStudents,

                activeSession,

                displaySession,

                sessions,

                attendance,

                attendanceCount,

                totalStudents,

                pendingCount,

                approvedCount

            }
        );

    } catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "❌ TEACHER DASHBOARD ERROR"
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
            "======================================"
        );

        return res.status(500).send(
            "Unable to load teacher dashboard."
        );

    }

};

// =====================================================
// APPROVE STUDENT
// =====================================================

exports.approveStudent = async (req, res) => {

    try {

        // =================================================
        // CHECK TEACHER LOGIN
        // =================================================

        if (!req.session.teacher) {

            return res.redirect(
                "/teacher/login"
            );

        }

        // =================================================
        // GET STUDENT ID
        // =================================================

        const studentId =
            Number(
                req.params.id
            );

        // =================================================
        // GET TEACHER ID
        // =================================================

        const teacherId =
            Number(
                req.session.teacher.id
            );

        if (
            !Number.isInteger(studentId) ||
            studentId <= 0
        ) {

            return res.status(400).send(
                "Invalid student ID."
            );

        }

        if (
            !Number.isInteger(teacherId) ||
            teacherId <= 0
        ) {

            return res.redirect(
                "/teacher/login"
            );

        }

        // =================================================
        // APPROVE ONLY THIS TEACHER'S STUDENT
        // =================================================

        const result =
            await db.query(
                `
                UPDATE students

                SET approved = true

                WHERE id = $1
                  AND teacher_id = $2

                RETURNING id
                `,
                [
                    studentId,
                    teacherId
                ]
            );

        if (
            result.rows.length === 0
        ) {

            return res.status(404).send(
                "Student not found for this teacher."
            );

        }

        return res.redirect(
            "/teacher/dashboard"
        );

    } catch (error) {

        console.error(
            "❌ APPROVE STUDENT ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to approve student."
        );

    }

};

// =====================================================
// CREATE ATTENDANCE SESSION
// =====================================================

exports.createSession = async (req, res) => {

    try {

        // =================================================
        // CHECK LOGIN
        // =================================================

        if (!req.session.teacher) {

            return res.redirect(
                "/teacher/login"
            );

        }

        // =================================================
        // CLEANUP EXPIRED ATTENDANCE
        // =================================================

        await cleanupExpiredAttendance();

        // =================================================
        // ENSURE ENDED_AT COLUMN
        // =================================================

        await ensureAttendanceRetention();

        const {
            session_name
        } = req.body || {};

        if (
            !session_name ||
            !String(session_name).trim()
        ) {

            return res.status(400).send(
                "Session name is required."
            );

        }

        const cleanSessionName =
            String(session_name).trim();

        const teacherId =
            Number(
                req.session.teacher.id
            );

        if (
            !Number.isInteger(teacherId) ||
            teacherId <= 0
        ) {

            return res.redirect(
                "/teacher/login"
            );

        }

        // =================================================
        // CLOSE OLD ACTIVE SESSION
        // =================================================

        // IMPORTANT:
        // Old session ki attendance delete nahi hogi.
        // Sirf session inactive hoga aur ended_at set hoga.
        // =================================================

        await db.query(
            `
            UPDATE attendance_sessions

            SET
                is_active = false,
                ended_at = COALESCE(ended_at, NOW())

            WHERE created_by = $1
              AND is_active = true
            `,
            [teacherId]
        );

        // =================================================
        // CREATE NEW SESSION
        // =================================================

        const result =
            await db.query(
                `
                INSERT INTO attendance_sessions
                (
                    session_name,
                    is_active,
                    created_by,
                    ended_at
                )

                VALUES
                (
                    $1,
                    true,
                    $2,
                    NULL
                )

                RETURNING
                    id,
                    session_name,
                    is_active,
                    created_by,
                    created_at,
                    ended_at
                `,
                [
                    cleanSessionName,
                    teacherId
                ]
            );

        if (
            !result.rows ||
            result.rows.length === 0
        ) {

            return res.status(500).send(
                "Attendance session could not be created."
            );

        }

        console.log(
            "✅ Attendance Session Created:",
            result.rows[0]
        );

        return res.redirect(
            "/teacher/dashboard"
        );

    } catch (error) {

        console.error(
            "❌ CREATE SESSION ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to create attendance session."
        );

    }

};

// =====================================================
// END SESSION
// =====================================================

exports.endSession = async (req, res) => {

    try {

        // =================================================
        // CHECK LOGIN
        // =================================================

        if (!req.session.teacher) {

            return res.redirect(
                "/teacher/login"
            );

        }

        // =================================================
        // ENSURE RETENTION COLUMN
        // =================================================

        await ensureAttendanceRetention();

        // =================================================
        // CLEAN OLD ATTENDANCE
        // =================================================

        await cleanupExpiredAttendance();

        // =================================================
        // SESSION ID
        // =================================================

        const sessionId =
            Number(
                req.params.id
            );

        // =================================================
        // TEACHER ID
        // =================================================

        const teacherId =
            Number(
                req.session.teacher.id
            );

        if (
            !Number.isInteger(sessionId) ||
            sessionId <= 0
        ) {

            return res.status(400).send(
                "Invalid session ID."
            );

        }

        if (
            !Number.isInteger(teacherId) ||
            teacherId <= 0
        ) {

            return res.redirect(
                "/teacher/login"
            );

        }

        // =================================================
        // END ONLY THIS TEACHER'S SESSION
        // =================================================
        //
        // IMPORTANT:
        // Attendance DELETE nahi hogi.
        //
        // ended_at = NOW()
        //
        // Iske baad attendance 24 hours tak rahegi.
        // =================================================

        const result =
            await db.query(
                `
                UPDATE attendance_sessions

                SET
                    is_active = false,
                    ended_at = NOW()

                WHERE id = $1
                  AND created_by = $2

                RETURNING
                    id,
                    session_name,
                    is_active,
                    created_by,
                    created_at,
                    ended_at
                `,
                [
                    sessionId,
                    teacherId
                ]
            );

        if (
            result.rows.length === 0
        ) {

            return res.status(404).send(
                "Attendance session not found."
            );

        }

        console.log(
            "✅ Attendance Session Ended:",
            result.rows[0]
        );

        console.log(
            "🕒 Attendance will remain available for 24 hours."
        );

        return res.redirect(
            "/teacher/dashboard"
        );

    } catch (error) {

        console.error(
            "❌ END SESSION ERROR:",
            error
        );

        return res.status(500).send(
            "Unable to end attendance session."
        );

    }

};

// =====================================================
// TEACHER LOGOUT
// =====================================================
// =====================================================
// JARVIS AI COMMAND PROCESSOR
// HINDI + HINGLISH + ENGLISH
// =====================================================

// =====================================================
// JARVIS AI COMMAND PROCESSOR
// HINDI + HINGLISH + ENGLISH
// EXISTING FEATURES + NEW ADVANCED FEATURES
// =====================================================

exports.jarvisCommand = async (req, res) => {

    try {

        // =================================================
        // CHECK TEACHER LOGIN
        // =================================================

        if (!req.session.teacher) {

            return res.status(401).json({

                success: false,

                response:
                    "Please login first."

            });

        }

        const {

            command

        } = req.body || {};

        if (!command) {

            return res.status(400).json({

                success: false,

                response:
                    "Jarvis did not receive any command."

            });

        }

        // =================================================
        // CLEAN COMMAND
        // =================================================

        let cleanCommand =
            String(command)
                .toLowerCase()
                .trim();

        console.log("");
        console.log("======================================");
        console.log("🤖 JARVIS COMMAND");
        console.log("======================================");
        console.log(cleanCommand);
        console.log("======================================");

        const teacherId =
            Number(req.session.teacher.id);

        if (

            !Number.isInteger(teacherId) ||

            teacherId <= 0

        ) {

            return res.status(401).json({

                success: false,

                response:
                    "Teacher session is invalid."

            });

        }

        // =================================================
        // REMOVE WAKE WORD
        // =================================================

        cleanCommand =
            cleanCommand
                .replace(/^jarvis[\s,]*/i, "")
                .trim();

        // =================================================
        // HELLO / HI / CONVERSATION
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand === "hello" ||

            cleanCommand === "hi" ||

            cleanCommand.includes("hello jarvis") ||

            cleanCommand.includes("hi jarvis") ||

            cleanCommand.includes("namaste") ||

            cleanCommand.includes("नमस्ते") ||

            cleanCommand.includes("hello") ||

            cleanCommand.includes("kaise ho") ||

            cleanCommand.includes("how are you")

        ) {

            const responses = [

                "Hello sir. Jarvis online and ready.",

                "Hello. How can I help you today?",

                "Namaste sir. Jarvis is ready.",

                "Hello sir. All systems are operational."

            ];

            const response =
                responses[
                    Math.floor(
                        Math.random() *
                        responses.length
                    )
                ];

            return res.json({

                success: true,

                action: "conversation",

                response

            });

        }

        // =================================================
        // JARVIS SYSTEM STATUS
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("system status") ||

            cleanCommand.includes("jarvis status") ||

            cleanCommand.includes("system check") ||

            cleanCommand.includes("systems operational") ||

            cleanCommand.includes("system kaisa hai") ||

            cleanCommand.includes("system status batao")

        ) {

            const studentResult =
                await db.query(

                    `
                    SELECT COUNT(*) AS count

                    FROM students

                    WHERE teacher_id = $1
                    `,

                    [teacherId]

                );

            const sessionResult =
                await db.query(

                    `
                    SELECT
                        id,
                        session_name

                    FROM attendance_sessions

                    WHERE created_by = $1

                    AND is_active = true

                    ORDER BY id DESC

                    LIMIT 1
                    `,

                    [teacherId]

                );

            const studentCount =
                Number(studentResult.rows[0].count);

            const activeSession =
                sessionResult.rows.length > 0
                    ? sessionResult.rows[0]
                    : null;

            return res.json({

                success: true,

                action: "system_status",

                response:
                    activeSession
                        ? `All systems are operational. You have ${studentCount} registered students and the active session is ${activeSession.session_name}.`
                        : `All systems are operational. You have ${studentCount} registered students and there is currently no active attendance session.`

            });

        }

        // =================================================
        // HELP COMMAND
        // EXISTING + UPDATED FEATURES
        // =================================================

        if (

            cleanCommand.includes("help") ||

            cleanCommand.includes("madad") ||

            cleanCommand.includes("मदद") ||

            cleanCommand.includes("kya kar sakte ho")

        ) {

            return res.json({

                success: true,

                action: "help",

                response:
                    "I can tell you student count, pending students, approved students, student details, search by name, roll number or email, approve students, session status, attendance count, attendance percentage, present students, absent students, create sessions, end sessions, session history, latest session, latest registered student, teacher information, today's attendance summary, registration statistics, dashboard navigation, refresh dashboard and system status."

            });

        }

        // =================================================
        // TOTAL STUDENT COUNT
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("student count") ||

            cleanCommand.includes("total student") ||

            cleanCommand.includes("kitne student") ||

            cleanCommand.includes("how many student") ||

            cleanCommand.includes("students kitne") ||

            cleanCommand.includes("कितने स्टूडेंट")

        ) {

            const result =
                await db.query(

                    `
                    SELECT COUNT(*) AS count

                    FROM students

                    WHERE teacher_id = $1
                    `,

                    [teacherId]

                );

            const count =
                Number(result.rows[0].count);

            return res.json({

                success: true,

                action: "student_count",

                count,

                response:
                    `You currently have ${count} registered students.`

            });

        }

        // =================================================
        // PENDING STUDENT COUNT
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("pending student") ||

            cleanCommand.includes("pending count") ||

            cleanCommand.includes("kitne pending") ||

            cleanCommand.includes("pending students batao")

        ) {

            const result =
                await db.query(

                    `
                    SELECT COUNT(*) AS count

                    FROM students

                    WHERE teacher_id = $1

                    AND approved = false
                    `,

                    [teacherId]

                );

            const count =
                Number(result.rows[0].count);

            return res.json({

                success: true,

                action: "pending_count",

                count,

                response:
                    `There are currently ${count} pending students.`

            });

        }

        // =================================================
        // PENDING STUDENT NAMES
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("pending student names") ||

            cleanCommand.includes("pending students ke naam") ||

            cleanCommand.includes("pending names batao") ||

            cleanCommand.includes("kaun kaun pending hai") ||

            cleanCommand.includes("pending students dikhao")

        ) {

            const result =
                await db.query(

                    `
                    SELECT
                        full_name,
                        roll_no

                    FROM students

                    WHERE teacher_id = $1

                    AND approved = false

                    ORDER BY full_name ASC

                    LIMIT 20
                    `,

                    [teacherId]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "pending_student_names",

                    students: [],

                    response:
                        "There are currently no pending students."

                });

            }

            const names =
                result.rows
                    .map(
                        student =>
                            `${student.full_name} (${student.roll_no})`
                    )
                    .join(", ");

            return res.json({

                success: true,

                action: "pending_student_names",

                students:
                    result.rows,

                response:
                    `Pending students are: ${names}.`

            });

        }

        // =================================================
        // APPROVED STUDENT COUNT
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("approved count") ||

            cleanCommand.includes("how many approved") ||

            cleanCommand.includes("approved students count")

        ) {

            const result =
                await db.query(

                    `
                    SELECT COUNT(*) AS count

                    FROM students

                    WHERE teacher_id = $1

                    AND approved = true
                    `,

                    [teacherId]

                );

            const count =
                Number(result.rows[0].count);

            return res.json({

                success: true,

                action: "approved_count",

                count,

                response:
                    `${count} students are approved.`

            });

        }

        // =================================================
        // APPROVED STUDENT NAMES
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("approved student names") ||

            cleanCommand.includes("approved students ke naam") ||

            cleanCommand.includes("approved names batao") ||

            cleanCommand.includes("kaun kaun approved hai")

        ) {

            const result =
                await db.query(

                    `
                    SELECT
                        full_name,
                        roll_no

                    FROM students

                    WHERE teacher_id = $1

                    AND approved = true

                    ORDER BY full_name ASC

                    LIMIT 20
                    `,

                    [teacherId]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "approved_student_names",

                    students: [],

                    response:
                        "There are currently no approved students."

                });

            }

            const names =
                result.rows
                    .map(
                        student =>
                            `${student.full_name} (${student.roll_no})`
                    )
                    .join(", ");

            return res.json({

                success: true,

                action: "approved_student_names",

                students:
                    result.rows,

                response:
                    `Approved students are: ${names}.`

            });

        }

        // =================================================
        // TEACHER INFORMATION
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("teacher information") ||

            cleanCommand.includes("my information") ||

            cleanCommand.includes("my profile") ||

            cleanCommand.includes("teacher details") ||

            cleanCommand.includes("mera profile") ||

            cleanCommand.includes("meri information")

        ) {

            const result =
                await db.query(

                    `
                    SELECT
                        id,
                        full_name,
                        username

                    FROM teachers

                    WHERE id = $1

                    LIMIT 1
                    `,

                    [teacherId]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: false,

                    action: "teacher_information",

                    response:
                        "Teacher information could not be found."

                });

            }

            const teacher =
                result.rows[0];

            return res.json({

                success: true,

                action: "teacher_information",

                teacher,

                response:
                    `Your name is ${teacher.full_name} and your Teacher ID is ${teacher.username}.`

            });

        }

        // =================================================
        // SESSION STATUS
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("session status") ||

            cleanCommand.includes("active session") ||

            cleanCommand.includes("session chal raha") ||

            cleanCommand.includes("session batao") ||

            cleanCommand.includes("current session")

        ) {

            const result =
                await db.query(

                    `
                    SELECT
                        id,
                        session_name

                    FROM attendance_sessions

                    WHERE created_by = $1

                    AND is_active = true

                    ORDER BY id DESC

                    LIMIT 1
                    `,

                    [teacherId]

                );

            if (
                result.rows.length === 0
            ) {

                return res.json({

                    success: true,

                    action: "session_status",

                    active: false,

                    response:
                        "There is currently no active attendance session."

                });

            }

            const session =
                result.rows[0];

            return res.json({

                success: true,

                action: "session_status",

                active: true,

                session,

                response:
                    `The active session is ${session.session_name}.`

            });

        }

        // =================================================
        // LATEST SESSION INFORMATION
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("latest session") ||

            cleanCommand.includes("last session") ||

            cleanCommand.includes("recent session") ||

            cleanCommand.includes("latest session information") ||

            cleanCommand.includes("last session batao")

        ) {

            const result =
                await db.query(

                    `
                    SELECT
                        id,
                        session_name,
                        is_active,
                        created_at,
                        ended_at

                    FROM attendance_sessions

                    WHERE created_by = $1

                    ORDER BY id DESC

                    LIMIT 1
                    `,

                    [teacherId]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "latest_session",

                    response:
                        "No attendance session has been created yet."

                });

            }

            const session =
                result.rows[0];

            return res.json({

                success: true,

                action: "latest_session",

                session,

                response:
                    session.is_active
                        ? `The latest session is ${session.session_name} and it is currently active.`
                        : `The latest session was ${session.session_name} and it has ended.`

            });

        }

        // =================================================
        // SESSION HISTORY
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("session history") ||

            cleanCommand.includes("show sessions") ||

            cleanCommand.includes("all sessions") ||

            cleanCommand.includes("session list") ||

            cleanCommand.includes("sessions dikhao")

        ) {

            const result =
                await db.query(

                    `
                    SELECT
                        id,
                        session_name,
                        is_active,
                        created_at,
                        ended_at

                    FROM attendance_sessions

                    WHERE created_by = $1

                    ORDER BY id DESC

                    LIMIT 20
                    `,

                    [teacherId]

                );

            return res.json({

                success: true,

                action: "session_history",

                sessions:
                    result.rows,

                response:
                    `I found ${result.rows.length} attendance sessions.`

            });

        }

        // =================================================
        // ATTENDANCE COUNT
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("attendance count") ||

            cleanCommand.includes("kitni attendance") ||

            cleanCommand.includes("how many attendance") ||

            cleanCommand.includes("attendance kitne")

        ) {

            const sessionResult =
                await db.query(

                    `
                    SELECT id, session_name

                    FROM attendance_sessions

                    WHERE created_by = $1

                    AND is_active = true

                    ORDER BY id DESC

                    LIMIT 1
                    `,

                    [teacherId]

                );

            if (
                sessionResult.rows.length === 0
            ) {

                return res.json({

                    success: true,

                    action: "attendance_count",

                    response:
                        "There is no active session, so attendance count is not available."

                });

            }

            const session =
                sessionResult.rows[0];

            const attendanceResult =
                await db.query(

                    `
                    SELECT COUNT(*) AS count

                    FROM attendance a

                    INNER JOIN students s

                    ON s.id = a.student_id

                    WHERE a.session_id = $1

                    AND s.teacher_id = $2
                    `,

                    [
                        session.id,
                        teacherId
                    ]

                );

            const count =
                Number(
                    attendanceResult.rows[0].count
                );

            return res.json({

                success: true,

                action: "attendance_count",

                count,

                response:
                    `${count} students have marked attendance in the current session.`

            });

        }

        // =================================================
        // PRESENT STUDENTS LIST
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("present students") ||

            cleanCommand.includes("who is present") ||

            cleanCommand.includes("present student list") ||

            cleanCommand.includes("present students dikhao") ||

            cleanCommand.includes("kaun present hai")

        ) {

            const sessionResult =
                await db.query(

                    `
                    SELECT id

                    FROM attendance_sessions

                    WHERE created_by = $1

                    AND is_active = true

                    ORDER BY id DESC

                    LIMIT 1
                    `,

                    [teacherId]

                );

            if (sessionResult.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "present_students",

                    students: [],

                    response:
                        "There is no active attendance session."

                });

            }

            const sessionId =
                sessionResult.rows[0].id;

            const result =
                await db.query(

                    `
                    SELECT
                        s.id,
                        s.full_name,
                        s.roll_no,
                        s.email

                    FROM attendance a

                    INNER JOIN students s

                    ON s.id = a.student_id

                    WHERE a.session_id = $1

                    AND s.teacher_id = $2

                    ORDER BY s.full_name ASC
                    `,

                    [
                        sessionId,
                        teacherId
                    ]

                );

            return res.json({

                success: true,

                action: "present_students",

                students:
                    result.rows,

                response:
                    `${result.rows.length} students are currently present.`

            });

        }

        // =================================================
        // ABSENT STUDENTS LIST
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("absent students") ||

            cleanCommand.includes("who is absent") ||

            cleanCommand.includes("absent student list") ||

            cleanCommand.includes("absent students dikhao") ||

            cleanCommand.includes("kaun absent hai")

        ) {

            const sessionResult =
                await db.query(

                    `
                    SELECT id

                    FROM attendance_sessions

                    WHERE created_by = $1

                    AND is_active = true

                    ORDER BY id DESC

                    LIMIT 1
                    `,

                    [teacherId]

                );

            if (sessionResult.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "absent_students",

                    students: [],

                    response:
                        "There is no active attendance session."

                });

            }

            const sessionId =
                sessionResult.rows[0].id;

            const result =
                await db.query(

                    `
                    SELECT
                        s.id,
                        s.full_name,
                        s.roll_no,
                        s.email

                    FROM students s

                    WHERE s.teacher_id = $1

                    AND s.approved = true

                    AND s.id NOT IN
                    (
                        SELECT student_id

                        FROM attendance

                        WHERE session_id = $2
                    )

                    ORDER BY s.full_name ASC
                    `,

                    [
                        teacherId,
                        sessionId
                    ]

                );

            return res.json({

                success: true,

                action: "absent_students",

                students:
                    result.rows,

                response:
                    `${result.rows.length} approved students are currently absent.`

            });

        }

        // =================================================
        // ATTENDANCE PERCENTAGE
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("attendance percentage") ||

            cleanCommand.includes("attendance percent") ||

            cleanCommand.includes("percentage batao") ||

            cleanCommand.includes("attendance percentage batao")

        ) {

            const sessionResult =
                await db.query(

                    `
                    SELECT id

                    FROM attendance_sessions

                    WHERE created_by = $1

                    AND is_active = true

                    ORDER BY id DESC

                    LIMIT 1
                    `,

                    [teacherId]

                );

            if (sessionResult.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "attendance_percentage",

                    response:
                        "There is no active attendance session."

                });

            }

            const sessionId =
                sessionResult.rows[0].id;

            const totalResult =
                await db.query(

                    `
                    SELECT COUNT(*) AS count

                    FROM students

                    WHERE teacher_id = $1

                    AND approved = true
                    `,

                    [teacherId]

                );

            const attendanceResult =
                await db.query(

                    `
                    SELECT COUNT(*) AS count

                    FROM attendance

                    WHERE session_id = $1
                    `,

                    [sessionId]

                );

            const totalStudents =
                Number(totalResult.rows[0].count);

            const presentStudents =
                Number(attendanceResult.rows[0].count);

            const percentage =
                totalStudents > 0
                    ? Number(
                        (
                            presentStudents /
                            totalStudents *
                            100
                        ).toFixed(2)
                    )
                    : 0;

            return res.json({

                success: true,

                action: "attendance_percentage",

                totalStudents,

                presentStudents,

                percentage,

                response:
                    `The current attendance percentage is ${percentage} percent.`

            });

        }

        // =================================================
        // TODAY'S ATTENDANCE SUMMARY
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("today attendance") ||

            cleanCommand.includes("today's attendance") ||

            cleanCommand.includes("attendance summary") ||

            cleanCommand.includes("aaj ki attendance") ||

            cleanCommand.includes("aaj attendance batao")

        ) {

            const result =
                await db.query(

                    `
                    SELECT COUNT(*) AS count

                    FROM attendance a

                    INNER JOIN students s

                    ON s.id = a.student_id

                    WHERE s.teacher_id = $1

                    AND DATE(a.attendance_date) = CURRENT_DATE
                    `,

                    [teacherId]

                );

            const count =
                Number(result.rows[0].count);

            return res.json({

                success: true,

                action: "today_attendance_summary",

                count,

                response:
                    `${count} attendance records have been marked today.`

            });

        }

        // =================================================
        // STUDENT REGISTRATION STATISTICS
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("registration statistics") ||

            cleanCommand.includes("student statistics") ||

            cleanCommand.includes("registration stats") ||

            cleanCommand.includes("student stats")

        ) {

            const result =
                await db.query(

                    `
                    SELECT

                        COUNT(*) AS total,

                        COUNT(*)
                        FILTER
                        (
                            WHERE approved = true
                        ) AS approved,

                        COUNT(*)
                        FILTER
                        (
                            WHERE approved = false
                        ) AS pending

                    FROM students

                    WHERE teacher_id = $1
                    `,

                    [teacherId]

                );

            const stats =
                result.rows[0];

            return res.json({

                success: true,

                action: "registration_statistics",

                total:
                    Number(stats.total),

                approved:
                    Number(stats.approved),

                pending:
                    Number(stats.pending),

                response:
                    `You have ${stats.total} total students, ${stats.approved} approved students and ${stats.pending} pending students.`

            });

        }

        // =================================================
        // LATEST REGISTERED STUDENT
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("latest student") ||

            cleanCommand.includes("newest student") ||

            cleanCommand.includes("latest registered student") ||

            cleanCommand.includes("last registered student") ||

            cleanCommand.includes("naya student kaun hai")

        ) {

            const result =
                await db.query(

                    `
                    SELECT
                        id,
                        full_name,
                        roll_no,
                        email,
                        approved,
                        created_at

                    FROM students

                    WHERE teacher_id = $1

                    ORDER BY created_at DESC

                    LIMIT 1
                    `,

                    [teacherId]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "latest_student",

                    response:
                        "No student has been registered yet."

                });

            }

            const student =
                result.rows[0];

            return res.json({

                success: true,

                action: "latest_student",

                student,

                response:
                    `The latest registered student is ${student.full_name} with roll number ${student.roll_no}.`

            });

        }

        // =================================================
        // STUDENT DETAILS BY NAME
        // NEW FEATURE
        // =================================================

        const detailsMatch =
            cleanCommand.match(

                /(?:student details|details of student|student information|student ki details|student details batao)\s+(.+)/i

            );

        if (detailsMatch) {

            const studentName =
                detailsMatch[1].trim();

            const result =
                await db.query(

                    `
                    SELECT
                        id,
                        full_name,
                        roll_no,
                        email,
                        approved,
                        created_at

                    FROM students

                    WHERE teacher_id = $1

                    AND LOWER(full_name)
                    LIKE LOWER($2)

                    ORDER BY full_name ASC

                    LIMIT 10
                    `,

                    [
                        teacherId,
                        `%${studentName}%`
                    ]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "student_details",

                    students: [],

                    response:
                        `I could not find any student named ${studentName}.`

                });

            }

            return res.json({

                success: true,

                action: "student_details",

                students:
                    result.rows,

                response:
                    `I found ${result.rows.length} student record matching ${studentName}.`

            });

        }

        // =================================================
        // SEARCH STUDENT BY ROLL NUMBER
        // NEW FEATURE
        // =================================================

        const rollMatch =
            cleanCommand.match(

                /(?:search roll|find roll|roll number|search by roll|roll no)\s+(.+)/i

            );

        if (rollMatch) {

            const rollNo =
                rollMatch[1].trim();

            const result =
                await db.query(

                    `
                    SELECT
                        id,
                        full_name,
                        roll_no,
                        email,
                        approved

                    FROM students

                    WHERE teacher_id = $1

                    AND LOWER(roll_no)
                    = LOWER($2)

                    LIMIT 1
                    `,

                    [
                        teacherId,
                        rollNo
                    ]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "search_roll_number",

                    response:
                        `No student was found with roll number ${rollNo}.`

                });

            }

            const student =
                result.rows[0];

            return res.json({

                success: true,

                action: "search_roll_number",

                student,

                response:
                    `I found ${student.full_name} with roll number ${student.roll_no}.`

            });

        }

        // =================================================
        // SEARCH STUDENT BY EMAIL
        // NEW FEATURE
        // =================================================

        const emailMatch =
            cleanCommand.match(

                /(?:search email|find email|search by email|email search)\s+(.+)/i

            );

        if (emailMatch) {

            const email =
                emailMatch[1].trim();

            const result =
                await db.query(

                    `
                    SELECT
                        id,
                        full_name,
                        roll_no,
                        email,
                        approved

                    FROM students

                    WHERE teacher_id = $1

                    AND LOWER(email)
                    = LOWER($2)

                    LIMIT 1
                    `,

                    [
                        teacherId,
                        email
                    ]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: true,

                    action: "search_email",

                    response:
                        `No student was found with email ${email}.`

                });

            }

            const student =
                result.rows[0];

            return res.json({

                success: true,

                action: "search_email",

                student,

                response:
                    `I found student ${student.full_name}.`

            });

        }

        // =================================================
        // APPROVE STUDENT BY VOICE
        // NEW FEATURE
        // =================================================

        const approveMatch =
            cleanCommand.match(

                /(?:approve student|student approve karo|approve)\s+(.+)/i

            );

        if (approveMatch) {

            const studentName =
                approveMatch[1].trim();

            const findResult =
                await db.query(

                    `
                    SELECT
                        id,
                        full_name,
                        roll_no,
                        approved

                    FROM students

                    WHERE teacher_id = $1

                    AND LOWER(full_name)
                    = LOWER($2)

                    LIMIT 1
                    `,

                    [
                        teacherId,
                        studentName
                    ]

                );

            if (findResult.rows.length === 0) {

                return res.json({

                    success: false,

                    action: "approve_student",

                    response:
                        `I could not find student ${studentName}.`

                });

            }

            const student =
                findResult.rows[0];

            if (student.approved) {

                return res.json({

                    success: true,

                    action: "approve_student",

                    student,

                    response:
                        `${student.full_name} is already approved.`

                });

            }

            await db.query(

                `
                UPDATE students

                SET approved = true

                WHERE id = $1

                AND teacher_id = $2
                `,

                [
                    student.id,
                    teacherId
                ]

            );

            return res.json({

                success: true,

                action: "approve_student",

                student,

                response:
                    `${student.full_name} has been approved successfully.`

            });

        }

        // =================================================
        // CREATE SESSION
        // EXISTING FEATURE
        // =================================================

        const createSessionMatch =
            cleanCommand.match(

                /(?:create session|start session|new session|session banao|session bana|session shuru karo|नया सेशन बनाओ|सेशन शुरू करो)\s*(.*)/i

            );

        if (createSessionMatch) {

            let sessionName =
                createSessionMatch[1]
                    .trim();

            if (!sessionName) {

                return res.json({

                    success: false,

                    action: "create_session",

                    response:
                        "Please tell me the session name."

                });

            }

            await ensureAttendanceRetention();

            // CLOSE OLD ACTIVE SESSION

            await db.query(

                `
                UPDATE attendance_sessions

                SET

                    is_active = false,

                    ended_at = COALESCE(
                        ended_at,
                        NOW()
                    )

                WHERE created_by = $1

                AND is_active = true
                `,

                [teacherId]

            );

            // CREATE NEW SESSION

            const result =
                await db.query(

                    `
                    INSERT INTO attendance_sessions

                    (
                        session_name,
                        is_active,
                        created_by,
                        ended_at
                    )

                    VALUES

                    (
                        $1,
                        true,
                        $2,
                        NULL
                    )

                    RETURNING
                        id,
                        session_name
                    `,

                    [
                        sessionName,
                        teacherId
                    ]

                );

            return res.json({

                success: true,

                action: "create_session",

                session:
                    result.rows[0],

                response:
                    `New attendance session ${result.rows[0].session_name} has been created successfully.`

            });

        }

        // =================================================
        // END ACTIVE SESSION
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("end session") ||

            cleanCommand.includes("stop session") ||

            cleanCommand.includes("session band karo") ||

            cleanCommand.includes("session close karo") ||

            cleanCommand.includes("सेशन बंद करो")

        ) {

            const result =
                await db.query(

                    `
                    UPDATE attendance_sessions

                    SET

                        is_active = false,

                        ended_at = NOW()

                    WHERE id =

                    (

                        SELECT id

                        FROM attendance_sessions

                        WHERE created_by = $1

                        AND is_active = true

                        ORDER BY id DESC

                        LIMIT 1

                    )

                    RETURNING
                        id,
                        session_name
                    `,

                    [teacherId]

                );

            if (
                result.rows.length === 0
            ) {

                return res.json({

                    success: true,

                    action: "end_session",

                    response:
                        "There is no active session to end."

                });

            }

            return res.json({

                success: true,

                action: "end_session",

                response:
                    `Session ${result.rows[0].session_name} has been ended successfully.`

            });

        }

        // =================================================
        // END SPECIFIC SESSION
        // NEW FEATURE
        // =================================================

        const endSpecificMatch =
            cleanCommand.match(

                /(?:end specific session|end session named|close session named)\s+(.+)/i

            );

        if (endSpecificMatch) {

            const sessionName =
                endSpecificMatch[1].trim();

            const result =
                await db.query(

                    `
                    UPDATE attendance_sessions

                    SET
                        is_active = false,
                        ended_at = COALESCE(
                            ended_at,
                            NOW()
                        )

                    WHERE created_by = $1

                    AND LOWER(session_name)
                    = LOWER($2)

                    RETURNING
                        id,
                        session_name,
                        is_active
                    `,

                    [
                        teacherId,
                        sessionName
                    ]

                );

            if (result.rows.length === 0) {

                return res.json({

                    success: false,

                    action: "end_specific_session",

                    response:
                        `I could not find session ${sessionName}.`

                });

            }

            return res.json({

                success: true,

                action: "end_specific_session",

                session:
                    result.rows[0],

                response:
                    `Session ${result.rows[0].session_name} has been ended.`

            });

        }

        // =================================================
        // SHOW ATTENDANCE
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("show attendance") ||

            cleanCommand.includes("attendance dikhao") ||

            cleanCommand.includes("attendance dikha") ||

            cleanCommand.includes("attendance show karo") ||

            cleanCommand.includes("अटेंडेंस दिखाओ")

        ) {

            return res.json({

                success: true,

                action: "show_attendance",

                response:
                    "Showing attendance on the dashboard."

            });

        }

        // =================================================
        // SHOW PENDING STUDENTS
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("show pending") ||

            cleanCommand.includes("pending students dikhao") ||

            cleanCommand.includes("pending student dikhao") ||

            cleanCommand.includes("pending dikhao")

        ) {

            return res.json({

                success: true,

                action: "show_pending",

                response:
                    "Showing pending students."

            });

        }

        // =================================================
        // SHOW REGISTERED STUDENTS
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("show students") ||

            cleanCommand.includes("registered students") ||

            cleanCommand.includes("students dikhao") ||

            cleanCommand.includes("student list dikhao")

        ) {

            return res.json({

                success: true,

                action: "show_students",

                response:
                    "Showing all registered students."

            });

        }

        // =================================================
        // DASHBOARD NAVIGATION
        // NEW FEATURE
        // =================================================

        if (

            cleanCommand.includes("go to dashboard") ||

            cleanCommand.includes("open dashboard") ||

            cleanCommand.includes("dashboard kholo")

        ) {

            return res.json({

                success: true,

                action: "dashboard",

                response:
                    "Opening the teacher dashboard."

            });

        }

        // =================================================
        // REFRESH DASHBOARD
        // EXISTING FEATURE
        // =================================================

        if (

            cleanCommand.includes("refresh") ||

            cleanCommand.includes("reload") ||

            cleanCommand.includes("dashboard refresh") ||

            cleanCommand.includes("page refresh")

        ) {

            return res.json({

                success: true,

                action: "refresh",

                response:
                    "Refreshing the dashboard."

            });

        }

        // =================================================
        // STUDENT SEARCH BY NAME
        // EXISTING FEATURE
        // =================================================

        const searchMatch =
            cleanCommand.match(

                /(?:search student|find student|student search|student dhundo|student dhoondo|student khojo|स्टूडेंट ढूंढो)\s+(.+)/i

            );

        if (searchMatch) {

            const studentName =
                searchMatch[1].trim();

            const result =
                await db.query(

                    `
                    SELECT

                        id,
                        full_name,
                        roll_no,
                        email,
                        approved

                    FROM students

                    WHERE teacher_id = $1

                    AND LOWER(full_name)

                    LIKE LOWER($2)

                    ORDER BY full_name ASC

                    LIMIT 10
                    `,

                    [
                        teacherId,
                        `%${studentName}%`
                    ]

                );

            if (
                result.rows.length === 0
            ) {

                return res.json({

                    success: true,

                    action: "student_search",

                    students: [],

                    response:
                        `I could not find any student named ${studentName}.`

                });

            }

            return res.json({

                success: true,

                action: "student_search",

                students:
                    result.rows,

                response:
                    `I found ${result.rows.length} student records matching ${studentName}.`

            });

        }

        // =================================================
        // UNKNOWN COMMAND
        // =================================================

        return res.json({

            success: false,

            action: "unknown",

            response:
                "Sorry, I did not understand that command. Say Jarvis help to know what I can do."

        });

    } catch (error) {

        console.error("");

        console.error(
            "❌ JARVIS COMMAND ERROR:"
        );

        console.error(error);

        return res.status(500).json({

            success: false,

            response:
                "Sorry, something went wrong while processing your command."

        });

    }

};

exports.logout = (req, res) => {

    if (!req.session) {

        return res.redirect(
            "/teacher/login"
        );

    }

    req.session.destroy(
        (error) => {

            if (error) {

                console.error(
                    "❌ TEACHER LOGOUT ERROR:",
                    error
                );

                return res.status(500).send(
                    "Unable to logout teacher."
                );

            }

            return res.redirect(
                "/teacher/login"
            );

        }
    );

};
const express = require("express");
const path = require("path");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");
const methodOverride = require("method-override");

require("dotenv").config();


// =====================================================
// APP
// =====================================================

const app = express();


// =====================================================
// DATABASE
// =====================================================

require("./config/db");


// =====================================================
// ROUTES
// =====================================================

const teacherRoutes = require("./routes/teacher");

const studentRoutes = require("./routes/student");
const jarvisRoutes = require("./routes/jarvis");


// =====================================================
// BASIC MIDDLEWARE
// =====================================================

// HTML FORM DATA

app.use(
    express.urlencoded({
        extended: true,
        limit: "5mb"
    })
);


// =====================================================
// JSON DATA
// REQUIRED FOR FACE DESCRIPTOR ATTENDANCE API
// =====================================================

app.use(
    express.json({
        limit: "5mb",
        strict: true
    })
);


// =====================================================
// STATIC FILES
// =====================================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// =====================================================
// SESSION
// =====================================================

app.use(
    session({

        secret:
            process.env.SESSION_SECRET ||
            "ai-attendance-secret-key",

        resave: false,

        saveUninitialized: false,

        cookie: {

            httpOnly: true,

            maxAge:
                1000 *
                60 *
                60 *
                24,

            sameSite: "lax"

        }

    })
);


// =====================================================
// FLASH
// =====================================================

app.use(
    flash()
);


// =====================================================
// METHOD OVERRIDE
// =====================================================

app.use(
    methodOverride("_method")
);


// =====================================================
// EJS
// =====================================================

app.set(
    "view engine",
    "ejs"
);


app.set(
    "views",
    path.join(__dirname, "views")
);


app.use(
    expressLayouts
);


app.set(
    "layout",
    false
);


// =====================================================
// REQUEST LOGGER
// =====================================================

app.use(
    (req, res, next) => {

        console.log(
            `➡️ ${req.method} ${req.originalUrl}`
        );

        next();

    }
);


// =====================================================
// TEACHER ROUTES
// =====================================================

app.use(
    "/teacher",
    teacherRoutes
);
// =====================================================
// JARVIS ROUTES
// =====================================================

app.use(
    "/teacher/jarvis",
    jarvisRoutes
);

// =====================================================
// ATTENDANCE API DEBUG
// =====================================================
//
// CORRECT FINAL API:
//
// POST /student/attendance/mark
//
// student.js should contain:
//
// router.post(
//     "/attendance/mark",
//     studentController.markAttendance
// );
//
// app.use("/student", studentRoutes);
//
// Final:
//
// /student + /attendance/mark
//
// = /student/attendance/mark
// =====================================================

app.use(
    "/student/attendance/mark",
    (req, res, next) => {

        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "📡 ATTENDANCE REQUEST REACHED APP"
        );

        console.log(
            "======================================"
        );

        console.log(
            "METHOD:",
            req.method
        );

        console.log(
            "URL:",
            req.originalUrl
        );

        console.log(
            "CONTENT-TYPE:",
            req.headers["content-type"]
        );

        console.log(
            "SESSION:",
            !!req.session?.student
        );

        console.log(
            "BODY:",
            req.body
        );

        console.log(
            "======================================"
        );

        next();

    }
);


// =====================================================
// STUDENT ROUTES
// =====================================================

app.use(
    "/student",
    studentRoutes
);


// =====================================================
// ATTENDANCE API HEALTH CHECK
// =====================================================
//
// Open in browser:
//
// http://localhost:3000/student/attendance-api-test
//
// This checks that the student route is mounted.
// =====================================================

app.get(
    "/student/attendance-api-test",
    (req, res) => {

        console.log(
            "✅ ATTENDANCE API TEST REQUEST"
        );


        return res.status(200).json({

            success: true,

            message:
                "Student attendance API is available.",

            routes: {

                markAttendance:
                    "POST /student/attendance/mark",

                activeSession:
                    "GET /student/active-session"

            }

        });

    }
);

// =====================================================
// ABOUT PAGE
// =====================================================

app.get(
    "/about",
    (req, res) => {

        return res.render(
            "about"
        );

    }
);
// =====================================================
// HOME - JARVIS / IRON MAN UI
// =====================================================

app.get(
    "/",
    (req, res) => {

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
    AI Attendance System | JARVIS
</title>


<style>

/* =====================================================
   RESET
===================================================== */

* {

    margin: 0;

    padding: 0;

    box-sizing: border-box;

}


body {

    min-height: 100vh;

    overflow-x: hidden;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    background:

        radial-gradient(
            circle at center,
            #18233a 0%,
            #090d18 35%,
            #03050b 75%,
            #000000 100%
        );

    color: white;

}


/* =====================================================
   BACKGROUND GRID
===================================================== */

body::before {

    content: "";

    position: fixed;

    inset: 0;

    pointer-events: none;

    opacity: 0.12;

    background-image:

        linear-gradient(
            rgba(0, 234, 255, 0.15) 1px,
            transparent 1px
        ),

        linear-gradient(
            90deg,
            rgba(0, 234, 255, 0.15) 1px,
            transparent 1px
        );

    background-size:
        50px 50px;

}


/* =====================================================
   TOP NAVIGATION
===================================================== */

.navbar {

    position: relative;

    z-index: 10;

    width: 100%;

    padding:
        22px
        6%;

    display: flex;

    justify-content: space-between;

    align-items: center;

    border-bottom:

        1px solid
        rgba(0, 229, 255, 0.15);

    background:

        rgba(0, 0, 0, 0.35);

    backdrop-filter:
        blur(15px);

}


.brand {

    display: flex;

    align-items: center;

    gap: 12px;

}


.brand-icon {

    width: 42px;

    height: 42px;

    border-radius: 50%;

    display: flex;

    justify-content: center;

    align-items: center;

    color: #00eaff;

    font-size: 22px;

    border:

        2px solid
        #00eaff;

    box-shadow:

        0 0 15px
        #00eaff,

        inset 0 0 10px
        rgba(0, 234, 255, 0.5);

}


.brand h2 {

    color: white;

    font-size: 20px;

    letter-spacing: 2px;

}


.status {

    color: #00ff9d;

    font-size: 12px;

    letter-spacing: 2px;

}


.status::before {

    content: "●";

    margin-right: 7px;

    color: #00ff9d;

    text-shadow:
        0 0 10px
        #00ff9d;

}


/* =====================================================
   MAIN CONTAINER
===================================================== */

.main {

    position: relative;

    z-index: 2;

    min-height:

        calc(
            100vh - 86px
        );

    display: flex;

    justify-content: center;

    align-items: center;

    padding:
        50px
        20px;

}


/* =====================================================
   HUD FRAME
===================================================== */

.hud {

    position: relative;

    width: 1000px;

    max-width: 100%;

    min-height: 570px;

    display: grid;

    grid-template-columns:

        1fr
        1.3fr
        1fr;

    align-items: center;

    gap: 30px;

    padding:
        50px
        40px;

    background:

        linear-gradient(
            135deg,
            rgba(9, 17, 31, 0.92),
            rgba(2, 6, 14, 0.96)
        );

    border:

        1px solid
        rgba(0, 234, 255, 0.35);

    border-radius: 28px;

    box-shadow:

        0 0 20px
        rgba(0, 234, 255, 0.12),

        0 0 80px
        rgba(0, 100, 255, 0.12),

        inset 0 0 40px
        rgba(0, 234, 255, 0.04);

}


/* HUD CORNERS */

.hud::before {

    content: "";

    position: absolute;

    width: 80px;

    height: 80px;

    top: -2px;

    left: -2px;

    border-top:

        4px solid
        #00eaff;

    border-left:

        4px solid
        #00eaff;

    border-radius:
        25px 0 0 0;

}


.hud::after {

    content: "";

    position: absolute;

    width: 80px;

    height: 80px;

    right: -2px;

    bottom: -2px;

    border-right:

        4px solid
        #00eaff;

    border-bottom:

        4px solid
        #00eaff;

    border-radius:
        0 0 25px 0;

}


/* =====================================================
   LEFT SYSTEM PANEL
===================================================== */

.system-panel {

    display: flex;

    flex-direction: column;

    gap: 18px;

}


.panel-title {

    color: #00eaff;

    font-size: 12px;

    letter-spacing: 3px;

    margin-bottom: 5px;

}


.system-card {

    padding: 15px;

    border-left:

        2px solid
        #00eaff;

    background:

        rgba(0, 234, 255, 0.05);

    border-radius: 0 10px 10px 0;

}


.system-card h4 {

    font-size: 12px;

    color: #a8c9d8;

    margin-bottom: 7px;

    letter-spacing: 1px;

}


.system-card p {

    color: white;

    font-size: 14px;

}


.online {

    color: #00ff9d !important;

}


/* =====================================================
   ARC REACTOR
===================================================== */

.center {

    text-align: center;

}


.reactor-wrapper {

    position: relative;

    width: 260px;

    height: 260px;

    margin:

        0 auto
        30px;

    display: flex;

    justify-content: center;

    align-items: center;

}


.reactor-ring {

    position: absolute;

    border-radius: 50%;

}


.ring-1 {

    width: 250px;

    height: 250px;

    border:

        5px solid
        rgba(0, 234, 255, 0.35);

    border-top-color:
        #00eaff;

    border-bottom-color:
        #008cff;

    animation:

        spin
        8s
        linear
        infinite;

    box-shadow:

        0 0 25px
        rgba(0, 234, 255, 0.4);

}


.ring-2 {

    width: 200px;

    height: 200px;

    border:

        3px dashed
        #00eaff;

    animation:

        reverseSpin
        12s
        linear
        infinite;

}


.ring-3 {

    width: 150px;

    height: 150px;

    border:

        2px solid
        rgba(0, 140, 255, 0.7);

    animation:

        spin
        5s
        linear
        infinite;

}


.core {

    width: 105px;

    height: 105px;

    border-radius: 50%;

    background:

        radial-gradient(
            circle,
            #ffffff 0%,
            #b9ffff 15%,
            #00eaff 40%,
            #0077ff 70%,
            #001c3d 100%
        );

    box-shadow:

        0 0 20px
        #ffffff,

        0 0 50px
        #00eaff,

        0 0 100px
        #008cff;

    animation:

        pulse
        2s
        ease-in-out
        infinite;

}


.reactor-line {

    position: absolute;

    width: 280px;

    height: 2px;

    background:

        linear-gradient(
            90deg,
            transparent,
            #00eaff,
            transparent
        );

}


h1 {

    font-size: 38px;

    letter-spacing: 5px;

    color: white;

    text-transform: uppercase;

    margin-bottom: 14px;

    text-shadow:

        0 0 15px
        rgba(0, 234, 255, 0.5);

}


.jarvis {

    color: #00eaff;

}


.subtitle {

    color: #8ca6b8;

    font-size: 16px;

    letter-spacing: 1px;

    line-height: 1.7;

}


/* =====================================================
   RIGHT PANEL
===================================================== */

.access-panel {

    display: flex;

    flex-direction: column;

    gap: 15px;

}


.access-title {

    color: #00eaff;

    letter-spacing: 3px;

    font-size: 12px;

    margin-bottom: 8px;

}


.access-button {

    position: relative;

    display: block;

    padding:

        17px
        20px;

    text-decoration: none;

    color: white;

    border:

        1px solid
        rgba(0, 234, 255, 0.35);

    border-radius: 12px;

    background:

        linear-gradient(
            90deg,
            rgba(0, 234, 255, 0.08),
            rgba(0, 100, 255, 0.08)
        );

    transition:

        0.3s
        ease;

    overflow: hidden;

}


.access-button::before {

    content: "";

    position: absolute;

    top: 0;

    left: -100%;

    width: 100%;

    height: 100%;

    background:

        linear-gradient(
            90deg,
            transparent,
            rgba(0, 234, 255, 0.25),
            transparent
        );

    transition:
        0.5s;

}


.access-button:hover::before {

    left: 100%;

}


.access-button:hover {

    transform:

        translateX(-5px)
        scale(1.02);

    border-color:
        #00eaff;

    box-shadow:

        0 0 20px
        rgba(0, 234, 255, 0.3);

}


.access-button.teacher {

    border-color:

        rgba(255, 90, 0, 0.5);

    background:

        linear-gradient(
            90deg,
            rgba(255, 80, 0, 0.12),
            rgba(255, 180, 0, 0.08)
        );

}


.access-button.teacher:hover {

    border-color:
        #ff7b00;

    box-shadow:

        0 0 25px
        rgba(255, 100, 0, 0.35);

}


.access-button span {

    display: block;

}


.button-title {

    font-size: 16px;

    font-weight: bold;

    margin-bottom: 4px;

}


.button-info {

    font-size: 11px;

    color: #8da7b7;

}


/* =====================================================
   BOTTOM STATUS
===================================================== */

.bottom-status {

    position: absolute;

    left: 35px;

    right: 35px;

    bottom: 18px;

    display: flex;

    justify-content: space-between;

    color: #607b8c;

    font-size: 10px;

    letter-spacing: 1px;

}


/* =====================================================
   ANIMATIONS
===================================================== */

@keyframes spin {

    from {

        transform:
            rotate(0deg);

    }

    to {

        transform:
            rotate(360deg);

    }

}


@keyframes reverseSpin {

    from {

        transform:
            rotate(360deg);

    }

    to {

        transform:
            rotate(0deg);

    }

}


@keyframes pulse {

    0% {

        transform:
            scale(0.92);

        filter:
            brightness(0.9);

    }

    50% {

        transform:
            scale(1.08);

        filter:
            brightness(1.4);

    }

    100% {

        transform:
            scale(0.92);

        filter:
            brightness(0.9);

    }

}


/* =====================================================
   MOBILE
===================================================== */

@media
(max-width: 850px) {

    .hud {

        grid-template-columns:
            1fr;

        text-align: center;

        padding:
            45px
            25px
            70px;

    }


    .system-panel {

        display: grid;

        grid-template-columns:

            1fr
            1fr;

    }


    .access-panel {

        max-width: 400px;

        width: 100%;

        margin: auto;

    }


}


@media
(max-width: 500px) {

    .navbar {

        padding:
            18px
            20px;

    }


    .brand h2 {

        font-size: 15px;

    }


    .status {

        font-size: 9px;

    }


    .system-panel {

        grid-template-columns:
            1fr;

    }


    .reactor-wrapper {

        transform:
            scale(0.8);

        margin-bottom:
            5px;

    }


    h1 {

        font-size: 26px;

        letter-spacing: 3px;

    }


}

</style>

</head>


<body>


<!-- =====================================================
     NAVBAR
===================================================== -->

<div class="navbar">


    <div class="brand">


        <div class="brand-icon">

            ⚡

        </div>


        <h2>

            AI ATTENDANCE SYSTEM

        </h2>


    </div>


    <div class="status">

        SYSTEM ONLINE

    </div>


</div>


<!-- =====================================================
     MAIN
===================================================== -->

<div class="main">


    <div class="hud">


        <!-- =================================================
             LEFT PANEL
        ================================================= -->

        <div class="system-panel">


            <div class="panel-title">

                SYSTEM STATUS

            </div>


            <div class="system-card">

                <h4>

                    AI ENGINE

                </h4>


                <p class="online">

                    ● ONLINE

                </p>

            </div>


            <div class="system-card">

                <h4>

                    FACE RECOGNITION

                </h4>


                <p class="online">

                    ● ACTIVE

                </p>

            </div>


            <div class="system-card">

                <h4>

                    VOICE ASSISTANT

                </h4>


                <p class="online">

                    ● JARVIS READY

                </p>

            </div>


            <div class="system-card">

                <h4>

                    ATTENDANCE SYSTEM

                </h4>


                <p>

                    DATABASE CONNECTED

                </p>

            </div>


        </div>


        <!-- =================================================
             ARC REACTOR CENTER
        ================================================= -->

        <div class="center">


            <div class="reactor-wrapper">


                <div class="reactor-line">

                </div>


                <div class="reactor-ring ring-1">

                </div>


                <div class="reactor-ring ring-2">

                </div>


                <div class="reactor-ring ring-3">

                </div>


                <div class="core">

                </div>


            </div>


            <h1>

                AI Attendance
                <span class="jarvis">

                    System

                </span>

            </h1>


            <p class="subtitle">

                JARVIS Powered Face Recognition
                <br>

                Smart • Fast • Intelligent

            </p>


        </div>


        <!-- =================================================
             RIGHT ACCESS PANEL
        ================================================= -->

        <div class="access-panel">


            <div class="access-title">

                ACCESS PORTAL

            </div>


            <a
                href="/student/login"
                class="access-button"
            >


                <span class="button-title">

                    🎓 Student Login

                </span>


                <span class="button-info">

                    Access your attendance dashboard

                </span>


            </a>


            <a
                href="/student/register"
                class="access-button"
            >


                <span class="button-title">

                    📝 Student Register

                </span>


                <span class="button-info">

                    Register with face recognition

                </span>


            </a>


            <a
                href="/teacher/login"
                class="access-button teacher"
            >


                <span class="button-title">

                    👨‍🏫 Teacher Login

                </span>


                <span class="button-info">

                    Access JARVIS Command Center

                </span>


            </a>
            <a 
    href="/about" 
    class="access-button developer" 
>

    <span class="button-title">

        👨‍💻 Developer

    </span>

    <span class="button-info">

        Meet the developer of AI Attendance System

    </span>

</a>


        </div>


        <!-- =================================================
             BOTTOM STATUS
        ================================================= -->

        <div class="bottom-status">


            <span>

                AI ATTENDANCE PROTOCOL v1.0

            </span>


            <span>

                POWER LEVEL: 100%

            </span>


        </div>


    </div>


</div>


</body>

</html>

        `);

    }
);


// =====================================================
// SERVER
// =====================================================

const PORT =
    Number(process.env.PORT) || 3000;


app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "🤖 AI ATTENDANCE SYSTEM"
        );

        console.log(
            "======================================"
        );


        console.log(
            `✅ Server Started: http://localhost:${PORT}`
        );


        console.log(
            `👨‍🏫 Teacher Login: http://localhost:${PORT}/teacher/login`
        );


        console.log(
            `🎓 Student Login: http://localhost:${PORT}/student/login`
        );


        console.log(
            `📝 Student Register: http://localhost:${PORT}/student/register`
        );


        console.log(
            `📷 Attendance: http://localhost:${PORT}/student/attendance`
        );


        console.log(
            `📡 Attendance API: POST http://localhost:${PORT}/student/attendance/mark`
        );


        console.log(
            `🔎 API Test: http://localhost:${PORT}/student/attendance-api-test`
        );


        console.log(
            `🟢 Active Session API: GET http://localhost:${PORT}/student/active-session`
        );


        console.log(
            "======================================"
        );

        console.log("");

    }
);
const express = require("express");

const router = express.Router();

const studentController = require("../controllers/studentController");

const upload = require("../middleware/upload");

// =====================================================
// STUDENT REGISTER PAGE
// GET /student/register
// =====================================================

router.get(
    "/register",
    studentController.registerPage
);

// =====================================================
// STUDENT REGISTER SUBMIT
// POST /student/register
// =====================================================

router.post(
    "/register",
    upload.single("photo"),
    studentController.register
);

// =====================================================
// STUDENT LOGIN PAGE
// GET /student/login
// =====================================================

router.get(
    "/login",
    studentController.loginPage
);

// =====================================================
// STUDENT LOGIN
// POST /student/login
// =====================================================

router.post(
    "/login",
    studentController.login
);

// =====================================================
// STUDENT DASHBOARD
// GET /student/dashboard
// =====================================================

router.get(
    "/dashboard",
    studentController.dashboard
);

// =====================================================
// STUDENT LOGOUT
// GET /student/logout
// =====================================================

router.get(
    "/logout",
    studentController.logout
);

// =====================================================
// STUDENT ATTENDANCE PAGE
// GET /student/attendance
// =====================================================

router.get(
    "/attendance",
    studentController.attendancePage
);

// =====================================================
// MARK ATTENDANCE
// POST /student/attendance
//
// Existing endpoint — KEEPING IT SO OLD FRONTEND
// CODE DOES NOT BREAK.
// =====================================================

router.post(
    "/attendance",
    studentController.markAttendance
);

// =====================================================
// MARK ATTENDANCE API
// POST /student/attendance/mark
//
// IMPORTANT:
// Frontend can call this endpoint.
// Both /attendance and /attendance/mark use
// the same markAttendance controller.
// =====================================================

router.post(
    "/attendance/mark",
    studentController.markAttendance
);

// =====================================================
// ACTIVE ATTENDANCE SESSION
// GET /student/active-session
// =====================================================

router.get(
    "/active-session",
    studentController.activeSession
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;
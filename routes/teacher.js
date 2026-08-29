const express = require("express");

const router = express.Router();

const teacherController =
    require("../controllers/teacherController");

// =====================================================
// TEACHER REGISTER
// =====================================================

router.get(
    "/register",
    teacherController.registerPage
);

router.post(
    "/register",
    teacherController.register
);

// =====================================================
// TEACHER LOGIN
// =====================================================

router.get(
    "/login",
    teacherController.loginPage
);

router.post(
    "/login",
    teacherController.login
);

// =====================================================
// TEACHER DASHBOARD
// =====================================================

router.get(
    "/dashboard",
    teacherController.dashboard
);

// =====================================================
// STUDENT APPROVAL
// =====================================================

router.post(
    "/student/:id/approve",
    teacherController.approveStudent
);

// =====================================================
// ATTENDANCE SESSION
// =====================================================

router.post(
    "/session/create",
    teacherController.createSession
);

router.post(
    "/session/:id/end",
    teacherController.endSession
);

// =====================================================
// JARVIS AI COMMAND API
// =====================================================

router.post(
    "/jarvis-command",
    teacherController.jarvisCommand
);

// =====================================================
// TEACHER LOGOUT
// =====================================================

router.get(
    "/logout",
    teacherController.logout
);

module.exports = router;
const express = require("express");

const router = express.Router();

const studentController =
    require("../controllers/studentController");


// =====================================================
// ACTIVE ATTENDANCE SESSION
// GET /attendance/active-session
// =====================================================

router.get(
    "/active-session",
    studentController.activeSession
);


// =====================================================
// MARK STUDENT ATTENDANCE
// POST /attendance/mark
// =====================================================

router.post(
    "/mark",
    studentController.markAttendance
);


// =====================================================
// ATTENDANCE API TEST
// GET /attendance/test
// =====================================================

router.get(
    "/test",
    (req, res) => {

        return res.status(200).json({

            success: true,

            message:
                "Attendance API is working.",

            endpoints: {

                activeSession:
                    "GET /attendance/active-session",

                markAttendance:
                    "POST /attendance/mark"

            }

        });

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;
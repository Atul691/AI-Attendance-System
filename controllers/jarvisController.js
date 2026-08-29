const db = require("../config/db");


/* =========================================================
   JARVIS DATABASE COMMAND CENTER
========================================================= */

exports.processCommand = async (req, res) => {
    try {

        const { command } = req.body;


        if (!command || !command.trim()) {

            return res.status(400).json({
                success: false,
                response: "I did not receive any command."
            });

        }


        const text = command.toLowerCase().trim();


        /* =====================================================
           GET REGISTERED STUDENTS
        ===================================================== */

        if (

            text.includes("how many students") ||
            text.includes("how many student") ||
            text.includes("total students") ||
            text.includes("registered students") ||

            /* Hindi voice recognition */
            text.includes("हाउ मैनी स्टूडेंट") ||
            text.includes("हाउ मान्य स्टूडेंट") ||
            text.includes("हाउ मैनी स्टूडेंट्स") ||
            text.includes("हाउ मान्य स्टूडेंट्स") ||

            text.includes("रजिस्टर्ड स्टूडेंट") ||
            text.includes("रजिस्टर्ड स्टूडेंट्स") ||

            (
                text.includes("स्टूडेंट") &&
                text.includes("रजिस्टर्ड")
            )

        ) {

            const result = await db.query(
                `SELECT COUNT(*) FROM students`
            );


            const count = result.rows[0].count;


            return res.json({

                success: true,

                response:
                    `There are ${count} registered students.`

            });

        }


        /* =====================================================
           PENDING STUDENTS
        ===================================================== */

        if (

            text.includes("pending") ||
            text.includes("waiting approval") ||

            /* Hindi */
            text.includes("पेंडिंग") ||
            text.includes("अप्रूवल के लिए")

        ) {

            const result = await db.query(
                `SELECT COUNT(*)
                 FROM students
                 WHERE approved = false`
            );


            const count = result.rows[0].count;


            return res.json({

                success: true,

                response:
                    `There are ${count} students waiting for approval.`

            });

        }


        /* =====================================================
           ACTIVE SESSION
        ===================================================== */

        if (

            text.includes("active session") ||
            text.includes("current session") ||
            text.includes("session running") ||

            /* Hindi voice recognition */
            text.includes("एक्टिव सेशन") ||
            text.includes("करंट सेशन") ||
            text.includes("सेशन रनिंग")

        ) {

            const result = await db.query(

                `SELECT *
                 FROM attendance_sessions
                 WHERE is_active = true
                 ORDER BY id DESC
                 LIMIT 1`

            );


            if (result.rows.length === 0) {

                return res.json({

                    success: true,

                    response:
                        "There is currently no active attendance session."

                });

            }


            const session = result.rows[0];


            return res.json({

                success: true,

                response:
                    `The active session is ${session.session_name}.`

            });

        }


        /* =====================================================
           PRESENT STUDENTS COUNT
        ===================================================== */

        if (

            text.includes("how many present") ||
            text.includes("present students") ||
            text.includes("total present") ||

            /* Hindi voice recognition */
            text.includes("हाउ मैनी प्रेजेंट") ||
            text.includes("हाउ मान्य प्रेजेंट") ||
            text.includes("प्रेजेंट स्टूडेंट") ||
            text.includes("टोटल प्रेजेंट")

        ) {

            const sessionResult = await db.query(

                `SELECT id
                 FROM attendance_sessions
                 WHERE is_active = true
                 ORDER BY id DESC
                 LIMIT 1`

            );


            if (sessionResult.rows.length === 0) {

                return res.json({

                    success: true,

                    response:
                        "There is no active attendance session."

                });

            }


            const sessionId =
                sessionResult.rows[0].id;


            const result = await db.query(

                `SELECT COUNT(*)
                 FROM attendance
                 WHERE session_id = $1`,

                [sessionId]

            );


            const count = result.rows[0].count;


            return res.json({

                success: true,

                response:
                    `${count} students are currently present.`

            });

        }


        /* =====================================================
           UNKNOWN COMMAND
        ===================================================== */

        return res.json({

            success: true,

            response:
                "I understand that you are asking about the attendance system, but I need more information to process that request."

        });


    } catch (error) {

        console.error(
            "JARVIS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            response:
                "Sorry, I encountered a database error."

        });

    }

};
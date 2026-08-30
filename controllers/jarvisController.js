const db = require("../config/db");
const axios = require("axios");


/* =========================================================
   JARVIS DATABASE + AI COMMAND CENTER
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
           GREETING COMMANDS
        ===================================================== */

        if (

            text.includes("hello") ||
            text.includes("hi jarvis") ||
            text.includes("hello jarvis") ||
            text.includes("namaste") ||
            text.includes("नमस्ते") ||
            text.includes("हेलो")

        ) {

            return res.json({

                success: true,

                response:
                    "Hello Sir! Welcome back. Main JARVIS hoon. Aap kaise hain? Sab theek hai?"

            });

        }


        /* =====================================================
           HOW ARE YOU
        ===================================================== */

        if (

            text.includes("how are you") ||
            text.includes("kaise ho") ||
            text.includes("कैसे हो")

        ) {

            return res.json({

                success: true,

                response:
                    "Main bilkul theek hoon Sir. Main hamesha aapki help ke liye ready hoon. Aap bataiye, sab theek hai?"

            });

        }


        /* =====================================================
           HUNGRY / FOOD
        ===================================================== */

        if (

            text.includes("bhook") ||
            text.includes("bhukh") ||
            text.includes("hungry") ||
            text.includes("भूख")

        ) {

            return res.json({

                success: true,

                response:
                    "Sir, agar aapko bhook lagi hai to Pizza, Burger, Maggi, Paneer, Chole Bhature, Rajma Chawal ya kuch healthy food try kar sakte hain. Aaj kya khane ka mood hai?"

            });

        }


        /* =====================================================
           JOKE
        ===================================================== */

        if (

            text.includes("joke") ||
            text.includes("jokes") ||
            text.includes("mazaak") ||
            text.includes("मजाक")

        ) {

            return res.json({

                success: true,

                response:
                    "Bilkul Sir! Teacher ne student se kaha homework kahan hai? Student bola Sir, homework bhi work from home kar raha hai!"

            });

        }


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
           TODAY ATTENDANCE SUMMARY
        ===================================================== */

        if (

            text.includes("today attendance") ||
            text.includes("aaj attendance") ||
            text.includes("आज अटेंडेंस") ||
            text.includes("aaj ki attendance")

        ) {

            const sessionResult = await db.query(

                `SELECT id, session_name
                 FROM attendance_sessions
                 WHERE is_active = true
                 ORDER BY id DESC
                 LIMIT 1`

            );


            if (sessionResult.rows.length === 0) {

                return res.json({

                    success: true,

                    response:
                        "Sir, currently there is no active attendance session."

                });

            }


            const sessionId =
                sessionResult.rows[0].id;


            const totalStudentsResult = await db.query(

                `SELECT COUNT(*)
                 FROM students
                 WHERE approved = true`

            );


            const presentResult = await db.query(

                `SELECT COUNT(*)
                 FROM attendance
                 WHERE session_id = $1`,

                [sessionId]

            );


            const totalStudents =
                Number(totalStudentsResult.rows[0].count);

            const presentStudents =
                Number(presentResult.rows[0].count);

            const absentStudents =
                totalStudents - presentStudents;


            return res.json({

                success: true,

                response:
                    `Sir, today there are ${totalStudents} approved students. ${presentStudents} students are present and ${absentStudents} students are absent.`

            });

        }

        /* =====================================================
   TAVILY REAL-TIME INTERNET SEARCH
===================================================== */

try {

    const tavilyResponse = await axios.post(
        "https://api.tavily.com/search",
        {
            api_key: process.env.TAVILY_API_KEY,

            query: command + " हिंदी में जानकारी और जवाब",

            search_depth: "basic",

            include_answer: true,

            max_results: 5
        }
    );


    const answer =
        tavilyResponse.data.answer;


    if (answer) {

        return res.json({

            success: true,

            response:
                answer

        });

    }


    const results =
        tavilyResponse.data.results;


    if (
        results &&
        results.length > 0
    ) {

        return res.json({

            success: true,

            response:
                results[0].content ||
                results[0].title ||
                "Sir, mujhe internet par information mil gayi hai."

        });

    }


    return res.json({

        success: true,

        response:
            "Sorry Sir, mujhe is topic ke baare mein internet par information nahi mili."

    });


} catch (searchError) {

    console.error(
        "TAVILY SEARCH ERROR:",
        searchError.response?.data ||
        searchError.message
    );


    return res.json({

        success: true,

        response:
            "Sir, internet search service se response nahi mila. Please try again."

    });

}

        /* =====================================================
           UNKNOWN COMMAND
        ===================================================== */

        return res.json({

            success: true,

            response:
                "Sir, main attendance system ke baare mein aapki help kar sakta hoon. Aap total students, pending students, active session, present students, ya today's attendance ke baare mein pooch sakte hain."

        });


    } catch (error) {

        console.error(

            "JARVIS ERROR:",

            error

        );


        return res.status(500).json({

            success: false,

            response:
                "Sorry Sir, I encountered a database error."

        });

    }

};
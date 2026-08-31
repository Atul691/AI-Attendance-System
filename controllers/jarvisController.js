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
           JARVIS RECENT CONVERSATION CONTEXT
        ===================================================== */

        const recentConversationResult = await db.query(

            `SELECT
                user_command,
                jarvis_response
             FROM jarvis_conversation
             ORDER BY id DESC
             LIMIT 5`

        );


        const recentConversation =
            recentConversationResult.rows.reverse();

                /* =====================================================
           JARVIS PERSONAL MEMORY
        ===================================================== */

        // याद रखने के commands
       if (

    text.startsWith("remember that ") ||
    text.startsWith("remember ") ||

    /* Hindi / Hinglish memory commands */

    text.startsWith("yaad rakho") ||
    text.startsWith("yad rakho") ||

    text.startsWith("yaad karo") ||
    text.startsWith("yad karo") ||

    text.includes("yaad rakhna") ||
    text.includes("yad rakhna") ||

    text.includes("याद रखो") ||
    text.includes("याद रखना")

) {

    let memoryValue = command
    .replace(/^remember that\s+/i, "")
    .replace(/^remember\s+/i, "")

    .replace(/^yaad rakho\s*/i, "")
    .replace(/^yad rakho\s*/i, "")

    .replace(/^yaad karo\s*/i, "")
    .replace(/^yad karo\s*/i, "")

    .replace(/^yaad rakhna\s*/i, "")
    .replace(/^yad rakhna\s*/i, "")

    .replace(/^याद रखो\s*/i, "")
    .replace(/^याद रखना\s*/i, "")

    .trim();

        memoryValue = memoryValue
    .replace(/\bmeri girlfriend\b/gi, "aapki girlfriend")
    .replace(/\bmera boyfriend\b/gi, "aapka boyfriend")
    .replace(/\bmeri dost\b/gi, "aapki dost")
    .replace(/\bmera dost\b/gi, "aapka dost")
    .replace(/\bmeri friend\b/gi, "aapki friend")
    .replace(/\bmera friend\b/gi, "aapka friend")
    .replace(/\bmeri\b/gi, "aapki")
    .replace(/\bmera\b/gi, "aapka")
    .replace(/\bmere\b/gi, "aapke");

    if (!memoryValue) {

        return res.json({

            success: true,

            response:
                "Sir, aap mujhe bataiye ki kya yaad rakhna hai."

        });

    }


    await db.query(

        `INSERT INTO jarvis_memory
        (memory_key, memory_value, updated_at)

        VALUES ($1, $2, CURRENT_TIMESTAMP)

        ON CONFLICT (memory_key)

        DO UPDATE SET

            memory_value = EXCLUDED.memory_value,

            updated_at = CURRENT_TIMESTAMP`,

        [
            memoryValue.toLowerCase(),
            memoryValue
        ]

    );


    return res.json({

        success: true,

        response:
            `Theek hai Sir, maine yaad rakh liya: ${memoryValue}`

    });

}
        /* =====================================================
   PERSONAL MEMORY QUESTION
===================================================== */

if (

    text.includes("kya yad hai") ||
    text.includes("kya yaad hai") ||
    text.includes("क्या याद है") ||
    text.includes("bare mein kya yad hai") ||
    text.includes("bare mein kya yaad hai") ||
    text.includes("के बारे में क्या याद है")

) {

    let personName = command

        .replace(/ke bare mein kya yad hai/gi, "")
        .replace(/ke bare mein kya yaad hai/gi, "")
        .replace(/के बारे में क्या याद है/g, "")

        .replace(/kya yad hai/gi, "")
        .replace(/kya yaad hai/gi, "")
        .replace(/क्या याद है/g, "")

        .trim();


    if (!personName) {

        return res.json({

            success: true,

            response:
                "Sir, aap kis person ya information ke baare mein pooch rahe hain?"

        });

    }


    const memoryResult = await db.query(

        `SELECT memory_value
         FROM jarvis_memory
         WHERE memory_value ILIKE $1
         ORDER BY updated_at DESC
         LIMIT 5`,

        [`%${personName}%`]

    );


    if (memoryResult.rows.length === 0) {

        return res.json({

            success: true,

            response:
                `Sir, mujhe ${personName} ke baare mein abhi koi personal memory saved nahi hai.`

        });

    }


    const memories = memoryResult.rows

        .map(item => item.memory_value)

        .join(". ");


    return res.json({

        success: true,

        response:
            `Sir, mujhe yaad hai: ${memories}`

    });

}

        /* =====================================================
           SPECIAL PERSONAL MEMORY - PRACHI BABY
        ===================================================== */

        if (

            text.includes("prachi baby") ||
            text.includes("prachi") ||
            text.includes("प्राची")

        ) {

            const memoryResult = await db.query(

                `SELECT memory_value
                 FROM jarvis_memory
                 WHERE memory_value ILIKE '%prachi%'
                 ORDER BY updated_at DESC
                 LIMIT 1`

            );


            if (memoryResult.rows.length > 0) {

                return res.json({

                    success: true,

                    response:
                        `Sir, mujhe yaad hai. ${memoryResult.rows[0].memory_value}. Waise Prachi Baby kaisi hain aaj?`

                });

            }


            return res.json({

                success: true,

                response:
                    "Sir, Prachi Baby ke baare mein mujhe abhi koi information yaad nahi hai. Aap mujhe unke baare mein kuch yaad rakhwa sakte hain."

            });

        }


        /* =====================================================
           WHAT DO YOU REMEMBER
        ===================================================== */

        if (

            text.includes("what do you remember") ||
            text.includes("tum kya yaad rakhte ho") ||
            text.includes("kya yaad hai") ||
            text.includes("क्या याद है")

        ) {

            const memories = await db.query(

                `SELECT memory_value
                 FROM jarvis_memory
                 ORDER BY updated_at DESC
                 LIMIT 10`

            );


            if (memories.rows.length === 0) {

                return res.json({

                    success: true,

                    response:
                        "Sir, abhi mere paas koi personal memory saved nahi hai."

                });

            }


            const memoryList = memories.rows

                .map(
                    (item, index) =>
                        `${index + 1}. ${item.memory_value}`
                )

                .join(". ");


            return res.json({

                success: true,

                response:
                    `Sir, mujhe ye baatein yaad hain: ${memoryList}`

            });

        }


        /* =====================================================
           DELETE MEMORY
        ===================================================== */

        if (

            text.startsWith("forget ") ||
            text.includes("bhool jao") ||
            text.includes("भूल जाओ")

        ) {

            let memoryToDelete = command

                .replace(/^forget\s+/i, "")
                .replace(/bhool jao/i, "")
                .replace(/भूल जाओ/g, "")
                .trim();


            if (!memoryToDelete) {

                return res.json({

                    success: true,

                    response:
                        "Sir, aap mujhe bataiye ki kaunsi memory bhoolni hai."

                });

            }


            const deleteResult = await db.query(

                `DELETE FROM jarvis_memory
                 WHERE memory_value ILIKE $1
                 RETURNING *`,

                [`%${memoryToDelete}%`]

            );


            if (deleteResult.rows.length === 0) {

                return res.json({

                    success: true,

                    response:
                        "Sir, mujhe is information ki koi saved memory nahi mili."

                });

            }


            return res.json({

                success: true,

                response:
                    "Theek hai Sir, maine woh information bhool di hai."

            });

        }

/* =====================================================
   SMART MEMORY QUESTION SEARCH
===================================================== */

const memoryQuestionPatterns = [

    "yad hai",
    "yaad hai",
    "kya yad hai",
    "kya yaad hai",

    "tumhe yad hai",
    "tumhe yaad hai",

    "tumko yad hai",
    "tumko yaad hai",

    "remember",

    "what do you remember",

    "kon hai",
    "kaun hai",
    "koun hai",

    "who is",

    "tum jante ho",
    "tum jaante ho",

    "tumhe pata hai",

    "mere bare mein",
    "mere baare mein",

    "maine kya bataya tha",
    "maine kya bola tha"

];


const isMemoryQuestion =
    memoryQuestionPatterns.some(pattern =>
        text.includes(pattern)
    );


if (isMemoryQuestion) {

    console.log(
        "JARVIS SEARCHING PERSONAL MEMORY:",
        command
    );


    /*
       IMPORTANT:
       पहले पूरी memory database में search होगी
    */

    const memoryResult = await db.query(

        `SELECT memory_value
         FROM jarvis_memory
         ORDER BY updated_at DESC`

    );


    if (memoryResult.rows.length === 0) {

        return res.json({

            success: true,

            response:
                "Sir, mujhe iske baare mein abhi koi personal memory yaad nahi hai."

        });

    }


    /*
       Command से unnecessary words हटाओ
    */

    const searchWords = text

        .replace(/kya yad hai/g, "")
        .replace(/kya yaad hai/g, "")

        .replace(/yad hai/g, "")
        .replace(/yaad hai/g, "")

        .replace(/tumhe yad hai/g, "")
        .replace(/tumhe yaad hai/g, "")

        .replace(/tumko yad hai/g, "")
        .replace(/tumko yaad hai/g, "")

        .replace(/ke bare mein/g, "")
        .replace(/ke baare mein/g, "")

        .replace(/who is/g, "")
        .replace(/kon hai/g, "")
        .replace(/kaun hai/g, "")

        .replace(/\?/g, "")

        .trim();


    /*
       सभी memories में search
    */

    const matchedMemory =
        memoryResult.rows.find(item =>

            item.memory_value
                .toLowerCase()
                .includes(searchWords)

            ||

            searchWords
                .split(" ")
                .filter(word => word.length > 2)
                .some(word =>

                    item.memory_value
                        .toLowerCase()
                        .includes(word)

                )

        );


    if (matchedMemory) {

        return res.json({

            success: true,

            response:
                `Sir, mujhe yaad hai: ${matchedMemory.memory_value}`

        });

    }


    /*
       Memory नहीं मिली
       IMPORTANT: Tavily search पर नहीं जाएगा
    */

    return res.json({

        success: true,

        response:
            "Sir, mujhe iske baare mein koi personal information yaad nahi hai. Agar aap chahen to aap mujhe iske baare mein yaad rakhne ke liye bata sakte hain."

    });

}

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
    recentConversation.length > 0

        ? "Hello Sir. Aap wapas aa gaye. Pichli baar humari baat chal rahi thi, toh bataiye Sir, ab aapko kis cheez mein meri help chahiye?"

        : "Hello Sir. Good to have you back. Main online hoon. Aaj aap kaise hain?"

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
    "Main bilkul operational hoon Sir. Lekin zyada important baat ye hai ki aap kaise hain? Aaj ka din kaisa ja raha hai?"

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
           SPECIFIC PERSONAL MEMORY SEARCH
        ===================================================== */

        if (

            text.includes("ke bare mein kya yad hai") ||
            text.includes("ke bare mein kya yaad hai") ||
            text.includes("के बारे में क्या याद है")

        ) {

            let personName = command

                .replace(/ke bare mein kya yad hai/gi, "")
                .replace(/ke bare mein kya yaad hai/gi, "")
                .replace(/के बारे में क्या याद है/g, "")

                .trim();


            const memoryResult = await db.query(

                `SELECT memory_value
                 FROM jarvis_memory
                 WHERE memory_value ILIKE $1
                 ORDER BY updated_at DESC
                 LIMIT 5`,

                [`%${personName}%`]

            );


            if (memoryResult.rows.length > 0) {

                const memories = memoryResult.rows

                    .map(item => item.memory_value)

                    .join(". ");


                return res.json({

                    success: true,

                    response:
                        `Sir, mujhe ${personName} ke baare mein ye yaad hai: ${memories}`

                });

            }


            return res.json({

                success: true,

                response:
                    `Sir, mujhe ${personName} ke baare mein abhi koi personal memory yaad nahi hai.`

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

    await db.query(

        `INSERT INTO jarvis_conversation
        (user_command, jarvis_response)

        VALUES ($1, $2)`,

        [
            command,
            answer
        ]

    );


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

    const searchResponse =

        results[0].content ||
        results[0].title ||
        "Sir, mujhe internet par information mil gayi hai.";


    await db.query(

        `INSERT INTO jarvis_conversation
        (user_command, jarvis_response)

        VALUES ($1, $2)`,

        [
            command,
            searchResponse
        ]

    );


    return res.json({

        success: true,

        response:
            searchResponse

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
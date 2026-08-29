// =====================================================
// JARVIS AI VOICE ASSISTANT
// =====================================================

let recognition = null;

let isListening = false;

let manuallyStopped = false;

let waitingForCommand = false;

let isProcessingCommand = false;

let restartTimeout = null;


// =====================================================
// CHECK BROWSER SUPPORT
// =====================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (!SpeechRecognition) {

    console.error(
        "Speech Recognition is not supported in this browser."
    );

}


// =====================================================
// SPEAK FUNCTION
// =====================================================

function jarvisSpeak(text) {

    if (!text) return;

    window.speechSynthesis.cancel();

    const speech =
        new SpeechSynthesisUtterance(text);

    speech.rate = 1;

    speech.pitch = 1;

    speech.volume = 1;

    speech.lang = "en-IN";

    window.speechSynthesis.speak(speech);

}


// =====================================================
// INITIALIZE JARVIS
// =====================================================

function initializeJarvis() {

    if (!SpeechRecognition) {

        console.error(
            "Speech Recognition is not supported."
        );

        updateJarvisStatus(
            "🔴 Speech Recognition not supported"
        );

        return;

    }


    // Prevent multiple initialization
    if (recognition) {

        return;

    }


    recognition =
        new SpeechRecognition();


    // =================================================
    // SETTINGS
    // =================================================

    recognition.continuous = true;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    recognition.lang = "en-IN";


    // =================================================
    // START
    // =================================================

    recognition.onstart = () => {

        isListening = true;

        updateJarvisStatus(
            "🟢 Jarvis Listening..."
        );

        console.log(
            "🎤 JARVIS LISTENING"
        );

    };


    // =================================================
    // RESULT
    // =================================================

    recognition.onresult =
        (event) => {

            for (

                let i = event.resultIndex;

                i < event.results.length;

                i++

            ) {

                const result =
                    event.results[i];


                if (!result.isFinal) {

                    continue;

                }


                const transcript =
                    result[0]
                        .transcript
                        .trim();


                if (!transcript) {

                    continue;

                }


                console.log(
                    "🎤 JARVIS HEARD:",
                    transcript
                );


                handleJarvisSpeech(
                    transcript
                );

            }

        };


    // =================================================
    // ERROR
    // =================================================

    recognition.onerror =
        (event) => {

            console.error(
                "❌ Jarvis Speech Error:",
                event.error
            );


            if (

                event.error ===
                "not-allowed"

                ||

                event.error ===
                "service-not-allowed"

            ) {

                manuallyStopped = true;

                updateJarvisStatus(
                    "🔴 Microphone permission denied"
                );

            }


            if (

                event.error ===
                "no-speech"

            ) {

                console.log(
                    "🎤 No speech detected"
                );

            }

        };


    // =================================================
    // END
    // =================================================

    recognition.onend = () => {

        isListening = false;

        console.log(
            "🔄 JARVIS RECOGNITION STOPPED"
        );


        // Don't restart if manually stopped
        if (manuallyStopped) {

            return;

        }


        // Don't restart while processing
        if (isProcessingCommand) {

            return;

        }


        clearTimeout(
            restartTimeout
        );


        restartTimeout =
            setTimeout(
                () => {

                    restartJarvis();

                },
                800
            );

    };

}


// =====================================================
// RESTART JARVIS
// =====================================================

function restartJarvis() {

    if (

        manuallyStopped

        ||

        isListening

        ||

        isProcessingCommand

    ) {

        return;

    }


    if (!recognition) {

        initializeJarvis();

    }


    try {

        recognition.start();

    } catch (error) {

        console.log(
            "Jarvis restart waiting..."
        );

    }

}


// =====================================================
// HANDLE VOICE
// =====================================================

function handleJarvisSpeech(
    transcript
) {

    if (!transcript) {

        return;

    }


    const text =
        transcript
            .toLowerCase()
            .trim();


    // =================================================
    // WAKE WORD DETECTION
    // =================================================

    const hasWakeWord =

        text.includes("jarvis")

        ||

        text.includes("जार्विस");


    // =================================================
    // WAKE WORD ONLY
    // =================================================

    if (

        text === "jarvis"

        ||

        text === "जार्विस"

    ) {

        waitingForCommand = true;


        updateJarvisStatus(
            "🤖 Jarvis is ready..."
        );


        jarvisSpeak(
            "Yes sir, I am listening."
        );


        console.log(
            "🤖 WAITING FOR COMMAND"
        );


        return;

    }


    // =================================================
    // COMMAND WITH WAKE WORD
    // =================================================

    if (hasWakeWord) {

        waitingForCommand = false;


        sendJarvisCommand(
            transcript
        );


        return;

    }


    // =================================================
    // FOLLOW-UP COMMAND
    // =================================================

    if (waitingForCommand) {

        waitingForCommand = false;


        sendJarvisCommand(
            transcript
        );


        return;

    }

}


// =====================================================
// SEND COMMAND TO SERVER
// =====================================================

async function sendJarvisCommand(
    command
) {

    if (isProcessingCommand) {

        return;

    }


    isProcessingCommand = true;


    try {

        updateJarvisStatus(
            "🤖 Jarvis is thinking..."
        );


        console.log(
            "📡 Sending command:",
            command
        );


        const response =
            await fetch(

                "/teacher/jarvis-command",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            command

                        })

                }

            );


        // =================================================
        // CHECK RESPONSE
        // =================================================

        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "🤖 JARVIS RESPONSE:",
            data
        );


        // =================================================
        // SPEAK RESPONSE
        // =================================================

        if (data.response) {

            jarvisSpeak(
                data.response
            );

        }


        // =================================================
        // HANDLE ACTION
        // =================================================

        handleJarvisAction(
            data
        );


        updateJarvisStatus(
            "🟢 Jarvis Listening..."
        );


    } catch (error) {

        console.error(
            "❌ Jarvis API Error:",
            error
        );


        jarvisSpeak(
            "Sorry sir, I am unable to connect to the server."
        );


        updateJarvisStatus(
            "🔴 Connection error"
        );


    } finally {

        isProcessingCommand = false;


        // Restart listening
        if (!manuallyStopped) {

            setTimeout(
                () => {

                    restartJarvis();

                },
                1200
            );

        }

    }

}


// =====================================================
// HANDLE DASHBOARD ACTIONS
// =====================================================

function handleJarvisAction(
    data
) {

    if (!data || !data.action) {

        return;

    }


    console.log(
        "🎯 JARVIS ACTION:",
        data.action
    );


    // =================================================
    // REFRESH
    // =================================================

    if (
        data.action === "refresh"
    ) {

        setTimeout(
            () => {

                window.location.reload();

            },
            1000
        );

        return;

    }


    // =================================================
    // CREATE SESSION
    // =================================================

    if (
        data.action === "create_session"
    ) {

        setTimeout(
            () => {

                window.location.reload();

            },
            1500
        );

        return;

    }


    // =================================================
    // END SESSION
    // =================================================

    if (
        data.action === "end_session"
    ) {

        setTimeout(
            () => {

                window.location.reload();

            },
            1500
        );

        return;

    }


    // =================================================
    // SHOW ATTENDANCE
    // =================================================

    if (
        data.action === "show_attendance"
    ) {

        scrollToJarvisElement(
            "#attendanceSection"
        );

        return;

    }


    // =================================================
    // SHOW PENDING STUDENTS
    // =================================================

    if (
        data.action === "show_pending"
    ) {

        scrollToJarvisElement(
            "#pendingStudentsSection"
        );

        return;

    }


    // =================================================
    // SHOW STUDENTS
    // =================================================

    if (
        data.action === "show_students"
    ) {

        scrollToJarvisElement(
            "#studentsSection"
        );

        return;

    }


    // =================================================
    // STUDENT SEARCH
    // =================================================

    if (

        data.action ===
        "student_search"

        &&

        Array.isArray(
            data.students
        )

    ) {

        showJarvisSearchResults(
            data.students
        );

    }

}


// =====================================================
// SCROLL FUNCTION
// =====================================================

function scrollToJarvisElement(
    selector
) {

    const element =
        document.querySelector(
            selector
        );


    if (element) {

        element.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    } else {

        console.warn(
            "Jarvis element not found:",
            selector
        );

    }

}


// =====================================================
// DISPLAY SEARCH RESULTS
// =====================================================

function showJarvisSearchResults(
    students
) {

    const container =
        document.querySelector(
            "#jarvisResults"
        );


    if (!container) {

        console.warn(
            "Jarvis results container not found."
        );

        return;

    }


    // Clear old results
    container.innerHTML = "";


    if (students.length === 0) {

        container.textContent =
            "No students found.";

        return;

    }


    students.forEach(
        (student) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "jarvis-student-result";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                student.full_name ||
                "Unknown Student";


            const roll =
                document.createElement(
                    "div"
                );


            roll.textContent =
                `Roll No: ${
                    student.roll_no || "N/A"
                }`;


            const status =
                document.createElement(
                    "div"
                );


            status.textContent =
                `Status: ${
                    student.approved
                        ? "Approved"
                        : "Pending"
                }`;


            card.appendChild(
                name
            );


            card.appendChild(
                roll
            );


            card.appendChild(
                status
            );


            container.appendChild(
                card
            );

        }
    );


    container.scrollIntoView({

        behavior: "smooth",

        block: "center"

    });

}


// =====================================================
// START JARVIS
// =====================================================

function startJarvis() {

    if (!SpeechRecognition) {

        alert(
            "Speech Recognition is not supported. Please use Google Chrome."
        );

        return;

    }


    if (!recognition) {

        initializeJarvis();

    }


    manuallyStopped = false;


    clearTimeout(
        restartTimeout
    );


    if (isListening) {

        console.log(
            "Jarvis is already running."
        );

        return;

    }


    try {

        recognition.start();


        jarvisSpeak(
            "Jarvis is now online."
        );


    } catch (error) {

        console.log(
            "Jarvis already running."
        );

    }

}


// =====================================================
// STOP JARVIS
// =====================================================

function stopJarvis() {

    manuallyStopped = true;

    waitingForCommand = false;

    isProcessingCommand = false;


    clearTimeout(
        restartTimeout
    );


    if (recognition && isListening) {

        try {

            recognition.stop();

        } catch (error) {

            console.log(
                "Jarvis already stopped."
            );

        }

    }


    window.speechSynthesis.cancel();


    updateJarvisStatus(
        "🔴 Jarvis Offline"
    );


    console.log(
        "🔴 JARVIS OFFLINE"
    );

}


// =====================================================
// INITIALIZE AFTER PAGE LOAD
// =====================================================

document.addEventListener(

    "DOMContentLoaded",

    () => {

        initializeJarvis();

    }

);
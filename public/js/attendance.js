// =====================================================
// AI ATTENDANCE SCANNER
// =====================================================

"use strict";


// =====================================================
// ELEMENTS
// =====================================================

const video =
    document.getElementById("video");

const status =
    document.getElementById("status");

const btn =
    document.getElementById("btn");

const sessionInfo =
    document.getElementById("sessionInfo");


// =====================================================
// VARIABLES
// =====================================================

let cameraReady = false;

let modelsReady = false;

let detecting = false;

let attendanceProcessing = false;

let currentDescriptor = null;


// =====================================================
// STATUS
// =====================================================

function setStatus(
    message,
    color = "#00ff99"
) {

    if (!status) {
        return;
    }

    status.textContent =
        message;

    status.style.color =
        color;
}


// =====================================================
// BUTTON STATE
// =====================================================

function updateButton() {

    if (!btn) {
        return;
    }

    btn.disabled =
        !cameraReady ||
        !modelsReady ||
        !currentDescriptor ||
        attendanceProcessing;
}


// =====================================================
// CAMERA
// =====================================================

async function startCamera() {

    try {

        setStatus(
            "📷 Starting Camera...",
            "#00eaff"
        );


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera API is not available in this browser."
            );
        }


        const stream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    width: {
                        ideal: 320
                    },

                    height: {
                        ideal: 240
                    },

                    facingMode:
                        "user"
                },

                audio: false
            });


        video.srcObject =
            stream;


        await new Promise(
            (resolve, reject) => {

                video.onloadedmetadata =
                    async () => {

                        try {

                            await video.play();

                            resolve();

                        } catch (error) {

                            reject(error);
                        }
                    };
            }
        );


        cameraReady =
            true;


        setStatus(
            "📷 Camera Ready",
            "#00eaff"
        );


        updateButton();


    } catch (error) {

        console.error(
            "CAMERA ERROR:",
            error
        );


        cameraReady =
            false;


        setStatus(
            "❌ Camera could not start.",
            "#ff4d6d"
        );


        if (sessionInfo) {

            sessionInfo.textContent =
                "Allow camera permission and reload the page.";
        }


        updateButton();
    }
}


// =====================================================
// LOAD FACE API MODELS
// =====================================================

async function loadModels() {

    try {

        setStatus(
            "🤖 Loading Face AI...",
            "#00eaff"
        );


        if (
            typeof faceapi ===
            "undefined"
        ) {

            throw new Error(
                "face-api.js is not loaded."
            );
        }


        await faceapi.nets.tinyFaceDetector.loadFromUri(
            "/models"
        );


        await faceapi.nets.faceLandmark68Net.loadFromUri(
            "/models"
        );


        await faceapi.nets.faceRecognitionNet.loadFromUri(
            "/models"
        );


        modelsReady =
            true;


        setStatus(
            "✅ Face AI Ready",
            "#00ff99"
        );


        updateButton();


    } catch (error) {

        console.error(
            "MODEL ERROR:",
            error
        );


        modelsReady =
            false;


        setStatus(
            "❌ Face AI models failed.",
            "#ff4d6d"
        );


        if (sessionInfo) {

            sessionInfo.textContent =
                "Check public/models folder.";
        }


        updateButton();
    }
}


// =====================================================
// FACE DETECTION
// =====================================================

async function detectFace() {

    if (
        !cameraReady ||
        !modelsReady ||
        detecting ||
        attendanceProcessing
    ) {

        return;
    }


    if (
        !video ||
        video.readyState < 2
    ) {

        return;
    }


    detecting =
        true;


    try {

        const detection =
            await faceapi
                .detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 160,
                        scoreThreshold: 0.5
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();


        if (!detection) {

            currentDescriptor =
                null;


            setStatus(
                "😐 No Face Detected",
                "#ffaa00"
            );


            updateButton();

            return;
        }


        const descriptor =
            Array.from(
                detection.descriptor
            );


        if (
            descriptor.length !== 128
        ) {

            currentDescriptor =
                null;


            setStatus(
                "❌ Invalid Face Data",
                "#ff4d6d"
            );


            updateButton();

            return;
        }


        const valid =
            descriptor.every(
                value =>
                    Number.isFinite(
                        Number(value)
                    )
            );


        if (!valid) {

            currentDescriptor =
                null;


            setStatus(
                "❌ Invalid Face Descriptor",
                "#ff4d6d"
            );


            updateButton();

            return;
        }


        currentDescriptor =
            descriptor;


        setStatus(
            "😊 Face Detected • Ready",
            "#00ff99"
        );


        updateButton();


    } catch (error) {

        console.error(
            "FACE DETECTION ERROR:",
            error
        );


        currentDescriptor =
            null;


        updateButton();


    } finally {

        detecting =
            false;
    }
}


// =====================================================
// MARK ATTENDANCE
// =====================================================

async function markAttendance() {

    if (
        attendanceProcessing
    ) {

        return;
    }


    if (
        !currentDescriptor ||
        !Array.isArray(
            currentDescriptor
        ) ||
        currentDescriptor.length !== 128
    ) {

        setStatus(
            "❌ Please show your face first.",
            "#ff4d6d"
        );

        return;
    }


    attendanceProcessing =
        true;


    updateButton();


    setStatus(
        "🔍 Verifying Face...",
        "#00eaff"
    );


    try {

        console.log(
            "📷 Sending attendance request..."
        );


        const response =
            await fetch(
                "/student/attendance",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    credentials:
                        "same-origin",

                    body:
                        JSON.stringify({
                            faceDescriptor:
                                currentDescriptor
                        })
                }
            );


        console.log(
            "Attendance HTTP Status:",
            response.status
        );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let data;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const text =
                await response.text();


            data = {

                success: false,

                message:
                    text ||
                    "Server returned an unexpected response."
            };
        }


        console.log(
            "Attendance Response:",
            data
        );


        if (
            response.ok &&
            data.success
        ) {

            setStatus(
                "✅ " +
                (
                    data.message ||
                    "Attendance Marked Successfully."
                ),

                "#00ff99"
            );


            if (
                sessionInfo &&
                data.attendance &&
                data.attendance.session
            ) {

                sessionInfo.textContent =
                    "🟢 Session: " +
                    data.attendance.session;
            }


            currentDescriptor =
                null;


            updateButton();


            return;
        }


        setStatus(
            "❌ " +
            (
                data.message ||
                "Attendance Failed."
            ),

            "#ff4d6d"
        );


        currentDescriptor =
            null;


        updateButton();


    } catch (error) {

        console.error(
            "ATTENDANCE REQUEST ERROR:",
            error
        );


        setStatus(
            "❌ Could not connect to attendance server.",
            "#ff4d6d"
        );


        currentDescriptor =
            null;


        updateButton();


    } finally {

        attendanceProcessing =
            false;


        updateButton();
    }
}


// =====================================================
// BUTTON
// =====================================================

if (btn) {

    btn.addEventListener(
        "click",
        markAttendance
    );
}


// =====================================================
// STOP CAMERA
// =====================================================

window.addEventListener(
    "beforeunload",
    () => {

        if (
            video &&
            video.srcObject
        ) {

            const tracks =
                video.srcObject.getTracks();


            tracks.forEach(
                track => {
                    track.stop();
                }
            );
        }
    }
);


// =====================================================
// INITIALIZE
// =====================================================

async function initAttendance() {

    try {

        if (
            typeof faceapi ===
            "undefined"
        ) {

            setStatus(
                "❌ face-api.js not loaded.",
                "#ff4d6d"
            );

            return;
        }


        await startCamera();


        if (!cameraReady) {
            return;
        }


        await loadModels();


        if (!modelsReady) {
            return;
        }


        setStatus(
            "😊 Show Your Face",
            "#00ff99"
        );


        if (sessionInfo) {

            sessionInfo.textContent =
                "🟢 Attendance session will be checked when you mark attendance.";
        }


        setInterval(
            detectFace,
            700
        );


    } catch (error) {

        console.error(
            "ATTENDANCE INITIALIZATION ERROR:",
            error
        );


        setStatus(
            "❌ " +
            (
                error.message ||
                "Attendance scanner failed."
            ),

            "#ff4d6d"
        );
    }
}


// =====================================================
// START
// =====================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initAttendance
    );

} else {

    initAttendance();
}
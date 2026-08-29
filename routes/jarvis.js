const express = require("express");

const router = express.Router();

const jarvisController =
    require("../controllers/jarvisController");


router.post(
    "/command",
    jarvisController.processCommand
);


module.exports = router;
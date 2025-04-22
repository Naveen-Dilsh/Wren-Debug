var express = require("express");
var router = express.Router();

const {
  createGroup,
  getAllGroups,
  saveMessage,
  getGroupMessages,
} = require("../../controllers/groups.controller");

router.post("/initgroup", createGroup);
router.get("/groups", getAllGroups);
router.post("/savemessage", saveMessage);
router.get("/getgroup/messages", getGroupMessages);

module.exports = router;
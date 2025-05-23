var express = require("express");
var router = express.Router();

const {
  createGroup,
  getAllGroups,
  saveMessage,
  getGroupMessages,
  uploadGroupIcon,
  leaveGroup,
} = require("../../controllers/groups.controller");

router.post("/initgroup", createGroup);
router.get("/groups", getAllGroups);
router.post("/savemessage", saveMessage);
router.get("/getgroup/messages", getGroupMessages);
router.post('/uploadGroupIcon/:groupId', uploadGroupIcon);
router.post('/leave/:groupId', leaveGroup);


module.exports = router;
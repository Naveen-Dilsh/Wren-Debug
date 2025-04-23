const ObjectId = require("mongoose").Types.ObjectId;
var speakeasy = require("speakeasy");
var QRCode = require("qrcode");
let moment =require("moment")
const ShortUniqueId = require("short-unique-id");

const {
  response,
  responser,
  crypto,
  jwtAuth,
  sendEmail,
  getUnixTime,
} = require("../helper");

const Groups = require("../models/groups.model");
const Accounts = require("../models/accounts.model");
const Message = require("../models/message.model");
const GroupMessage = require("../models/groupMessage.model");
const client_url = process.env.CLIENT_URL;

let message = responser();

const createGroup = async function (req, res) {
  const payload = req.body;
  if (!payload) {
    return response.error(
      res,
      400,
      "Missing required fields."
    );
  }
  if (!payload.name || !payload.createdBy) {
    return response.error(res, 400, "Group name and creator are required.");
  }

  try {
    const creator = await Accounts.findOne({ _id: payload.createdBy });
    if (!creator) {
      return response.error(res, 400, "Creator not found.");
    }
    payload.createdAt = getUnixTime();
    payload.updatedAt = getUnixTime();

    const newGroup = new Groups(payload);
    const savedGroup = await newGroup.save()

    // Prepare welcome message with all required fields
    const welcomeMessage = {
      groupId: savedGroup._id,
      senderId: payload.createdBy,
      messageText: `Welcome to the group!\nCreated by ${creator.firstName} ${creator.lastName}`,
      senderName: `${creator.firstName} ${creator.lastName}`,
      attachment: [],
    }
    try {
      // Save welcome message
      await GroupMessage.create({
        groupId: welcomeMessage.groupId,
        content: welcomeMessage.messageText,
        sender: welcomeMessage.senderId,
        timestamp: Date.now(),
        senderName: welcomeMessage.senderName,
        attachment: welcomeMessage.attachment || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "Y",
      })

// Respond with success
return response.success(res, 201, "Group created successfully.", {
  groupId: savedGroup._id,
  name: savedGroup.name,
  createdBy: savedGroup.createdBy,
  members: savedGroup.members,
})
} catch (messageError) {
console.error("Error creating welcome message:", messageError)

// Even if welcome message fails, return success for group creation
return response.success(res, 201, "Group created, but welcome message failed.", {
  groupId: savedGroup._id,
  name: savedGroup.name,
})
}
} catch (error) {
console.error("Error creating group:", error)

// More detailed error response
return response.error(res, 500, `Server error: ${error.message || "Unknown error"}`)
}
}
const uploadGroupIcon = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    
    // Check if we have a file in the request (from FormData)
    let icon = null;
    
    if (req.file) {
      // If using multer middleware, the file will be in req.file
      // Convert file to base64 or save to storage and get URL
      const fileBuffer = req.file.buffer;
      icon = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
    } else if (req.body.icon) {
      // If sent as JSON
      icon = req.body.icon;
    }
    
    if (!groupId) {
      return response.error(res, 400, "Group ID is required.");
    }
    
    // Validate groupId is a valid ObjectId
    if (!ObjectId.isValid(groupId)) {
      return response.error(res, 400, "Invalid group ID format.");
    }
    
    // Find the group
    const group = await Groups.findById(groupId);
    if (!group) {
      return response.error(res, 404, "Group not found.");
    }
    
    // Update the group with the icon (if provided)
    if (icon) {
      group.icon = icon;
      group.updatedAt = getUnixTime();
      await group.save();
      
      console.log("Group icon updated successfully");
      return response.success(res, 200, "Group icon updated successfully.");
    } else {
      return response.error(res, 400, "No icon provided in the request.");
    }
  } catch (error) {
    console.error("Error uploading group icon:", error);
    return response.error(res, 500, `Server error: ${error.message || "Unknown error"}`);
  }
}

const getAllGroups = async function (req, res) {
  try {
    // Query the Groups collection to get all groups
    let groups = await Groups.aggregate([
     
      {
         $lookup: {
            from: 'groupmessages',
            localField: '_id', 
            foreignField: 'groupId',
            pipeline: [
               { $match: { status: {$ne:'D'} } },
               { $sort: { createdAt: -1 } }, // Sort messages by newest first
               { $limit: 1 }
            ],
            as: 'messages'
         }
      },
      {
         $addFields: { totalMessages: { $size: "$messages" } }
      },
      {
         $sort: { createdAt: -1 } 
      },
   ]);   
    if (groups.length === 0) {
      return response.error(res, 404, "No groups found.");
    }
    // Respond with the list of groups
    return response.success(res, 200, "Groups fetched successfully.", groups);
  } catch (error) {
    console.log(error);
    return response.error(res, 500, "Server error, please try again.");
  }
};

const saveMessage = async (req, res) => {
  try {
    const payload = req.body

    if (!payload) {
      return { success: false, message: "Request body is empty." }
    }

    if (!payload.groupId || !payload.senderId || !payload.messageText) {
      return { success: false, message: "Missing required message fields." }
    }

    const group = await Groups.findById(payload.groupId)
    if (!group) {
      return { success: false, message: "Group not found." }
    }

    const obj = {
      groupId: payload.groupId,
      content: payload.messageText,
      sender: payload.senderId,
      timestamp: Date.now(),
      senderName: payload.senderName || "Unknown",
      attachment: payload.attachment || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "Y",
    }

    await GroupMessage.create(obj)

    console.log("Message added successfully.")
    return { success: true, message: "Message added successfully." }
  } catch (error) {
    console.error("Error while inserting message:", error)
    return { success: false, message: `Error inserting message: ${error.message}` }
  }
}

const getGroupMessages = async function (req, res) {
  try {
    const groupId = req.query.groupId;
    let group = await Groups.aggregate([
      {
         $match: {
            _id: new ObjectId(groupId) 
         }
      },
      {
         $lookup: {
            from: 'groupmessages',
            localField: '_id', 
            foreignField: 'groupId',
            pipeline: [
               { $match: { status: {$ne:'D'} } },
            ],
            as: 'messages'
         }
      },
      {
         $addFields: { totalMessages: { $size: "$messages" } }
      },
      {
         $sort: { createdAt: -1 } 
      },
   ]);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }
    
    return res.status(200).json({
      success: true,
      messages: group[0],
    });
  } catch (error) {
    console.log(error.message,"waerstydjyuku");
    return response.error(res, 500, "Server error, please try again.");
  }
}

const leaveGroup = async (req, res) => {
  try {
    console.log("Leave group request received");
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!groupId || !userId) {
      return res.status(400).json({
        status: false,
        message: 'Group ID and User ID are required'
      });
    }

    // Convert IDs to ObjectId if they aren't already
    const groupObjectId = typeof groupId === 'string' ? new ObjectId(groupId) : groupId;
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

    // Find the group and remove the user from the members array
    const updatedGroup = await Groups.findOneAndUpdate(
      { _id: groupObjectId },
      { 
        $pull: { members: userObjectId },
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(404).json({
        status: false,
        message: 'Group not found'
      });
    }

    return res.status(200).json({
      status: true,
      message: 'Successfully left the group',
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error in leaveGroup controller:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  createGroup,
  getAllGroups,
  saveMessage,
  getGroupMessages,
  uploadGroupIcon,
  leaveGroup,
};

import React, { useState, useEffect, useRef } from "react";
import ChatBoxContainer from "../components/ChatBoxContainer";
import SearchBar from "../components/Searchbar";
import ChatWindow from "../components/ChatWindow";
import Default from "../assets/img/default_dp.png";
import { getData, postData } from "../components/Api";
import io from "socket.io-client";
import { sendNotify, fetchApi } from "../helper";

const WrenConnect = () => {
  const socket = useRef();
  socket.current = io(process.env.REACT_APP_SOCKET_URL);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [usersData, setUsersData] = useState([]);
  const [messageData, setMessageData] = useState([]);
  const [messageHistory, setMessageHistory] = useState([]);
  const [selectedChat, setSelectedChat] = useState("");
  const [searchTerm, setSearchTerm] = useState('');

  const [popupVisible, setPopupVisible] = useState(false);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState(Default);
  const [showGroupCreationPopup, setShowGroupCreationPopup] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    let payload = {
      method: "GET",
      url: `/auth/user`,
    };
    fetchApi(payload)
      .then((res) => {
        let data = res?.data;

        const currentUserId = localStorage.getItem("CURRUNT_USER_ID");
        const formattedUsers = data.list
          .filter((user) => user._id !== currentUserId)
          .map((user) => ({
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            designation: user.role.charAt(0).toUpperCase() + user.role.slice(1),
            profilePic: user.profileImg || Default,
            groupName: `${user.firstName} ${user.lastName}`,
            imageURL: user.profileImg,
            isOnline:user.isOnline,
            type: user.role,
            messages: [],
          }));
        setUsersData(formattedUsers);
        setMessageData(formattedUsers);
        fetchAllGroups();
      })
      .catch((err) => console.log(err));
  };

  //////////// IMPLEMENTATION FOR SINGLE CHAT /////////////
  const fetchChatHistory = async () => {
    const obj = {
      from: localStorage.getItem("CURRUNT_USER_ID"),
      to: selectedChat.id,
    };
    let payload = {
      method: "post",
      url: "/messages/chats",
      data: obj,
    };
    fetchApi(payload)
      .then((message_history) => {
        //   setMessageData([]);
        if (message_history) {
          const chat_history = message_history.messages?.map((msg, index) => ({
            id: index + 1,
            text: msg.text,
            time: msg.time,
            isSender: msg.isSender,
            attachment:msg.attachment
          }));
          console.log("message history data :", chat_history);
          console.log("selected chat", selectedChat);
          setMessageHistory(chat_history);
          if (message_history?.error) {
            console.log("message history fetching error", message_history);
          } else {
          }
        }
      })
      .catch((error) => ({ error: JSON.stringify(error) }));
  };

  //////////// IMPLEMENTATION FOR SINGLE CHAT /////////////
  useEffect(() => {
    if (selectedChat.type !== "groups") {
      fetchChatHistory();
    }
  }, [selectedChat]);



  const handleChatSelect = async (chat) => {
    try {
      //////////// IMPLEMENTATION FOR GROUP CHAT /////////////
      if (chat.type === "groups") {
        const msgs = await fetchGroupMessages(chat.id);
        console.log("Fetched messages:", msgs);

        const updatedData = messageData.map((item) => {
          if (item.groupName === chat.groupName) {
            return { ...item, unreadMessages: 0, messages: msgs }; // Updated chat
          }
          return item; // Other chats remain the same
        });

        // Force update state with updatedData
        setMessageData(updatedData);
        setSelectedChat({
          ...chat,
          messages: msgs, // Attach updated messages directly to selectedChat
        });
      } else {
        //////////// IMPLEMENTATION FOR SINGLE CHAT /////////////
        const updatedData = messageData.map((item) =>
          item.groupName === chat.groupName
            ? { ...item, unreadMessages: 0 }
            : item
        );
        setMessageData(updatedData);
        setSelectedChat(chat);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const togglePopup = () => {
    console.log("++++++++");
    setPopupVisible(!popupVisible);
    setIsGroupChat(false);
    setSelectedUsers([]);
  };

  const toggleGroupChat = () => {
    setIsGroupChat(true);
    setSelectedUsers([]);
  };

  const handleUserSelect = (user) => {
    if (!user) return;
    if (isGroupChat) {
      const isSelected = selectedUsers.some(
        (selectedUser) => selectedUser.id === user.id
      );
      const updatedUsers = isSelected
        ? selectedUsers.filter((selectedUser) => selectedUser.id !== user.id)
        : [...selectedUsers, user];
      setSelectedUsers(updatedUsers);
    } else {
      addUserToGroup(user);
    }
  };

  const addUserToGroup = (user) => {
    if (!user || !user.designation) return;
    const userType =
      user.designation.toLowerCase() === "admin"
        ? "clients"
        : user.designation.toLowerCase();

    const updatedData = [
      ...messageData,
      {
        imageURL: user.profilePic,
        groupName: user.name,
        lastMessage: "New member added",
        dateTime: "Now",
        unreadMessages: 0,
        type: userType,
         isOnline: true,
        messages: [],
      },
    ];

    setMessageData(updatedData);
    setPopupVisible(false);
  };

  const proceedToGroupCreation = () => {
    setPopupVisible(false);
    setShowGroupCreationPopup(true);
  };

  // NEW implementation in the working file
const handleGroupCreation = () => {
  if (!groupName.trim()) {
    sendNotify("error", "Please enter a group name")
    return
  }

  // Get current user from local storage
  const storedUser = localStorage.getItem(process.env.REACT_APP_CURRENT_USER)
  if (!storedUser) {
    sendNotify("error", "User not found. Please log in again")
    return
  }

  const currentUser = JSON.parse(storedUser)
  const userId = currentUser.id
  const selectedUserIds = selectedUsers.map((user) => user.id)

  // Create group WITHOUT any image first
  const groupData = {
    name: groupName.trim(),
    icon: null, // Don't send any image data initially
    createdBy: userId,
    members: [...selectedUserIds, userId], // Include current user in group
  }

  console.log("Creating group with data:", groupData)

  // Create group API call
  const payload = {
    method: "POST",
    url: "/chat/initgroup",
    data: groupData,
  }

  fetchApi(payload)
    .then((response) => {
      console.log("Group creation response:", response)

      if (response?.error) {
        sendNotify("error", response?.error?.response?.data?.message || "Failed to create group")
      } else {
        // Try different paths to find the groupId
        const groupId =
          response?.data?.groupId ||
          response?.data?._id ||
          response?.data?.id ||
          (response?.data && response?.data.group && response?.data.group._id)

        console.log("Extracted groupId:", groupId)

        if (groupId) {
          // Add new group to message data
          const newGroup = {
            id: groupId,
            imageURL: Default, // Use default image initially
            groupName: groupName.trim(),
            lastMessage: "Group created",
            dateTime: new Date().toLocaleString(),
            unreadMessages: 0,
            type: "groups",
            isOnline: true,
            messages: [],
          }

          setMessageData((prevData) => [...prevData, newGroup])
          setSelectedChat(newGroup)

          // If we have a custom image (not the default), upload it separately
          if (groupImage !== Default) {
            // Upload image separately - this is new code
            // Check if it's a blob URL
            const isGroupImageBlob = groupImage.startsWith("blob:")

            if (isGroupImageBlob) {
              // Convert blob to file data before sending to server
              fetch(groupImage)
                .then((res) => res.blob())
                .then(async (blob) => {
                  try {
                    // Convert blob to base64 string
                    const reader = new FileReader()
                    const base64Promise = new Promise((resolve) => {
                      reader.onloadend = () => resolve(reader.result)
                      reader.readAsDataURL(blob)
                    })

                    const base64String = await base64Promise

                    // Send the base64 string directly
                    const iconPayload = {
                      method: "POST",
                      url: `/chat/uploadGroupIcon/${groupId}`,
                      data: { icon: base64String },
                    }

                    const iconRes = await fetchApi(iconPayload)
                    console.log("Icon upload response:", iconRes)

                    if (iconRes?.error) {
                      sendNotify("warning", "Group created but icon upload failed")
                    } else {
                      // Update the group icon in the UI
                      setMessageData((prevData) =>
                        prevData.map((item) => (item.id === groupId ? { ...item, imageURL: groupImage } : item)),
                      )

                      if (selectedChat && selectedChat.id === groupId) {
                        setSelectedChat((prev) => ({ ...prev, imageURL: groupImage }))
                      }

                      sendNotify("success", "Group created with custom icon")
                    }
                  } catch (err) {
                    console.error("Error processing or uploading icon:", err)
                    sendNotify("warning", "Group created but icon upload failed")
                  }
                })
            } else {
              // It's already a data URL, send it directly
              const iconPayload = {
                method: "POST",
                url: `/chat/uploadGroupIcon/${groupId}`,
                data: { icon: groupImage },
              }

              fetchApi(iconPayload)
                .then((iconRes) => {
                  console.log("Icon upload response:", iconRes)
                  if (iconRes?.error) {
                    sendNotify("warning", "Group created but icon upload failed")
                  } else {
                    // Update the group icon in the UI
                    setMessageData((prevData) =>
                      prevData.map((item) => (item.id === groupId ? { ...item, imageURL: groupImage } : item)),
                    )

                    if (selectedChat && selectedChat.id === groupId) {
                      setSelectedChat((prev) => ({ ...prev, imageURL: groupImage }))
                    }

                    sendNotify("success", "Group created with custom icon")
                  }
                })
                .catch((err) => {
                  console.error("Error uploading icon:", err)
                  sendNotify("warning", "Group created but icon upload failed")
                })
            }
          } else {
            sendNotify("success", "Group created successfully")
          }

          setShowGroupCreationPopup(false)
          setGroupName("")
          setGroupImage(Default)
          setSelectedUsers([])
        } else {
          console.error("Group created but couldn't find ID in response", response)
          sendNotify("error", "Group created but no ID returned")
        }
      }
    })
    .catch((error) => {
      console.error("Error creating group:", error)
      sendNotify("error", "Failed to create group")
    })
}

  const renderAddNewChatPopup = () => (
    <div className="popup-overlay">
      <div className="popup-content">
        <button className="close-button" onClick={togglePopup}>
          <i className="ri-close-line"></i>
        </button>
        <h3>Add to WrenConnect</h3>      
        <div
          className={`new-group ${isGroupChat ? "selected" : ""}`}
          onClick={toggleGroupChat}
        >
          New Group Chat
        </div>
        <div
          className={`new-member ${!isGroupChat ? "selected" : ""}`}
          onClick={() => setIsGroupChat(false)}
        >
          New Personal Chat
        </div>
        <div className="user-list">
          {usersData.map((user) => {
            const isSelected = selectedUsers.some(
              (selectedUser) => selectedUser.id === user.id
            );
            return (
              <div
                key={user.id}
                className="user-item"
                onClick={() => handleUserSelect(user)}
              >
                <img
                  src={user.profilePic}
                  alt={user.name}
                  className="user-avatar"
                />
                <div className="user-information">
                  <span className="user-name">{user.name}</span>
                  <span className="user-designation">{user.designation}</span>
                </div>
                {isGroupChat && (
                  <div className="radio-button">
                    <i
                      className={
                        isSelected
                          ? "ri-radio-button-fill"
                          : "ri-radio-button-line"
                      }
                    ></i>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {isGroupChat && selectedUsers.length > 0 && (
          <button className="action-button" onClick={proceedToGroupCreation}>
            <i className="ri-arrow-right-circle-fill"></i>
          </button>
        )}
      </div>
    </div>
  );

  const renderGroupCreationPopup = () => (
    <div className="group-popup-overlay">
      <div className="group-popup-content">
        <button
          className="group-close-button"
          onClick={() => setShowGroupCreationPopup(false)}
        >
          <i className="ri-close-line"></i>
        </button>
        <h3 className="group-popup-title">Creating New Group</h3>
        <div className="group-icon-selection">
          <img src={Default} alt="Group Icon" className="group-icon-image" />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                setGroupImage(URL.createObjectURL(e.target.files[0]));
              } else {
                setGroupImage(Default);
              }
            }}
            className="group-icon-input"
          />
          <span className="group-icon-placeholder">ADD GROUP ICON</span>
        </div>
        <input
          type="text"
          placeholder="Add a Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="group-subject-input"
        />
        <button className="group-create-button" onClick={handleGroupCreation}>
          <i className="ri-check-line"></i>
        </button>
      </div>
    </div>
  );

  //////////// IMPLEMENTATION FOR GROUP CHAT /////////////
  const createGroup = (group, callback) => {
    if (!group.name || !group.createdBy) {
      console.error("Group name and createdBy are required fields.");
      return;
    }

    let payload = {
      method: "POST",
      url: "/chat/initgroup",
      data: group,
    };

    fetchApi(payload)
      .then((response) => {
        console.log(response);
        if (response) {
          if (response?.error) {
            sendNotify("error", response?.error?.response?.data?.message);
          } else {
            const groupId = response?.data?.groupId; // Retrieve groupId from response
            sendNotify("success", response?.message);
            console.log("New group created with group ID:", groupId);
            // Pass the groupId to the callback
            if (callback){
              callback(groupId);
              console.log("New group set with group ID:", groupId);
            }
              
          }
        }
      })
      .catch((error) => {
        sendNotify("error", "An error occurred: " + JSON.stringify(error));
      });
  };

  //////////// IMPLEMENTATION FOR GROUP CHAT /////////////
  const fetchAllGroups = async () => {
    try {
      let payload = {
        method: "GET",
        url: "/chat/groups",
      };

      const response = await fetchApi(payload);

      if (response?.error) {
        // sendNotify("error", response?.error?.response?.data?.message);
        return;
      }

      // Extract groups from response data
      const groups = response.data || [];
      console.log("Fetched groups:", groups);
      const currentUser = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_CURRENT_USER)
      );
      // Filter and map groups for the current user
      // Inside fetchAllGroups function
const updatedGroups = groups
.filter((group) => {
  // ONLY check if the user is in the members array
  // Don't consider createdBy as a separate condition for showing groups
  return group.members && Array.isArray(group.members)
    ? group.members.some(
        (memberId) => memberId.toString() === currentUser.id.toString()
      )
    : false;
})
.map((group) => {
  // Rest of your mapping logic remains the same
  if (group.messages && group.messages.length > 0) {
  }
  let type = group.messages[group.messages.length - 1]?.attachment?.length;
  console.log(type, "type66");
  return {
    id: group._id,
    imageURL: group.icon || "",
    groupName: group.name || "New Group",
    lastMessage:
      group.messages && group.messages.length > 0 && !type
        ? group.messages[group.messages.length - 1].content
        : type
        ? <i className="fa-solid fa-images">{type}</i>
        : "No messages",
    dateTime: new Date(group.createdAt * 1000).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    unreadMessages: group.messages
      ? group.messages.filter((msg) => !msg.read).length
      : 0,
    type: "groups",
    isOnline: true,
    messages: formatMessages(group.messages, currentUser.id.toString()) || [],
  };
});
        console.log("Updated groups:", updatedGroups);
      // Update the state with the filtered and mapped groups
      setMessageData((prevMessageData) => [
        ...prevMessageData,
        ...updatedGroups,
      ]);
    } catch (error) {
      // Handle fetch errors
      console.error("An error occurred:", error);

      if (error.response) {
        sendNotify("error", "Response error: " + error.response.data.message);
      } else if (error.message) {
        sendNotify("error", "Error message: " + error.message);
      } else {
        sendNotify("error", "An unknown error occurred.");
      }
    }
  };

  //////////// IMPLEMENTATION FOR GROUP CHAT /////////////
  const formatMessages = (messages, currentUserId) => {
    console.log(messages,"messages-676")
    return messages?.messages?.map((message, index) => {
      const messageDate = new Date(message.timestamp); // Convert timestamp to Date
      const hours = messageDate.getHours();
      const minutes = messageDate.getMinutes();
      const ampm = hours >= 12 ? "pm" : "am";
      const formattedTime = `${hours % 12 || 12}:${minutes
        .toString()
        .padStart(2, "0")}${ampm}`;

      const formattedDate =
        messageDate.toDateString() === new Date().toDateString()
          ? "Today"
          : messageDate.toLocaleDateString();

      const currentUser = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_CURRENT_USER)
      );
      const un = currentUser.firstName + " " + currentUser.lastName;

      return {
        id: index + 1, // Incremental ID
        text: message.content,
        attachment:message.attachment,
        time: `${formattedDate}, ${formattedTime}`,
        isSender: message.sender === currentUserId, // Check if the sender is the current user
        senderName: message.senderName === un ? "" : message.senderName,
      };
    });
  };

  //////////// IMPLEMENTATION FOR GROUP CHAT /////////////
  const fetchGroupMessages = async (groupId) => {
    try {
      let payload = {
        method: "GET",
        url: `/chat/getgroup/messages?groupId=${groupId}`,
      };

      const response = await fetchApi(payload);
      // console.log("API Response:", response);
      // console.log("API Response:", JSON.stringify(response));
      if (response?.error) {
        sendNotify(
          "error",
          response?.error?.response?.data?.messages || "Failed to load messages"
        );
        return [];
      }
      // setMessageData(...messageData, response.data.messages);
      const currentUser = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_CURRENT_USER)
      );
      return (
        formatMessages(response?.messages, currentUser.id.toString()) || []
      );
    } catch (error) {
      console.log(error,"errorerror")
      sendNotify("error", "Can not load messages");
      return [];
    }
  };

  return (
    <div className="main-container">
      <div className="leftColumnMain">
        <div className="topBar">
          <SearchBar placeholder="Search by chat names..." searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <button className="addButton" onClick={togglePopup}>
            <i className="ri-add-line"></i>
          </button>
        </div>
        <div className="group-card-wrapper">
          <ChatBoxContainer
            title="Groups"
            type="groups"
            searchTerm={searchTerm}
            messageData={messageData}
            onChatSelect={handleChatSelect}
          />
        </div>
        <div className="group-card-wrapper">
          <ChatBoxContainer
            title="Analysts"
            type="analyst"
            searchTerm={searchTerm}
            messageData={messageData}
            onChatSelect={handleChatSelect}
          />
        </div>
        <div className="group-card-wrapper">
          <ChatBoxContainer
            title="Clients"
            type="client"
            searchTerm={searchTerm}
            messageData={messageData}
            onChatSelect={handleChatSelect}
          />
        </div>
      </div>
      <div className="rightColumnMain">
        {selectedChat && (
          <div className="chatwindow">
            <ChatWindow user={selectedChat} chatHistory={messageHistory} />
          </div>
        )}
      </div>
      {popupVisible && renderAddNewChatPopup()}
      {showGroupCreationPopup && renderGroupCreationPopup()}
    </div>
  );
};

export default WrenConnect;
import React from "react";
import "../assets/css/style.scss";
import SingleGroupChat from "./SingleGroupChat";

const ChatBoxContainer = ({ title, messageData, type, onChatSelect, searchTerm }) => {
  
  function getMessageText(message) {
    const currentUser = JSON.parse(
      localStorage.getItem(process.env.REACT_APP_CURRENT_USER)
    );
    if (
      message ===
      "Welcome to the group!\ncreated by " +
        currentUser.firstName +
        " " +
        currentUser.lastName
    ) {
      return "Welcome to the group! Created by you";
    } else {
      return message;
    }
  }

  // Filter chats by type and search term
  const filteredChats = messageData
    .filter((chat) => chat.type === type)
    .filter((chat) =>
      chat.groupName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (filteredChats.length === 0) {
    return null; 
  }

  return (
    <div className="group-list">
      <h2 className="card-title">{title}</h2>
      {filteredChats.map((chat, index) => (
        <div key={index} onClick={() => onChatSelect(chat)}>
          <SingleGroupChat
            imageURL={chat.imageURL}
            groupName={chat.groupName}
            lastMessage={getMessageText(chat.lastMessage) || ""}
            dateTime={chat.dateTime || ""}
            unreadMessages={chat.unreadMessages || 0}
          />
        </div>
      ))}
    </div>
  );
};

export default ChatBoxContainer;
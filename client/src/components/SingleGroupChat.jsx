import React, { useState, useEffect } from 'react';
import { Popconfirm } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { fetchApi } from "../helper"; // Import fetchApi directly from helper.js

const SingleGroupChat = ({ chatId, imageURL, groupName, lastMessage, dateTime, unreadMessages, onDelete }) => {
  const [isDeleted, setIsDeleted] = useState(false);
  const currentUser = JSON.parse(
    localStorage.getItem(process.env.REACT_APP_CURRENT_USER)
  );

  const handleLeaveGroup = async () => {
    console.log(`Leaving Group ID: ${chatId} for user: ${currentUser.id}`);
    
    // Fix the URL path to match the route defined in your router
    const payload = {
      method: 'POST',
      url: `/chat/leave/${chatId}`, // Match the route in your router
      data: {
        userId: currentUser.id
      }
    };
    
    console.log("About to send request with payload:", payload);
    
    try {
      const response = await fetchApi(payload);
      if (!response.error) {
        // Store deleted chat IDs in local storage
        const deletedChats = JSON.parse(localStorage.getItem('deletedChats')) || [];
        localStorage.setItem('deletedChats', JSON.stringify([...deletedChats, chatId]));
        
        setIsDeleted(true);
        console.log(`Left group ${chatId} successfully.`);
        
        // Call onDelete callback if provided
        if (onDelete) {
          onDelete(chatId);
        }
      } else {
        console.error(`Error leaving group: ${response.error}`);
      }
    } catch (err) {
      console.error(`Unexpected error: ${err}`);
    }
  };

  if (isDeleted) return null;

  return (
    <div className="single-group-chat">
      <div className="mainColumnOne">
        <div className="columnOne">
          <div className="image-placeholder">
            <img src={imageURL} alt={groupName} />
          </div>
        </div>
        
        <div className="columnTwo">
          <div className="group-name">{groupName}</div>
          <div className="last-message">{lastMessage}</div>
        </div>
      </div>
      
      <div className="columnThree">
        <div className="date-time">{dateTime}</div>
        {unreadMessages > 0 && (
          <div className="unread-count">{unreadMessages}</div>
        )}
      </div>
          
      <div className="columnFour">
        <Popconfirm
          title="Are you sure you want to leave this group?"
          onConfirm={handleLeaveGroup}
          okText="Yes"
          cancelText="No"
        >
          <div className="deleteOption">
            <i className="ri-delete-bin-7-line"></i>
          </div>
        </Popconfirm>
      </div>
    </div>
  );
};

export default SingleGroupChat;
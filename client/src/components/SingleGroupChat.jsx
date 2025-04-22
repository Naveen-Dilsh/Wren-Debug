import React, { useState, useEffect } from 'react';
import { Popconfirm } from 'antd';
import { MoreOutlined } from '@ant-design/icons';

const SingleGroupChat = ({ chatId, imageURL, groupName, 
   lastMessage,
   dateTime, unreadMessages }) => {
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    const deletedChats = JSON.parse(localStorage.getItem('deletedChats')) || [];
    if (deletedChats.includes(chatId)) {
      setIsDeleted(true);
    }
  }, [chatId]);

  const handleConfirm = () => {
    setIsDeleted(true);

    const deletedChats = JSON.parse(localStorage.getItem('deletedChats')) || [];
    if (!deletedChats.includes(chatId)) {
      localStorage.setItem('deletedChats', JSON.stringify([...deletedChats, chatId]));
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
          title="Are you sure you want to delete this?"
          onConfirm={handleConfirm}
          okText="Yes"
          cancelText="No"
        >
          <div className="deleteOption">
          <i class="ri-delete-bin-7-line"></i>      
          </div>
        </Popconfirm>
      </div>

    </div>
  );
};

export default SingleGroupChat;

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { io } from 'socket.io-client';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      socketRef.current = io('https://updown-hms5.onrender.com');
      socketRef.current.emit('setup', user._id);
      socketRef.current.on('users online', (online) => setOnlineUsers(Array.isArray(online) ? online : []));

      socketRef.current.on('message received', (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        // Show notification if chat not focused or different user selected
        if (!document.hasFocus() || (selectedUser?._id !== newMessage.sender._id)) {
          const senderName = newMessage.sender?.fullName || newMessage.sender?.username || 'Unknown';
          const messageText = newMessage.text || newMessage.mediaType || 'New message';
          showNotification(senderName, messageText, `/chat/${newMessage.sender._id}`);
        }
      });

      return () => socketRef.current.disconnect();
    }
  }, [user, selectedUser]);

  useEffect(() => {
    if (selectedUser && user) {
      const conversationId = [user._id, selectedUser._id].sort().join('_');
      socketRef.current?.emit('join chat', conversationId);

      axios.get(`https://updown-hms5.onrender.com/api/messages/${user._id}/${selectedUser._id}`)
        .then(res => setMessages(Array.isArray(res.data) ? res.data : []))
        .catch(() => setMessages([]));

      socketRef.current?.emit('mark as read', { conversationId, userId: user._id });

      socketRef.current?.on('message status update', ({ messageId, status }) => {
        setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, status } : msg));
      });

      socketRef.current?.on('messages read', ({ conversationId }) => {
        setMessages(prev => prev.map(msg =>
          msg.receiver?._id === user._id ? { ...msg, status: 'read' } : msg
        ));
      });
    }

    return () => {
      socketRef.current?.off('message status update');
      socketRef.current?.off('messages read');
    };
  }, [selectedUser, user]);

  const sendMessage = (text) => {
    if (socketRef.current && selectedUser) {
      socketRef.current.emit('send message', {
        senderId: user._id,
        receiverId: selectedUser._id,
        text,
      });
    }
  };

  return (
    <ChatContext.Provider value={{ users, setUsers, selectedUser, setSelectedUser, messages, setMessages, sendMessage, onlineUsers }}>
      {children}
    </ChatContext.Provider>
  );
};

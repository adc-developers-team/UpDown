import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      socketRef.current = io('import.meta.env.VITE_API_URL');
      socketRef.current.emit('setup', user._id);
      socketRef.current.on('users online', (online) => setOnlineUsers(online));

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser && user) {
      const conversationId = [user._id, selectedUser._id].sort().join('_');
      socketRef.current?.emit('join chat', conversationId);

      axios.get(`import.meta.env.VITE_API_URL/api/messages/${user._id}/${selectedUser._id}`)
        .then(res => setMessages(res.data))
        .catch(console.log);

      socketRef.current?.emit('mark as read', { conversationId, userId: user._id });

      socketRef.current?.on('message received', (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
      });

      socketRef.current?.on('message status update', ({ messageId, status }) => {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, status } : msg
        ));
      });

      socketRef.current?.on('messages read', ({ conversationId }) => {
        setMessages(prev => prev.map(msg =>
          msg.receiver && msg.receiver._id === user._id ? { ...msg, status: 'read' } : msg
        ));
      });
    }

    return () => {
      socketRef.current?.off('message received');
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

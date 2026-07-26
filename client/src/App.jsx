import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Homepage from './pages/Homepage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import EditProfilePage from './pages/EditProfilePage'
import ChatRoomPage from './pages/ChatRoomPage'
import AddFriendsPage from './pages/AddFriendsPage'
import NotificationsPage from './pages/NotificationsPage'
import CreateGroupPage from './pages/CreateGroupPage'
import GroupChatPage from './pages/GroupChatPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import NotFoundPage from './pages/NotFoundPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import CallsPage from './pages/CallsPage'
import ChatsPage from './pages/ChatsPage'

function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen bg-chat-bg flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div></div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={user ? <Homepage /> : <Navigate to="/login" />} />
      <Route path="/chats" element={user ? <ChatsPage /> : <Navigate to="/login" />} />
      <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
      <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
      <Route path="/edit-profile" element={user ? <EditProfilePage /> : <Navigate to="/login" />} />
      <Route path="/chat/:userId" element={user ? <ChatRoomPage /> : <Navigate to="/login" />} />
      <Route path="/add-friends" element={user ? <AddFriendsPage /> : <Navigate to="/login" />} />
      <Route path="/notifications" element={user ? <NotificationsPage /> : <Navigate to="/login" />} />
      <Route path="/create-group" element={user ? <CreateGroupPage /> : <Navigate to="/login" />} />
      <Route path="/group-chat/:groupId" element={user ? <GroupChatPage /> : <Navigate to="/login" />} />
      <Route path="/calls" element={user ? <CallsPage /> : <Navigate to="/login" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App

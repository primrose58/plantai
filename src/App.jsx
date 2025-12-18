import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import About from './pages/About';
import Analyses from './pages/Analyses';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthModalProvider } from './contexts/AuthModalContext';
import AuthModal from './components/Auth/AuthModal';

import { Analytics } from "@vercel/analytics/react";

function App() {
  return (
    <ToastProvider>
      <AuthModalProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="community" element={<Community />} />
            <Route path="community/post/:postId" element={<PostDetail />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:chatId" element={<Chat />} />
            <Route path="analyses" element={<Analyses />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/:userId" element={<Profile />} />
            <Route path="about" element={<About />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
        <AuthModal />
        <Analytics />
      </AuthModalProvider>
    </ToastProvider>
  );
}

export default App;

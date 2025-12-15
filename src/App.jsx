import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Community from './pages/Community';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import About from './pages/About';
import Analyses from './pages/Analyses';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="community" element={<Community />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:chatId" element={<Chat />} />
          <Route path="analyses" element={<Analyses />} />
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;

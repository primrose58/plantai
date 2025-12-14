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
import Analyses from './pages/Analyses'; // Import
import { useAuth } from './contexts/AuthContext';

// Optionally add ProtectedRoute component here
function ProtectedRoute({ children }) {
  const { loading } = useAuth();
  // While loading, maybe show a spinner
  if (loading) return <div>Loading...</div>;
  // If not logged in, redirect handled by page logic or layout, 
  // but for strict protection:
  // if (!currentUser) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
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
  );
}

export default App;

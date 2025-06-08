import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import ChatbotUser from './components/ChatbotUser';

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root ke /user */}
        <Route path="/" element={<Navigate to="/user" replace />} />

        {/* Halaman untuk user */}
        <Route path="/user" element={<ChatbotUser />} />

        {/* Halaman untuk admin */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

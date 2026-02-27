// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import VideoFeedbackPage from './pages/videoReview';
import InterFeedbackPage from './pages/interReview';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/display" element={<VideoFeedbackPage />} />
        <Route path="/inter" element={<InterFeedbackPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

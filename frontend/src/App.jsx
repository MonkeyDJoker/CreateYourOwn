// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Home from './page/Home';
import Board from './page/Board';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/board" element={<Board />} />
    </Routes>
  );
}


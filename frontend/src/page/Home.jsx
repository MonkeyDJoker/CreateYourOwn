// src/pages/Home.jsx
import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <button className="home-btn" onClick={() => navigate('/board')}>
        Start Selecting Products
      </button>
    </div>
  );
}


// frontend/src/pages/Dashboard.tsx
import { Button } from "../components/Button";
import { useNavigate } from 'react-router-dom';
import api from '../api';

export const Dashboard = () => {
  const navigate = useNavigate();

  const startSession = async () => {
    try {
      const response = await api.post('/training-sessions');
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Check your connection or token.');
    }
  };

  return (
    <main className="page">
      <div className="card">
        <h1 className="title">Chess Opening Trainer</h1>
        <p className="subtitle">Ready to practice your lines?</p>

        <div className="dashboard-actions">
          <Button onClick={startSession}>
            Start New Training Session
          </Button>
        </div>
      </div>
    </main>
  );
};

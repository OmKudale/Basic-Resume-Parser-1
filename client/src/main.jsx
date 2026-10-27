import React,{ useState } from 'react';
import ReactDOM from 'react-dom/client';
import ResumeUploadForm from './components/ResumeUploadForm.jsx';
import MatchResults from './components/MatchResults.jsx';
import './index.css';

function App() {
  const [matchData, setMatchData] = useState(null);

  const handleSubmit = (data) => {
    setMatchData(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {matchData ? (
        <MatchResults match={matchData.match} onReset={() => setMatchData(null)} />
      ) : (
        <ResumeUploadForm onSubmit={handleSubmit} />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from 'react';

type Props = {
  onClick: () => void;
};

export const StartNewTrainingButton: React.FC<Props> = ({ onClick }) => {
  return (
    <button className="btn" onClick={onClick}>
      Start New Training Session
    </button>
  );
};

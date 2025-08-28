import { keyframes } from '@emotion/react';

export const pulseGlow = keyframes`
  0% { box-shadow: 0 0 5px rgba(66, 153, 225, 0.3); transform: scale(1); }
  50% { box-shadow: 0 0 20px rgba(66, 153, 225, 0.6); transform: scale(1.02); }
  100% { box-shadow: 0 0 5px rgba(66, 153, 225, 0.3); transform: scale(1); }
`;

export const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

export const bounceIn = keyframes`
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
`;

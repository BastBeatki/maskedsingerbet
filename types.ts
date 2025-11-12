export interface Player {
  id: string;
  name: string;
  color: string;
  imageUrl?: string;
}

export interface Show {
  id: string;
  name: string;
  episodeNumber: number;
}

export interface Tip {
  celebrityName: string;
  showId: string;
  createdAt: number; // Timestamp
  isFinal?: boolean; // Kennzeichnet einen "Volles Risiko"-Tipp
}

export interface Mask {
  id: string;
  name: string;
  imageUrl?: string;
  tips: {
    [playerId: string]: Tip[]; // Array of up to 3 tips
  };
  revealedCelebrity?: string;
  isRevealed: boolean;
}

export interface CounterBet {
  id: string;
  showId: string;
  maskId: string;
  bettorPlayerId: string; // The one placing the bet
  targetPlayerId: string; // The one whose tip is being bet against
  targetTipIndex: number; // The index of the tip in the target's tip array (0, 1, or 2)
}

export interface Season {
  id: string;
  seasonName: string;
  imageUrl?: string;
  playerIds: string[];
  masks: Mask[];
  shows: Show[];
  activeShowId: string | null;
  counterBets: CounterBet[];
}

export interface AppState {
  players: Player[];
  seasons: Season[];
}

export interface PlayerScore {
  playerId: string;
  name: string;
  color: string;
  score: number;
  counterBetPoints: number;
  totalScore: number;
  correctMasks: number;
  wonCounterBets: number;
}
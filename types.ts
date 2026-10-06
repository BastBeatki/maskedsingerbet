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
  opportunityId?: string;
  finalizedAt?: number;
  finalOpportunityId?: string;
}

export interface Mask {
  id: string;
  name: string;
  imageUrl?: string;
  tips: {
    [playerId: string]: Tip[]; // CLASSIC: up to 3; TOURNAMENT: immutable event history
  };
  revealedCelebrity?: string;
  isRevealed: boolean;
  revealedInShowId?: string;
  celebrityImageUrl?: string;
  opportunities?: RateOpportunity[];
  scoringAudit?: RevealAudit;
  priorChanceCount?: number;
  legacyTips?: Mask['tips'];
}

export interface CounterBet {
  id: string;
  showId: string;
  maskId: string;
  bettorPlayerId: string; // The one placing the bet
  targetPlayerId: string; // The one whose tip is being bet against
  targetTipIndex: number; // Stable index in the player's saved tip history
  opportunityId?: string;
  createdAt?: number;
  targetWasFinal?: boolean;
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
  ruleset?: RulesetVersion;
  tournamentTransition?: { sourceSeasonId: string; preparedAt: number };
  legacyOpenCounterBets?: CounterBet[];
}

export type RulesetVersion = 'classic-v1' | 'tournament-v1';
export interface RateOpportunity { id: string; showId: string; openedAt: number }
export interface ScoreComponent { label: string; points: number }
export interface PlayerMaskAudit {
  playerId: string; playerName: string; correct: boolean;
  tipIndex: number | null; tipPoints: number; counterBetPoints: number; total: number;
  wonCounterBets: number; components: ScoreComponent[];
  explanation: string;
}
export interface RevealAudit {
  schema: 1; ruleset: RulesetVersion; revealedAt: number; actualCelebrity: string;
  players: PlayerMaskAudit[];
  tipPoints: Record<string, number>;
  counterBetPoints: Record<string, { bettor: number; target: number }>;
  // Snapshot the evidence used at settlement, including final-lock and bet timestamps.
  evidence: { tips: Mask['tips']; opportunities: RateOpportunity[]; counterBets: CounterBet[]; shows: Show[]; priorChanceCount?: number };
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

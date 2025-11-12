import { AppState, Season, Player, Mask, PlayerScore, Tip, Show, CounterBet } from './types';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

const BASE_POINTS_PER_MASK = 20;

// Bonus multipliers for "Final Tips"
const FINAL_TIP_MULTIPLIER_FIRST = 1.8; // 80% bonus
const FINAL_TIP_MULTIPLIER_SECOND = 1.5; // 50% bonus


const getPointsForShow = (episodeNumber: number): number => {
    if (episodeNumber <= 1) return Math.round(BASE_POINTS_PER_MASK * 1.0); // Show 1 = 20
    if (episodeNumber === 2) return Math.round(BASE_POINTS_PER_MASK * 0.85); // Show 2 = 17
    if (episodeNumber === 3) return Math.round(BASE_POINTS_PER_MASK * 0.70); // Show 3 = 14
    if (episodeNumber === 4) return Math.round(BASE_POINTS_PER_MASK * 0.55); // Show 4 = 11
    if (episodeNumber === 5) return Math.round(BASE_POINTS_PER_MASK * 0.40); // Show 5 = 8
    return Math.round(BASE_POINTS_PER_MASK * 0.25); // Show 6+ = 5
}

export const calculateScores = (season: Season, allPlayers: Player[]): PlayerScore[] => {
  if (!season || !season.playerIds || !allPlayers) return [];

  const seasonPlayers = allPlayers.filter(p => season.playerIds.includes(p.id));

  const scores = seasonPlayers.map(player => ({
    playerId: player.id,
    name: player.name,
    color: player.color,
    score: 0,
    counterBetPoints: 0,
    totalScore: 0,
    correctMasks: 0,
    wonCounterBets: 0,
  }));

  const revealedMasks = season.masks.filter(mask => mask.isRevealed && mask.revealedCelebrity);

  for (const mask of revealedMasks) {
    const actualCelebrity = mask.revealedCelebrity!.trim().toLowerCase();
    
    // --- Tip Scoring Logic ---
    
    // 1. Find all correct tips for this mask across all players
    const allCorrectTips: { tip: Tip, playerId: string, show: Show }[] = [];
    for (const player of seasonPlayers) {
        const playerTips = mask.tips[player.id] || [];
        for (const tip of playerTips) {
            if (tip.celebrityName.trim().toLowerCase() === actualCelebrity) {
                const show = season.shows.find(s => s.id === tip.showId);
                if (show) {
                    allCorrectTips.push({ tip, playerId: player.id, show });
                }
            }
        }
    }

    if (allCorrectTips.length > 0) {
        // 2. Find the very first correct tip (the "original")
        allCorrectTips.sort((a, b) => {
            if (a.show.episodeNumber !== b.show.episodeNumber) {
                return a.show.episodeNumber - b.show.episodeNumber;
            }
            return a.tip.createdAt - b.tip.createdAt;
        });
        const originalTipInfo = allCorrectTips[0];

        // 3. Calculate points for each player based on their first correct tip
        for (const score of scores) {
            const playerCorrectTips = allCorrectTips.filter(t => t.playerId === score.playerId);
            
            if (playerCorrectTips.length > 0) {
                const playerFirstCorrectTip = playerCorrectTips[0]; // Already sorted by time
                score.correctMasks += 1;

                let pointMultiplier = 1.0;
                if (playerFirstCorrectTip.tip.isFinal) {
                    // Find the index of this tip in the player's original tip array
                    const originalPlayerTips = mask.tips[score.playerId] || [];
                    const tipIndex = originalPlayerTips.findIndex(t => t.createdAt === playerFirstCorrectTip.tip.createdAt);

                    if (tipIndex === 0) {
                        pointMultiplier = FINAL_TIP_MULTIPLIER_FIRST;
                    } else if (tipIndex === 1) {
                        pointMultiplier = FINAL_TIP_MULTIPLIER_SECOND;
                    }
                }

                const basePointsForShow = getPointsForShow(playerFirstCorrectTip.show.episodeNumber);
                const boostedPoints = basePointsForShow * pointMultiplier;
                
                let awardedPoints = 0;

                const isOriginal = playerFirstCorrectTip.tip.createdAt === originalTipInfo.tip.createdAt &&
                                   playerFirstCorrectTip.playerId === originalTipInfo.playerId;
                
                if (isOriginal) {
                    awardedPoints = Math.round(boostedPoints);
                } else {
                    awardedPoints = Math.round(boostedPoints * 0.4);
                }

                score.score += awardedPoints;
            }
        }
    }
    
    // --- End of Tip Scoring Logic ---

    // 4. Calculate counter-bet points based on the TARGETED TIP
    const relevantCounterBets = season.counterBets.filter(cb => cb.maskId === mask.id);
    for (const cb of relevantCounterBets) {
      const bettorScore = scores.find(s => s.playerId === cb.bettorPlayerId);
      const targetScore = scores.find(s => s.playerId === cb.targetPlayerId);
      
      if (!bettorScore || !targetScore) continue;

      const targetTip = mask.tips[cb.targetPlayerId]?.[cb.targetTipIndex];
      const counterBetShow = season.shows.find(s => s.id === cb.showId);

      if (!targetTip || !counterBetShow) continue; // Tip or show might have been deleted

      const tipShow = season.shows.find(s => s.id === targetTip.showId);
      if (!tipShow) continue; // Tip's original show might have been deleted

      // Calculate time decay factor: 20% decay per show difference, capped at 0.
      const showDifference = Math.max(0, counterBetShow.episodeNumber - tipShow.episodeNumber);
      const decayFactor = Math.max(0, 1.0 - (showDifference * 0.2));

      const isTargetTipCorrect = targetTip.celebrityName.trim().toLowerCase() === actualCelebrity;
      const isFinalTargetTip = targetTip.isFinal === true;

      // Define base points based on whether the bet is against a final tip
      const baseWinPoints = isFinalTargetTip ? 5 : 3;
      const baseBettorLossPoints = isFinalTargetTip ? -3 : -2;
      const baseTargetLossPoints = isFinalTargetTip ? -3 : -2;
      
      // Apply decay factor
      const winPoints = Math.round(baseWinPoints * decayFactor);
      const bettorLossPoints = Math.round(baseBettorLossPoints * decayFactor);
      const targetLossPoints = Math.round(baseTargetLossPoints * decayFactor);

      if (isTargetTipCorrect) {
        // Counter-bet was WRONG, bettor loses points
        bettorScore.counterBetPoints += bettorLossPoints;
      } else {
        // Counter-bet was CORRECT, bettor gains points, target loses points
        bettorScore.counterBetPoints += winPoints;
        if(targetLossPoints !== 0) {
            targetScore.counterBetPoints += targetLossPoints;
        }
        if(winPoints > 0) {
            bettorScore.wonCounterBets += 1;
        }
      }
    }
  }

  scores.forEach(s => s.totalScore = s.score + s.counterBetPoints);
  
  return scores.sort((a, b) => {
    if (b.correctMasks !== a.correctMasks) {
        return b.correctMasks - a.correctMasks;
    }
    if (b.wonCounterBets !== a.wonCounterBets) {
        return b.wonCounterBets - a.wonCounterBets;
    }
    return b.totalScore - a.totalScore;
  });
};


export const downloadJson = (data: object, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
};

export const isValidSeason = (season: any): season is Season => {
    if (typeof season !== 'object' || season === null) return false;
    if (typeof season.id !== 'string') return false;
    if (typeof season.seasonName !== 'string') return false;
    if (!Array.isArray(season.playerIds)) return false;
    if (!Array.isArray(season.masks)) return false;
    if (!Array.isArray(season.shows)) return false;
    if (!Array.isArray(season.counterBets)) return false;
    if (typeof season.activeShowId !== 'string' && season.activeShowId !== null) return false;

    for (const show of season.shows) {
        if (typeof show !== 'object' || show === null ||
            typeof show.id !== 'string' ||
            typeof show.name !== 'string' ||
            typeof show.episodeNumber !== 'number') {
            return false;
        }
    }
    
    for (const cb of season.counterBets) {
        if (typeof cb !== 'object' || cb === null ||
            typeof cb.id !== 'string' ||
            typeof cb.showId !== 'string' ||
            typeof cb.maskId !== 'string' ||
            typeof cb.bettorPlayerId !== 'string' ||
            typeof cb.targetPlayerId !== 'string' ||
            typeof cb.targetTipIndex !== 'number') { 
            return false;
        }
    }

    for (const mask of season.masks) {
        if (typeof mask !== 'object' || mask === null ||
            typeof mask.id !== 'string' ||
            typeof mask.name !== 'string' ||
            typeof mask.tips !== 'object' ||
            mask.tips === null ||
            typeof mask.isRevealed !== 'boolean') {
            return false;
        }
        for(const playerId in mask.tips){
            const tips = mask.tips[playerId];
            if(!Array.isArray(tips)) return false;
            for(const tip of tips){
                 if (typeof tip !== 'object' || tip === null ||
                    typeof tip.celebrityName !== 'string' ||
                    typeof tip.showId !== 'string' ||
                    typeof tip.createdAt !== 'number') {
                    return false;
                }
            }
        }
    }

    return true;
};

export const isValidAppState = (state: any): state is AppState => {
    if (typeof state !== 'object' || state === null) return false;
    if (!Array.isArray(state.seasons)) return false;
    if (!Array.isArray(state.players)) return false;
    
    for (const player of state.players) {
        if (typeof player !== 'object' || player === null ||
            typeof player.id !== 'string' ||
            typeof player.name !== 'string' ||
            typeof player.color !== 'string') {
            return false;
        }
    }

    for (const season of state.seasons) {
        if (!isValidSeason(season)) return false;
    }
    return true;
};
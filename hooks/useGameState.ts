import { useState, useEffect } from 'react';
import { AppState, Season, Player, Mask, Tip, Show, CounterBet } from '../types';
import { generateId, isValidAppState, isValidSeason } from '../utils';
import { PLAYER_COLORS } from '../constants';

// --- IndexedDB Helper Functions ---
const DB_NAME = 'MaskedSingerTipperDB';
const DB_VERSION = 1;
const STORE_NAME = 'appStateStore';
const STATE_KEY = 'mainState';

const getDb = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(`IndexedDB error: ${request.error}`);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

const saveStateDB = async (state: AppState): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(`Transaction error: ${transaction.error}`);
        const store = transaction.objectStore(STORE_NAME);
        store.put(state, STATE_KEY);
    });
};

const loadStateDB = async (): Promise<AppState | null> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(STATE_KEY);
        request.onsuccess = () => resolve((request.result as AppState) || null);
        request.onerror = () => reject(`Request error: ${request.error}`);
    });
};

const clearStateDB = async (): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(`Transaction error while clearing: ${transaction.error}`);
        const store = transaction.objectStore(STORE_NAME);
        store.clear(); // Clears all data in the object store
    });
};


const LEGACY_STORAGE_KEY = 'maskedSingerTipperState';
const APP_STORAGE_KEY = 'maskedSingerTipperApp';

const createDefaultState = (): AppState => ({
  seasons: [],
  players: [],
});

export const useAppManager = () => {
  const [appState, setAppState] = useState<AppState>(createDefaultState());
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state from IndexedDB or migrate from localStorage
  useEffect(() => {
    const initializeState = async () => {
      try {
        const stateFromDb = await loadStateDB();
        
        if (stateFromDb && isValidAppState(stateFromDb)) {
          setAppState(stateFromDb);
        } else {
          // If no (or invalid) DB state, check localStorage for one-time migration
          const savedAppState = localStorage.getItem(APP_STORAGE_KEY);
          if (savedAppState) {
            console.log("Found localStorage data, attempting migration to IndexedDB...");
            let parsed = JSON.parse(savedAppState);

            if (parsed.seasons && parsed.seasons.length > 0 && parsed.seasons[0].players && !parsed.players) {
              console.log("Old data structure detected. Migrating players to global list...");
              const allPlayersMap = new Map<string, Player>();
              parsed.seasons.forEach((season: any) => {
                  if (Array.isArray(season.players)) {
                      season.players.forEach((player: Player) => {
                          if (!allPlayersMap.has(player.id)) {
                              allPlayersMap.set(player.id, player);
                          }
                      });
                      season.playerIds = season.players.map((p: Player) => p.id);
                  } else {
                      season.playerIds = [];
                  }
                  delete season.players;
              });
              parsed.players = Array.from(allPlayersMap.values());
              console.log("Migration complete.");
            }

            if (isValidAppState(parsed)) {
              setAppState(parsed);
              // The save effect will handle writing this to IndexedDB
              localStorage.removeItem(APP_STORAGE_KEY);
              console.log("Migration successful. localStorage cleared.");
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();
  }, []);

  // Save state to IndexedDB whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveStateDB(appState).catch(err => console.error("Failed to save state to DB:", err));
    }
  }, [appState, isLoading]);

  const updateAppState = (updater: (prevState: AppState) => AppState) => {
    setAppState(updater);
  };
  
  const withSeason = (seasonId: string, updater: (season: Season) => Season) => {
    updateAppState(prev => ({
      ...prev,
      seasons: prev.seasons.map(s => s.id === seasonId ? updater(s) : s),
    }));
  };

  // --- Season Management ---
  const addSeason = (name: string) => {
    if (!name.trim()) return;
    const newSeason: Season = {
      id: generateId(),
      seasonName: name.trim(),
      playerIds: [],
      masks: [],
      shows: [],
      activeShowId: null,
      counterBets: [],
    };
    updateAppState(prev => ({ ...prev, seasons: [...prev.seasons, newSeason] }));
  };
  
  const updateSeason = (id: string, name: string, imageUrl?: string) => {
    updateAppState(prev => ({
        ...prev,
        seasons: prev.seasons.map(s => s.id === id ? { ...s, seasonName: name, imageUrl: imageUrl !== undefined ? imageUrl : s.imageUrl } : s)
    }));
  };

  const deleteSeason = (id: string) => {
    if (window.confirm("Are you sure you want to delete this entire season? This is irreversible.")) {
        updateAppState(prev => ({
            ...prev,
            seasons: prev.seasons.filter(s => s.id !== id)
        }));
    }
  };

  // --- Global Player Management ---
  const addPlayer = (name: string) => {
    if (!name.trim()) return;
    updateAppState(prev => {
        const newPlayer: Player = {
            id: generateId(),
            name: name.trim(),
            color: PLAYER_COLORS[prev.players.length % PLAYER_COLORS.length],
        };
        return { ...prev, players: [...prev.players, newPlayer] };
    });
  };

  const updatePlayer = (id: string, name: string, color: string, imageUrl?: string) => {
    updateAppState(prev => ({
        ...prev,
        players: prev.players.map(p => p.id === id ? { ...p, name, color, imageUrl: imageUrl !== undefined ? imageUrl : p.imageUrl } : p),
    }));
  };

  const deletePlayer = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this player globally? They will be removed from ALL seasons.")) return;
    updateAppState(prev => {
        const newSeasons = prev.seasons.map(season => {
            const newMasks = season.masks.map(mask => {
                const newTips = { ...mask.tips };
                delete newTips[id];
                return { ...mask, tips: newTips };
            });
            const newCounterBets = season.counterBets.filter(cb => cb.bettorPlayerId !== id && cb.targetPlayerId !== id);
            return {
                ...season,
                playerIds: season.playerIds.filter(pid => pid !== id),
                masks: newMasks,
                counterBets: newCounterBets,
            };
        });

        return {
            ...prev,
            players: prev.players.filter(p => p.id !== id),
            seasons: newSeasons
        }
    });
  };

  // --- Season-Player Linking ---
  const addPlayerToSeason = (seasonId: string, playerId: string) => {
      withSeason(seasonId, season => {
          if (season.playerIds.includes(playerId)) return season;
          return { ...season, playerIds: [...season.playerIds, playerId] };
      });
  };
  
  const removePlayerFromSeason = (seasonId: string, playerId: string) => {
      if (!window.confirm("Are you sure you want to remove this player from this season? All their tips and bets for this season will be removed.")) return;
      withSeason(seasonId, season => {
          const newMasks = season.masks.map(mask => {
              const newTips = { ...mask.tips };
              delete newTips[playerId];
              return { ...mask, tips: newTips };
          });
          const newCounterBets = season.counterBets.filter(cb => cb.bettorPlayerId !== playerId && cb.targetPlayerId !== playerId);
  
          return {
              ...season,
              playerIds: season.playerIds.filter(pid => pid !== playerId),
              masks: newMasks,
              counterBets: newCounterBets,
          };
      });
  };

  // --- Mask Management ---
  const addMask = (seasonId: string, name: string, imageUrl?: string) => {
     if (!name.trim()) return;
     withSeason(seasonId, season => {
      const newMask: Mask = {
        id: generateId(),
        name: name.trim(),
        imageUrl,
        tips: {},
        isRevealed: false,
      };
      return { ...season, masks: [...season.masks, newMask] };
    });
  };

  const updateMask = (seasonId: string, id: string, name: string, imageUrl?: string) => {
    withSeason(seasonId, season => ({
        ...season,
        masks: season.masks.map(m => m.id === id ? { ...m, name, imageUrl: imageUrl !== undefined ? imageUrl : m.imageUrl } : m),
    }));
  };

  const deleteMask = (seasonId: string, id: string) => {
    if (!window.confirm("Are you sure you want to delete this mask?")) return;
    withSeason(seasonId, season => ({
        ...season,
        masks: season.masks.filter(m => m.id !== id),
        counterBets: season.counterBets.filter(cb => cb.maskId !== id),
    }));
  };

  const revealMask = (seasonId: string, id: string, celebrityName: string) => {
    withSeason(seasonId, season => ({
        ...season,
        masks: season.masks.map(m => m.id === id ? { ...m, isRevealed: true, revealedCelebrity: celebrityName } : m),
    }));
  };

  // --- Tip Management ---
  const addOrUpdateTip = (seasonId: string, maskId: string, playerId: string, celebrityName: string, isFinal: boolean) => {
    withSeason(seasonId, season => {
        if (!season.activeShowId) {
            alert("Please start or select a show before adding a tip.");
            return season;
        }

        const newMasks = season.masks.map(mask => {
            if (mask.id === maskId) {
                const playerTips = mask.tips[playerId] || [];

                if (playerTips.some(tip => tip.isFinal)) {
                    alert("You have already submitted a final tip for this mask and cannot change it.");
                    return mask;
                }

                if (playerTips.length >= 3) {
                    alert("Maximum of 3 tips reached for this player and mask.");
                    return mask;
                }
                
                const newTip: Tip = { 
                    celebrityName, 
                    showId: season.activeShowId!, 
                    createdAt: Date.now(),
                    isFinal: playerTips.length < 2 ? isFinal : false // isFinal can only be true for tip 1 and 2
                };

                const newPlayerTips = [...playerTips, newTip];
                
                return { ...mask, tips: { ...mask.tips, [playerId]: newPlayerTips }};
            }
            return mask;
        });
        return { ...season, masks: newMasks };
    });
  };

  const deleteLastTip = (seasonId: string, maskId: string, playerId: string) => {
     withSeason(seasonId, season => {
        const newMasks = season.masks.map(mask => {
            if (mask.id === maskId) {
                const playerTips = mask.tips[playerId] || [];
                if (playerTips.length > 0) {
                    if (playerTips[playerTips.length - 1].isFinal) {
                        alert("You cannot delete a final tip.");
                        return mask;
                    }
                    const newPlayerTips = playerTips.slice(0, -1);
                    return { ...mask, tips: { ...mask.tips, [playerId]: newPlayerTips }};
                }
            }
            return mask;
        });
        return { ...season, masks: newMasks };
    });
  };

  // --- Counter-Bet Management ---
  const addCounterBet = (seasonId: string, maskId: string, bettorPlayerId: string, targetPlayerId: string) => {
    withSeason(seasonId, season => {
        if (!season.activeShowId) {
            alert("Please start a show to place a counter-bet.");
            return season;
        }
        if (bettorPlayerId === targetPlayerId) {
            alert("A player cannot bet against themselves.");
            return season;
        }

        const alreadyBet = season.counterBets.some(cb => 
            cb.maskId === maskId &&
            cb.bettorPlayerId === bettorPlayerId &&
            cb.targetPlayerId === targetPlayerId
        );

        if (alreadyBet) {
            alert("You have already placed a counter-bet against this player for this mask.");
            return season;
        }
        
        const targetTips = season.masks.find(m => m.id === maskId)?.tips[targetPlayerId] || [];
        if (targetTips.length === 0) {
            alert("This player has no tips to bet against for this mask.");
            return season;
        }
        
        const lastTipIndex = targetTips.length - 1;

        const newCounterBet: CounterBet = {
            id: generateId(),
            showId: season.activeShowId,
            maskId,
            bettorPlayerId,
            targetPlayerId,
            targetTipIndex: lastTipIndex,
        };
        
        return { ...season, counterBets: [...season.counterBets, newCounterBet] };
    });
  };

  const deleteCounterBet = (seasonId: string, id: string) => {
    withSeason(seasonId, season => ({
        ...season,
        counterBets: season.counterBets.filter(cb => cb.id !== id),
    }));
  };

  // --- Show Management ---
  const addShow = (seasonId: string) => {
    withSeason(seasonId, season => {
        const newEpisodeNumber = season.shows.length > 0 ? Math.max(...season.shows.map(s => s.episodeNumber)) + 1 : 1;
        const newShow: Show = {
            id: generateId(),
            name: `Show ${newEpisodeNumber}`,
            episodeNumber: newEpisodeNumber
        };
        return { ...season, shows: [...season.shows, newShow], activeShowId: newShow.id };
    });
  };
  
  const deleteShow = (seasonId: string, showId: string) => {
    if (!window.confirm("Are you sure you want to delete this show? All tips and counter-bets from this show will be permanently removed.")) return;
    
    withSeason(seasonId, season => {
      const newShows = season.shows.filter(s => s.id !== showId);
      const newMasks = season.masks.map(mask => {
        const newTips = { ...mask.tips };
        for (const playerId in newTips) {
          newTips[playerId] = newTips[playerId].filter(tip => tip.showId !== showId);
        }
        return { ...mask, tips: newTips };
      });
      const newCounterBets = season.counterBets.filter(cb => cb.showId !== showId);
      
      let newActiveShowId = season.activeShowId;
      if (season.activeShowId === showId) {
        newActiveShowId = newShows.length > 0 ? newShows[newShows.length - 1].id : null;
      }

      return { ...season, shows: newShows, masks: newMasks, counterBets: newCounterBets, activeShowId: newActiveShowId };
    });
  };


  const setActiveShowId = (seasonId: string, id: string) => {
      withSeason(seasonId, season => ({ ...season, activeShowId: id }));
  };

  const importState = (newState: any) => {
    try {
        if (isValidAppState(newState)) {
            setAppState(newState);
            alert("Data imported successfully!");
        } else if (isValidSeason(newState)) { // Legacy import of a single season object
            console.log("Importing legacy single-season format.");
            const importedSeason = newState;
            // This case assumes the old structure where players are inside the season
            const players = (importedSeason as any).players || []; 
            importedSeason.playerIds = players.map((p: Player) => p.id);
            delete (importedSeason as any).players;

            updateAppState(prev => {
                const existingPlayerIds = new Set(prev.players.map(p => p.id));
                const newPlayers = players.filter((p: Player) => !existingPlayerIds.has(p.id));
                return {
                    players: [...prev.players, ...newPlayers],
                    seasons: [...prev.seasons, importedSeason]
                }
            });

            alert("Legacy data imported successfully as a new season!");
        } else {
            alert("Import failed: The file format is invalid or corrupted.");
        }
    } catch(e) {
        alert("An error occurred during import.");
        console.error(e);
    }
  };

  const resetGame = async () => {
    if (window.confirm("Are you sure you want to reset EVERYTHING? All seasons and data will be deleted. This action cannot be undone.")) {
        try {
            await clearStateDB();
            setAppState(createDefaultState());
            // Also clear old localStorage keys, just in case.
            localStorage.removeItem(APP_STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            alert("All data has been reset successfully.");
        } catch (error) {
            console.error("Failed to reset data:", error);
            alert("An error occurred while resetting the data.");
        }
    }
  }

  return {
    appState,
    isLoading,
    addSeason,
    updateSeason,
    deleteSeason,
    addPlayer,
    updatePlayer,
    deletePlayer,
    addPlayerToSeason,
    removePlayerFromSeason,
    addMask,
    updateMask,
    deleteMask,
    revealMask,
    addOrUpdateTip,
    deleteLastTip,
    addCounterBet,
    deleteCounterBet,
    addShow,
    deleteShow,
    setActiveShowId,
    importState,
    resetGame,
  };
};
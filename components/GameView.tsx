import React, { useState, useEffect } from 'react';
import { Season, Mask, Player, PlayerScore, Tip, Show, CounterBet } from '../types';
import { calculateScores, fileToBase64 } from '../utils';
import { Button, Card, Input, Modal } from './common/UI';

// --- Leaderboard ---
const Leaderboard: React.FC<{ scores: PlayerScore[], players: Player[] }> = ({ scores, players }) => (
  <Card className="mb-8">
    <h2 className="text-3xl font-bold mb-4">Gesamt-Leaderboard</h2>
    {scores.length > 0 ? (
      <div className="space-y-2">
        {scores.map((player, index) => {
          const playerDetails = players.find(p => p.id === player.playerId);
          const rankColor = index === 0 ? 'bg-green-500' : index === 1 ? 'bg-gray-500' : index === 2 ? 'bg-yellow-700' : 'bg-tertiary';
          
          return (
            <div key={player.playerId} className="bg-background p-4 rounded-lg flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0 ${rankColor}`}>
                {index + 1}
              </div>
              <div className="flex items-center gap-3 flex-grow truncate">
                  {playerDetails?.imageUrl 
                    ? <img src={playerDetails.imageUrl} alt={player.name} className="w-12 h-12 rounded-full object-cover"/> 
                    : <div className="w-12 h-12 rounded-full" style={{ backgroundColor: player.color }}></div>
                  }
                  <span className="font-bold text-xl truncate">{player.name}</span>
              </div>
              <div className="hidden sm:block text-right">
                  <div className="text-sm text-text-secondary">Masken</div>
                  <div className="text-xl font-bold">{player.correctMasks}</div>
              </div>
              <div className="hidden sm:block text-right">
                  <div className="text-sm text-text-secondary">Gegenwetten</div>
                  <div className="text-xl font-bold">{player.wonCounterBets}</div>
              </div>
              <div className="text-right">
                  <div className="text-sm text-text-secondary">Punkte</div>
                  <div className="text-2xl font-extrabold">{player.totalScore}</div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-text-secondary">Keine Spieler in dieser Season. Füge Spieler in den Einstellungen hinzu.</p>
    )}
  </Card>
);

// --- Reveal Modal ---
const RevealModal: React.FC<{
    mask: Mask; 
    isOpen: boolean; 
    onClose: () => void; 
    onReveal: (celebrity: string, imageUrl?: string) => void;
}> = ({ mask, isOpen, onClose, onReveal }) => {
    const [celebrityName, setCelebrityName] = useState('');
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | undefined>('');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (celebrityName.trim()) {
            let finalImageUrl: string | undefined;
            if (newImageFile) {
                finalImageUrl = await fileToBase64(newImageFile);
            }
            onReveal(celebrityName.trim(), finalImageUrl);
            onClose();
        }
    }
    
    useEffect(() => {
        if(isOpen) {
            setCelebrityName('');
            setNewImageFile(null);
            setImagePreview(undefined);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Demaskiere ${mask.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Name des Promis"
                    type="text"
                    placeholder="Namen eingeben"
                    value={celebrityName}
                    onChange={(e) => setCelebrityName(e.target.value)}
                    autoFocus
                    required
                />
                 <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Bild des Promis (optional)</label>
                    {imagePreview && <img src={imagePreview} alt="Vorschau" className="w-full h-40 object-cover rounded-lg mb-2" />}
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                </div>
                <Button type="submit" className="w-full">Identität demaskieren</Button>
            </form>
        </Modal>
    );
};


// --- Tip Modal ---
const TipModal: React.FC<{
    mask: Mask;
    player: Player;
    shows: Show[];
    isOpen: boolean;
    onClose: () => void;
    onSaveTip: (celebrityName: string, isFinal: boolean) => void;
    onDeleteLastTip: () => void;
}> = ({ mask, player, shows, isOpen, onClose, onSaveTip, onDeleteLastTip }) => {
    const [newTipName, setNewTipName] = useState('');
    const [isFinal, setIsFinal] = useState(false);
    const playerTips = mask.tips[player.id] || [];

    useEffect(() => {
        if(isOpen) {
            setNewTipName('');
            setIsFinal(false);
        }
    }, [isOpen]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTipName.trim()) {
            onSaveTip(newTipName.trim(), isFinal);
            setNewTipName('');
            setIsFinal(false);
        }
    };
    
    const getShowName = (showId: string) => shows.find(s => s.id === showId)?.name || 'Unbekannte Show';
    const hasFinalTip = playerTips.some(tip => tip.isFinal);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Tipps für ${mask.name}`}>
            <div className="flex items-center gap-3 mb-4">
                {player.imageUrl 
                  ? <img src={player.imageUrl} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                  : <div className="w-12 h-12 rounded-full" style={{backgroundColor: player.color}}></div>
                }
                <h3 className="text-2xl font-bold">{player.name}</h3>
            </div>
            <div className="space-y-4">
                {playerTips.map((tip, index) => (
                    <div key={index} className="bg-background p-3 rounded-lg flex justify-between items-start">
                        <div>
                            <p className="font-bold text-lg">"{tip.celebrityName}"</p>
                            <p className="text-sm text-text-secondary">Getippt in: {getShowName(tip.showId)}</p>
                        </div>
                        {tip.isFinal && (
                            <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 border border-yellow-600 px-2 py-1 rounded-full">
                                FINAL GESPERRT
                            </span>
                        )}
                    </div>
                ))}
                 {playerTips.length === 0 && <p className="text-text-secondary">Noch keine Tipps abgegeben.</p>}
            </div>

            {!mask.isRevealed && !hasFinalTip && (
                <div className="mt-6 border-t border-border pt-4">
                    {playerTips.length < 3 ? (
                        <form onSubmit={handleSave} className="space-y-4">
                            <Input
                                type="text"
                                placeholder={`Tipp #${playerTips.length + 1} eingeben`}
                                value={newTipName}
                                onChange={(e) => setNewTipName(e.target.value)}
                                required
                            />
                            {playerTips.length < 2 && (
                                <div className="flex items-center gap-3 bg-background p-3 rounded-lg">
                                    <input
                                        id="final-tip-checkbox"
                                        type="checkbox"
                                        checked={isFinal}
                                        onChange={(e) => setIsFinal(e.target.checked)}
                                        className="h-5 w-5 rounded bg-surface border-border text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="final-tip-checkbox" className="flex flex-col">
                                        <span className="font-semibold text-text-primary">Als finalen Tipp sperren (Volles Risiko)</span>
                                        <span className="text-sm text-text-secondary">Du kannst keine weiteren Tipps für diese Maske abgeben!</span>
                                    </label>
                                </div>
                            )}
                            <Button type="submit" className="w-full">Tipp hinzufügen</Button>
                        </form>
                    ) : (
                        <p className="text-center font-semibold text-text-secondary">Maximum von 3 Tipps erreicht.</p>
                    )}
                     {playerTips.length > 0 && (
                        <Button variant="danger" onClick={onDeleteLastTip} className="w-full mt-2">Letzten Tipp löschen</Button>
                    )}
                </div>
            )}
            {hasFinalTip && <p className="text-center font-bold text-yellow-400 mt-4">Dein finaler Tipp ist gesperrt!</p>}
        </Modal>
    );
};

// --- CounterBets Modal ---
const CounterBetsModal: React.FC<{
    mask: Mask;
    players: Player[];
    shows: Show[];
    counterBets: CounterBet[];
    isOpen: boolean;
    onClose: () => void;
    onAddCounterBet: (bettorPlayerId: string, targetPlayerId: string) => void;
    onDeleteCounterBet: (id: string) => void;
}> = ({ mask, players, shows, counterBets, isOpen, onClose, onAddCounterBet, onDeleteCounterBet }) => {
    const [bettorId, setBettorId] = useState('');
    const [targetId, setTargetId] = useState('');

    const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unbekannter Spieler';
    const getShowName = (id: string) => shows.find(s => s.id === id)?.name || 'Unbekannte Show';

    useEffect(() => {
        if (isOpen) {
            setBettorId('');
            setTargetId('');
        }
    }, [isOpen]);

    const targetablePlayers = players.filter(p => p.id !== bettorId);
    const targetTips = targetId ? mask.tips[targetId] || [] : [];
    const latestTargetTip = targetTips.length > 0 ? targetTips[targetTips.length - 1] : null;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gegenwetten für ${mask.name}`}>
            <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">Aktive Gegenwetten</h3>
                {counterBets.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {counterBets.map(cb => {
                            const targetTip = mask.tips[cb.targetPlayerId]?.[cb.targetTipIndex];
                            return (
                                <div key={cb.id} className="bg-background p-2 rounded-lg flex justify-between items-center text-sm">
                                    <span>
                                        <strong style={{color: players.find(p=>p.id===cb.bettorPlayerId)?.color}}>{getPlayerName(cb.bettorPlayerId)}</strong> wettet gegen <strong style={{color: players.find(p=>p.id===cb.targetPlayerId)?.color}}>{getPlayerName(cb.targetPlayerId)}</strong>'s Tipp "{targetTip?.celebrityName || 'gelöschter Tipp'}"
                                        <span className="text-xs text-text-secondary ml-2">(in {getShowName(cb.showId)})</span>
                                    </span>
                                    <button onClick={() => onDeleteCounterBet(cb.id)} className="text-red-500 hover:text-red-400 font-bold ml-2">✕</button>
                                </div>
                            );
                        })}
                    </div>
                ) : <p className="text-text-secondary">Noch keine Gegenwetten für diese Maske platziert.</p>}
            </div>

            <div className="border-t border-border pt-4">
                <h3 className="text-lg font-bold mb-4">Neue Gegenwette platzieren</h3>
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-text-secondary mb-1">Wettender</label>
                            <select value={bettorId} onChange={e => { setBettorId(e.target.value); setTargetId(''); }} className="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent">
                                <option value="">Wettenden auswählen</option>
                                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Ziel</label>
                            <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent" disabled={!bettorId}>
                                <option value="">Ziel auswählen</option>
                                {targetablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                 </div>

                {targetId && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-text-secondary mb-2">Wette gegen den letzten Tipp des Ziels:</label>
                        <div className="space-y-2">
                             {latestTargetTip ? (() => {
                                const existingBet = counterBets.some(cb => 
                                    cb.bettorPlayerId === bettorId &&
                                    cb.targetPlayerId === targetId &&
                                    cb.maskId === mask.id
                                );
                                return (
                                    <div className="bg-background p-3 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">Tipp #{targetTips.length}: "{latestTargetTip.celebrityName}"</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-text-secondary">von {getShowName(latestTargetTip.showId)}</p>
                                                {latestTargetTip.isFinal && <span className="text-xs font-bold text-yellow-400"> (FINAL)</span>}
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            onClick={() => onAddCounterBet(bettorId, targetId)}
                                            disabled={!bettorId || mask.isRevealed || existingBet}
                                            className="py-2 px-3 text-sm"
                                        >
                                            {existingBet ? 'Wette platziert' : 'Dagegen wetten'}
                                        </Button>
                                    </div>
                                );
                             })() : <p className="text-center text-text-secondary p-4">Das Ziel hat noch keine Tipps für diese Maske.</p>}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
};


// --- Mask Card ---
const MaskCard: React.FC<{
    mask: Mask;
    players: Player[];
    shows: Show[];
    counterBets: CounterBet[];
    isTippingActive: boolean;
    onReveal: (celebrity: string, imageUrl?: string) => void;
    onSaveTip: (playerId: string, celebrityName: string, isFinal: boolean) => void;
    onDeleteLastTip: (playerId: string) => void;
    onAddCounterBet: (bettorPlayerId: string, targetPlayerId: string) => void;
    onDeleteCounterBet: (id: string) => void;
}> = ({ mask, players, shows, counterBets, isTippingActive, onReveal, onSaveTip, onDeleteLastTip, onAddCounterBet, onDeleteCounterBet }) => {
    const [isRevealModalOpen, setRevealModalOpen] = useState(false);
    const [activeTipPlayer, setActiveTipPlayer] = useState<Player | null>(null);
    const [isCounterBetModalOpen, setCounterBetModalOpen] = useState(false);

    const handlePlayerClick = (player: Player) => {
        if(isTippingActive) {
            setActiveTipPlayer(player);
        } else {
            alert("Bitte eine Show auswählen oder starten, um Tipps zu verwalten.");
        }
    }
    
    const getShowName = (showId: string | undefined) => {
        if (!showId) return 'Unbekannt';
        return shows.find(s => s.id === showId)?.name || 'Unbekannte Show';
    }

    return (
        <>
            <Card className="flex flex-col">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-grow pr-4 min-w-0">
                        <h3 className="text-2xl font-bold">{mask.name}</h3>
                        {mask.isRevealed && (
                            <div className="flex items-center gap-3 mt-2">
                                {mask.celebrityImageUrl && (
                                    <img src={mask.celebrityImageUrl} alt={mask.revealedCelebrity} className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <p className="text-lg text-yellow-400 font-semibold truncate" title={mask.revealedCelebrity}>{mask.revealedCelebrity}</p>
                                    <p className="text-sm text-text-secondary">Demaskiert in: {getShowName(mask.revealedInShowId)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {mask.imageUrl && (
                        <img src={mask.imageUrl} alt={mask.name} className="w-20 h-20 rounded-full object-cover border-2 border-border flex-shrink-0" />
                    )}
                </div>
                
                <div className="space-y-3 flex-grow">
                    {players.map(player => {
                        const playerTips = mask.tips[player.id] || [];
                        const lastTip = playerTips.length > 0 ? playerTips[playerTips.length - 1] : null;
                        
                        return (
                            <div key={player.id} onClick={() => handlePlayerClick(player)} className={`bg-background p-3 rounded-lg ${isTippingActive ? 'cursor-pointer hover:bg-background/70' : 'cursor-not-allowed opacity-70'} transition-colors`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 truncate">
                                        {player.imageUrl ? (
                                            <img src={player.imageUrl} alt={player.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <span className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }}></span>
                                        )}
                                        <span className="font-medium truncate">{player.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-text-secondary flex-shrink-0">
                                        {lastTip?.isFinal && <span className="text-xs font-bold text-yellow-400">FINAL</span>}
                                        <span className="font-semibold truncate">
                                            {lastTip ? `"${lastTip.celebrityName}"` : 'Noch kein Tipp'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                
                {!mask.isRevealed && (
                    <div className="grid grid-cols-2 gap-2 mt-6">
                        <Button onClick={() => setCounterBetModalOpen(true)} variant="secondary" className="w-full text-sm" disabled={!isTippingActive}>
                            Gegenwetten {counterBets.length > 0 ? `(${counterBets.length})` : ''}
                        </Button>
                        <Button onClick={() => setRevealModalOpen(true)} variant="success" className="w-full text-sm" disabled={!isTippingActive}>
                            Demaskieren
                        </Button>
                    </div>
                )}
            </Card>

            <RevealModal
                mask={mask}
                isOpen={isRevealModalOpen}
                onClose={() => setRevealModalOpen(false)}
                onReveal={(celebrity, imageUrl) => onReveal(celebrity, imageUrl)}
            />
            
            {activeTipPlayer && (
                 <TipModal
                    mask={mask}
                    player={activeTipPlayer}
                    shows={shows}
                    isOpen={!!activeTipPlayer}
                    onClose={() => setActiveTipPlayer(null)}
                    onSaveTip={(celebrity, isFinal) => onSaveTip(activeTipPlayer.id, celebrity, isFinal)}
                    onDeleteLastTip={() => onDeleteLastTip(activeTipPlayer.id)}
                />
            )}
            
            <CounterBetsModal
                mask={mask}
                players={players}
                shows={shows}
                counterBets={counterBets}
                isOpen={isCounterBetModalOpen}
                onClose={() => setCounterBetModalOpen(false)}
                onAddCounterBet={onAddCounterBet}
                onDeleteCounterBet={onDeleteCounterBet}
            />
        </>
    );
};

// --- Show Control ---
const ShowControl: React.FC<{
  shows: Show[];
  activeShowId: string | null;
  onAddShow: () => void;
  onSetActiveShow: (id: string) => void;
}> = ({ shows, activeShowId, onAddShow, onSetActiveShow }) => (
  <Card className="mb-8">
    <div className="flex flex-wrap items-center gap-4">
      <h2 className="text-2xl font-bold mr-4">Shows:</h2>
      {shows.map(show => (
        <button
          key={show.id}
          onClick={() => onSetActiveShow(show.id)}
          className={`px-4 py-2 font-semibold rounded-lg transition-colors ${show.id === activeShowId ? 'bg-accent text-white' : 'bg-tertiary text-text-primary hover:bg-tertiary/80'}`}
        >
          {show.name}
        </button>
      ))}
      <Button onClick={onAddShow} variant="primary" className="text-sm py-2 px-4">
        + Neue Show
      </Button>
    </div>
    {!activeShowId && shows.length > 0 && (
        <p className="text-yellow-400 mt-4 font-semibold">Bitte wähle eine Show aus, um Tipps abzugeben.</p>
    )}
  </Card>
);


// --- Game View ---
interface GameViewProps {
  season: Season;
  allPlayers: Player[];
  onBack: () => void;
  onRevealMask: (maskId: string, celebrity: string, imageUrl?: string) => void;
  onAddOrUpdateTip: (maskId: string, playerId: string, celebrityName: string, isFinal: boolean) => void;
  onDeleteLastTip: (maskId: string, playerId: string) => void;
  onAddCounterBet: (maskId: string, bettorPlayerId: string, targetPlayerId: string) => void;
  onDeleteCounterBet: (id: string) => void;
  onAddShow: () => void;
  onSetActiveShowId: (id: string) => void;
}

export const GameView: React.FC<GameViewProps> = (props) => {
  const { season, allPlayers, onBack, onRevealMask, onAddOrUpdateTip, onDeleteLastTip, onAddCounterBet, onDeleteCounterBet, onAddShow, onSetActiveShowId } = props;
  
  const seasonPlayers = allPlayers.filter(p => season.playerIds.includes(p.id));
  const scores = calculateScores(season, allPlayers);
  
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <header className="mb-10 flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary truncate">{season.seasonName}</h1>
            <Button onClick={onBack} variant="secondary">‹ Zurück zur Übersicht</Button>
        </header>

      <div className="max-w-7xl mx-auto">
        <Leaderboard scores={scores} players={seasonPlayers} />
        <ShowControl 
            shows={season.shows}
            activeShowId={season.activeShowId}
            onAddShow={onAddShow}
            onSetActiveShow={onSetActiveShowId}
        />
        
        {season.masks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {season.masks.map(mask => (
              <MaskCard
                key={mask.id}
                mask={mask}
                players={seasonPlayers}
                shows={season.shows}
                counterBets={season.counterBets.filter(cb => cb.maskId === mask.id)}
                isTippingActive={!!season.activeShowId}
                onReveal={(celebrity, imageUrl) => onRevealMask(mask.id, celebrity, imageUrl)}
                onSaveTip={(playerId, celebrity, isFinal) => onAddOrUpdateTip(mask.id, playerId, celebrity, isFinal)}
                onDeleteLastTip={(playerId) => onDeleteLastTip(mask.id, playerId)}
                onAddCounterBet={(bettor, target) => onAddCounterBet(mask.id, bettor, target)}
                onDeleteCounterBet={onDeleteCounterBet}
              />
            ))}
          </div>
        ) : (
             <Card className="text-center py-16">
                <h2 className="text-2xl font-bold mb-2">Noch keine Masken</h2>
                <p className="text-text-secondary">Gehe zu den Einstellungen, um Masken für diese Season hinzuzufügen.</p>
             </Card>
        )}
      </div>
    </div>
  );
};
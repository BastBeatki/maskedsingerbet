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
            <div key={player.playerId} className="bg-background p-3 sm:p-4 rounded-lg flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg text-white flex-shrink-0 ${rankColor}`}>
                {index + 1}
              </div>
              <div className="flex items-center gap-3 flex-grow min-w-0">
                  {playerDetails?.imageUrl 
                    ? <img src={playerDetails.imageUrl} alt={player.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"/> 
                    : <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }}></div>
                  }
                  <span className="font-bold text-lg sm:text-xl truncate">{player.name}</span>
              </div>
              <div className="hidden sm:block text-right flex-shrink-0">
                  <div className="text-xs text-text-secondary uppercase tracking-wider">Masken</div>
                  <div className="text-lg font-bold">{player.correctMasks}</div>
              </div>
              <div className="hidden sm:block text-right flex-shrink-0">
                  <div className="text-xs text-text-secondary uppercase tracking-wider">Wetten</div>
                  <div className="text-lg font-bold">{player.wonCounterBets}</div>
              </div>
              <div className="text-right flex-shrink-0 pl-1">
                  <div className="text-xs text-text-secondary uppercase tracking-wider">Punkte</div>
                  <div className="text-xl sm:text-2xl font-extrabold">{player.totalScore}</div>
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
    activeShowId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSaveTip: (celebrityName: string, isFinal: boolean) => void;
    onDeleteLastTip: () => void;
    onToggleTipFinal: (index: number) => void;
    tipPointsLookup: Record<string, number>;
}> = ({ mask, player, shows, activeShowId, isOpen, onClose, onSaveTip, onDeleteLastTip, onToggleTipFinal, tipPointsLookup }) => {
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
                {playerTips.map((tip, index) => {
                    const points = mask.isRevealed ? (tipPointsLookup[`${mask.id}-${player.id}-${index}`] || 0) : null;
                    const isCorrect = mask.isRevealed && mask.revealedCelebrity?.toLowerCase() === tip.celebrityName.toLowerCase();
                    const isEditable = !mask.isRevealed && activeShowId === tip.showId && index === playerTips.length - 1;

                    return (
                        <div key={index} className="bg-background p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <p className={`font-bold text-lg ${isCorrect ? 'text-green-400' : ''}`}>"{tip.celebrityName}"</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-text-secondary">Getippt in: {getShowName(tip.showId)}</p>
                                    {isEditable && (
                                        <button 
                                            onClick={() => onToggleTipFinal(index)}
                                            className="text-xs text-accent hover:text-white underline ml-2"
                                            title={tip.isFinal ? "Final-Status entfernen" : "Tipp nachträglich Final machen"}
                                        >
                                            {tip.isFinal ? "(Nicht mehr Final machen)" : "(Zu Final ändern)"}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {tip.isFinal && (
                                    <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 border border-yellow-600 px-2 py-1 rounded-full">
                                        FINAL
                                    </span>
                                )}
                                {mask.isRevealed && (
                                    <span className={`px-2 py-1 rounded font-bold text-sm ${points && points > 0 ? 'bg-green-600/30 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                        {points && points > 0 ? `+${points}` : '0'} Pkt.
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
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
    counterBetPointsLookup: Record<string, { bettor: number; target: number }>;
}> = ({ mask, players, shows, counterBets, isOpen, onClose, onAddCounterBet, onDeleteCounterBet, counterBetPointsLookup }) => {
    const [bettorId, setBettorId] = useState('');
    const [targetId, setTargetId] = useState('');
    
    const { isRevealed, revealedCelebrity } = mask;

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
        <Modal isOpen={isOpen} onClose={onClose} title={`${isRevealed ? 'Gegenwetten-Ergebnis' : 'Gegenwetten'} für ${mask.name}`}>
            <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">{isRevealed ? 'Abgeschlossene' : 'Aktive'} Gegenwetten</h3>
                {counterBets.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {counterBets.map(cb => {
                            const targetTip = mask.tips[cb.targetPlayerId]?.[cb.targetTipIndex];
                            
                            let result: 'win' | 'loss' | null = null;
                            const pointsObj = isRevealed ? counterBetPointsLookup[cb.id] : undefined;
                            const bettorPoints = pointsObj?.bettor;
                            const targetPoints = pointsObj?.target;
                            
                            if (isRevealed && revealedCelebrity && targetTip) {
                                const isTargetTipCorrect = targetTip.celebrityName.trim().toLowerCase() === revealedCelebrity.trim().toLowerCase();
                                result = isTargetTipCorrect ? 'loss' : 'win';
                            }
                            
                            return (
                                <div key={cb.id} className="bg-background p-2 rounded-lg flex justify-between items-center text-sm gap-2">
                                    <span className="flex-grow">
                                        <strong style={{color: players.find(p=>p.id===cb.bettorPlayerId)?.color}}>{getPlayerName(cb.bettorPlayerId)}</strong> wettete gegen <strong style={{color: players.find(p=>p.id===cb.targetPlayerId)?.color}}>{getPlayerName(cb.targetPlayerId)}</strong>'s Tipp "{targetTip?.celebrityName || 'gelöschter Tipp'}"
                                        <span className="text-xs text-text-secondary ml-2">(in {getShowName(cb.showId)})</span>
                                    </span>
                                    {isRevealed ? (
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex gap-2">
                                                 {/* Bettor Badge */}
                                                {bettorPoints !== undefined && (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${bettorPoints >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {bettorPoints > 0 ? '+' : ''}{bettorPoints}
                                                    </span>
                                                )}
                                                {/* Target Badge (Only show if target lost/gained points) */}
                                                {targetPoints !== undefined && targetPoints !== 0 && (
                                                     <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">
                                                        Ziel: {targetPoints > 0 ? '+' : ''}{targetPoints}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                                                {result === 'win' ? 'Gewonnen' : 'Verloren'}
                                            </span>
                                        </div>
                                    ) : (
                                        <button onClick={() => onDeleteCounterBet(cb.id)} className="text-red-500 hover:text-red-400 font-bold ml-2 flex-shrink-0">✕</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : <p className="text-text-secondary">Noch keine Gegenwetten für diese Maske platziert.</p>}
            </div>

            {!isRevealed && (
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
            )}
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
    activeShowId: string | null;
    onReveal: (celebrity: string, imageUrl?: string) => void;
    onSaveTip: (playerId: string, celebrityName: string, isFinal: boolean) => void;
    onDeleteLastTip: (playerId: string) => void;
    onToggleTipFinal: (playerId: string, tipIndex: number) => void;
    onAddCounterBet: (bettorPlayerId: string, targetPlayerId: string) => void;
    onDeleteCounterBet: (id: string) => void;
    tipPointsLookup: Record<string, number>;
    counterBetPointsLookup: Record<string, { bettor: number; target: number }>;
    playerMaskPointsLookup: Record<string, number>;
}> = ({ mask, players, shows, counterBets, isTippingActive, activeShowId, onReveal, onSaveTip, onDeleteLastTip, onToggleTipFinal, onAddCounterBet, onDeleteCounterBet, tipPointsLookup, counterBetPointsLookup, playerMaskPointsLookup }) => {
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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex-grow pr-4 min-w-0">
                        <h3 className="text-2xl font-bold truncate">{mask.name}</h3>
                    </div>
                    {mask.imageUrl && (
                        <img src={mask.imageUrl} alt={mask.name} className="w-20 h-20 rounded-full object-cover border-2 border-border flex-shrink-0" />
                    )}
                </div>

                {mask.isRevealed && (
                    <div className="bg-background rounded-lg p-4 border border-yellow-500/50 mb-4">
                        <div className="flex items-center gap-4">
                            {mask.celebrityImageUrl && (
                                <img 
                                    src={mask.celebrityImageUrl} 
                                    alt={mask.revealedCelebrity} 
                                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400 flex-shrink-0" 
                                />
                            )}
                            <div className="min-w-0">
                                <p className="text-xs text-yellow-300 font-semibold tracking-wider uppercase">Demaskiert</p>
                                <p className="text-xl text-yellow-400 font-bold break-words" title={mask.revealedCelebrity}>
                                    {mask.revealedCelebrity}
                                </p>
                                <p className="text-sm text-text-secondary">
                                    in: {getShowName(mask.revealedInShowId)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="space-y-3 flex-grow">
                    {players.map(player => {
                        const playerTips = mask.tips[player.id] || [];
                        
                        const hasCorrectGuess = mask.isRevealed && mask.revealedCelebrity && 
                            playerTips.some(tip => tip.celebrityName.trim().toLowerCase() === mask.revealedCelebrity!.trim().toLowerCase());

                        const playerMaskPoints = mask.isRevealed ? playerMaskPointsLookup[`${mask.id}-${player.id}`] : null;

                        const playerRowClasses = [
                            'bg-background p-3 rounded-lg transition-all duration-300',
                            (isTippingActive && !mask.isRevealed) ? 'cursor-pointer hover:bg-tertiary/50' : 'cursor-default',
                            hasCorrectGuess ? 'bg-green-900/30 ring-1 ring-green-500' : ''
                        ].filter(Boolean).join(' ');

                        return (
                            <div key={player.id} onClick={() => handlePlayerClick(player)} className={playerRowClasses}>
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
                                        {playerMaskPoints !== null && playerMaskPoints !== undefined && (
                                            <span className={`font-bold px-2 py-0.5 rounded text-xs ${playerMaskPoints > 0 ? 'bg-green-600 text-white' : playerMaskPoints < 0 ? 'bg-red-600 text-white' : 'bg-tertiary text-gray-300'}`}>
                                                {playerMaskPoints > 0 ? '+' : ''}{playerMaskPoints}
                                            </span>
                                        )}
                                        {hasCorrectGuess && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                   <div className="text-sm text-text-secondary">
                        {counterBets.filter(cb => cb.maskId === mask.id).length} Gegenwetten
                   </div>
                   <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setCounterBetModalOpen(true)} className="text-sm py-2 px-3">
                             Gegenwetten
                        </Button>
                        {!mask.isRevealed && (
                            <Button variant="primary" onClick={() => setRevealModalOpen(true)} className="text-sm py-2 px-3">
                                Demaskieren
                            </Button>
                        )}
                   </div>
                </div>
            </Card>

            {activeTipPlayer && (
                <TipModal
                    mask={mask}
                    player={activeTipPlayer}
                    shows={shows}
                    activeShowId={activeShowId}
                    isOpen={!!activeTipPlayer}
                    onClose={() => setActiveTipPlayer(null)}
                    onSaveTip={(celebrity, isFinal) => onSaveTip(activeTipPlayer.id, celebrity, isFinal)}
                    onDeleteLastTip={() => onDeleteLastTip(activeTipPlayer.id)}
                    onToggleTipFinal={(index) => onToggleTipFinal(activeTipPlayer.id, index)}
                    tipPointsLookup={tipPointsLookup}
                />
            )}

            <CounterBetsModal
                mask={mask}
                players={players}
                shows={shows}
                counterBets={counterBets.filter(cb => cb.maskId === mask.id)}
                isOpen={isCounterBetModalOpen}
                onClose={() => setCounterBetModalOpen(false)}
                onAddCounterBet={onAddCounterBet}
                onDeleteCounterBet={onDeleteCounterBet}
                counterBetPointsLookup={counterBetPointsLookup}
            />

            <RevealModal 
                mask={mask}
                isOpen={isRevealModalOpen}
                onClose={() => setRevealModalOpen(false)}
                onReveal={onReveal}
            />
        </>
    );
};

// --- Main GameView ---
interface GameViewProps {
  season: Season;
  allPlayers: Player[];
  onBack: () => void;
  onRevealMask: (maskId: string, celebrity: string, imageUrl?: string) => void;
  onAddOrUpdateTip: (maskId: string, playerId: string, celebrity: string, isFinal: boolean) => void;
  onDeleteLastTip: (maskId: string, playerId: string) => void;
  onToggleTipFinal: (seasonId: string, maskId: string, playerId: string, tipIndex: number) => void;
  onAddCounterBet: (maskId: string, bettorPlayerId: string, targetPlayerId: string) => void;
  onDeleteCounterBet: (id: string) => void;
  onAddShow: () => void;
  onSetActiveShowId: (id: string) => void;
}

export const GameView: React.FC<GameViewProps> = (props) => {
  const { season, allPlayers, onBack, onRevealMask, onAddOrUpdateTip, onDeleteLastTip, onToggleTipFinal, onAddCounterBet, onDeleteCounterBet, onAddShow, onSetActiveShowId } = props;
  
  // Calculate scores on render. In a larger app, useMemo here.
  const { scores, tipPoints, counterBetPoints, playerMaskPoints } = calculateScores(season, allPlayers);
  const activeShow = season.shows.find(s => s.id === season.activeShowId);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Button onClick={onBack} variant="secondary" className="mb-2">‹ Zurück zur Übersicht</Button>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                        {season.seasonName}
                    </h1>
                </div>
                
                <Card className="flex flex-col gap-2 min-w-[300px]">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-text-secondary font-bold">Aktuelle Show:</span>
                        {activeShow ? <span className="text-accent font-bold">{activeShow.name}</span> : <span className="text-red-400">Keine Show aktiv</span>}
                     </div>
                     <select 
                        value={season.activeShowId || ''} 
                        onChange={(e) => onSetActiveShowId(e.target.value)}
                        className="bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                     >
                        <option value="" disabled>Show auswählen...</option>
                        {season.shows.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                     <Button onClick={onAddShow} className="w-full text-sm py-2">Neue Show starten</Button>
                </Card>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 items-start">
                {/* Left Column: Leaderboard - Fixed width on Desktop/Large Tablet */}
                <div className="w-full lg:w-[400px] xl:w-[420px] flex-shrink-0">
                    <Leaderboard scores={scores} players={allPlayers} />
                </div>

                {/* Right Column: Masks Grid - Takes remaining space */}
                <div className="flex-1 w-full min-w-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-3xl font-bold">Masken</h2>
                    </div>
                    {season.masks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {season.masks.map(mask => (
                                <MaskCard
                                    key={mask.id}
                                    mask={mask}
                                    players={allPlayers.filter(p => season.playerIds.includes(p.id))}
                                    shows={season.shows}
                                    counterBets={season.counterBets}
                                    isTippingActive={!!season.activeShowId}
                                    activeShowId={season.activeShowId}
                                    onReveal={(celebrity, imageUrl) => onRevealMask(mask.id, celebrity, imageUrl)}
                                    onSaveTip={(playerId, celebrity, isFinal) => onAddOrUpdateTip(mask.id, playerId, celebrity, isFinal)}
                                    onDeleteLastTip={(playerId) => onDeleteLastTip(mask.id, playerId)}
                                    onToggleTipFinal={(playerId, index) => onToggleTipFinal(season.id, mask.id, playerId, index)}
                                    onAddCounterBet={(bettor, target) => onAddCounterBet(mask.id, bettor, target)}
                                    onDeleteCounterBet={onDeleteCounterBet}
                                    tipPointsLookup={tipPoints}
                                    counterBetPointsLookup={counterBetPoints}
                                    playerMaskPointsLookup={playerMaskPoints}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-text-secondary">Noch keine Masken angelegt. Gehe zu den Einstellungen.</p>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
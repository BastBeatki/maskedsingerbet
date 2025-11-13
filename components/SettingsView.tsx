import React, { useState, useEffect } from 'react';
import { Player, Mask, Season, Show } from '../types';
import { Button, Card, Input, Modal } from './common/UI';
import { fileToBase64 } from '../utils';
import { PLAYER_COLORS } from '../constants';

interface SettingsViewProps {
  season: Season | null;
  allPlayers: Player[];
  onUpdateSeason: (name: string, imageUrl?: string) => void;
  onAddPlayer: (name: string) => void;
  onUpdatePlayer: (id: string, name:string, color: string, imageUrl?: string) => void;
  onDeletePlayer: (id: string) => void;
  onAddPlayerToSeason: (playerId: string) => void;
  onRemovePlayerFromSeason: (playerId: string) => void;
  onAddMask: (name: string, imageUrl?: string) => void;
  onUpdateMask: (id: string, name: string, imageUrl?: string) => void;
  onDeleteMask: (id: string) => void;
  onDeleteShow: (id: string) => void;
  onBack: () => void;
}

const SettingsHeader: React.FC<{onBack: () => void; title: string}> = ({ onBack, title }) => (
    <div className="mb-10 flex justify-between items-center">
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-2">‹ Zurück zur Übersicht</Button>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary truncate">{title}</h1>
        </div>
    </div>
);

// --- Edit Mask Modal ---
const EditMaskModal: React.FC<{
    mask: Mask | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, name: string, imageUrl?: string) => void;
}> = ({ mask, isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | undefined>('');

    useEffect(() => {
        if (mask) {
            setName(mask.name);
            setImagePreview(mask.imageUrl);
            setNewImageFile(null);
        }
    }, [mask]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mask || !name.trim()) return;
        let finalImageUrl = mask.imageUrl;
        if (newImageFile) finalImageUrl = await fileToBase64(newImageFile);
        onSave(mask.id, name.trim(), finalImageUrl);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${mask?.name}`}>
            <form onSubmit={handleSave} className="space-y-4">
                <Input label="Mask Name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Mask Image</label>
                    {imagePreview && <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover mb-2" />}
                    <Input type="file" accept="image/*" onChange={handleImageChange} />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
};

// --- Edit Player Modal ---
const EditPlayerModal: React.FC<{
    player: Player | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, name: string, color: string, imageUrl?: string) => void;
}> = ({ player, isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | undefined>('');

    useEffect(() => {
        if (player) {
            setName(player.name);
            setColor(player.color);
            setImagePreview(player.imageUrl);
            setNewImageFile(null);
        }
    }, [player]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!player || !name.trim() || !color) return;
        let finalImageUrl = player.imageUrl;
        if (newImageFile) finalImageUrl = await fileToBase64(newImageFile);
        onSave(player.id, name.trim(), color, finalImageUrl);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${player?.name}`}>
            <form onSubmit={handleSave} className="space-y-4">
                 <Input label="Player Name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                 <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Player Image</label>
                    {imagePreview && <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover mb-2" />}
                    <Input type="file" accept="image/*" onChange={handleImageChange} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Player Color</label>
                    <div className="flex flex-wrap gap-2 p-2 bg-background rounded-lg">
                        {PLAYER_COLORS.map(c => (
                            <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-white' : ''}`} style={{backgroundColor: c}}></button>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
};


export const SettingsView: React.FC<SettingsViewProps> = (props) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newMaskName, setNewMaskName] = useState('');
  const [newMaskImage, setNewMaskImage] = useState<File | null>(null);
  const [editingMask, setEditingMask] = useState<Mask | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerToAdd, setPlayerToAdd] = useState('');

  // State for editing season details
  const [seasonName, setSeasonName] = useState('');
  const [newSeasonImageFile, setNewSeasonImageFile] = useState<File | null>(null);
  const [seasonImagePreview, setSeasonImagePreview] = useState<string | undefined>('');

  useEffect(() => {
      if (props.season) {
          setSeasonName(props.season.seasonName);
          setSeasonImagePreview(props.season.imageUrl);
          setNewSeasonImageFile(null); // Reset file input when season changes
      }
  }, [props.season]);

  const handleSeasonImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setNewSeasonImageFile(file);
          setSeasonImagePreview(URL.createObjectURL(file));
      }
  };

  const handleSaveSeasonDetails = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!props.season || !seasonName.trim()) return;
      let finalImageUrl = props.season.imageUrl;
      if (newSeasonImageFile) {
          finalImageUrl = await fileToBase64(newSeasonImageFile);
      }
      props.onUpdateSeason(seasonName.trim(), finalImageUrl);
      alert('Season details updated!');
  };
  
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    props.onAddPlayer(newPlayerName);
    setNewPlayerName('');
  };

  const handleAddMask = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl: string | undefined;
    if (newMaskImage) imageUrl = await fileToBase64(newMaskImage);
    props.onAddMask(newMaskName, imageUrl);
    setNewMaskName('');
    setNewMaskImage(null);
    const fileInput = e.target as HTMLFormElement;
    fileInput.reset();
  };
  
  const handleAddPlayerToSeason = (e: React.FormEvent) => {
      e.preventDefault();
      if(playerToAdd) {
          props.onAddPlayerToSeason(playerToAdd);
          setPlayerToAdd('');
      }
  }

  // --- Master Data View (Global Players) ---
  if (!props.season) {
    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <SettingsHeader onBack={props.onBack} title="Stammdaten-Verwaltung" />
                <Card>
                    <h2 className="text-2xl font-bold mb-4">Alle Spieler</h2>
                    <form onSubmit={handleAddPlayer} className="flex gap-4 mb-6">
                        <Input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Neuer Spieler" required />
                        <Button type="submit">Hinzufügen</Button>
                    </form>
                    <div className="space-y-3">
                        {props.allPlayers.map(player => (
                            <div key={player.id} className="bg-background p-3 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {player.imageUrl ? <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover"/> : <span className="w-10 h-10 rounded-full" style={{ backgroundColor: player.color }}></span>}
                                    <span className="font-medium text-lg">{player.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setEditingPlayer(player)} className="text-accent hover:text-accent/80">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                    </button>
                                    <button onClick={() => props.onDeletePlayer(player.id)} className="text-red-500 hover:text-red-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            <EditPlayerModal player={editingPlayer} isOpen={!!editingPlayer} onClose={() => setEditingPlayer(null)} onSave={props.onUpdatePlayer} />
        </div>
    );
  }

  // --- Season Specific Settings View ---
  const seasonPlayers = props.allPlayers.filter(p => props.season.playerIds.includes(p.id));
  const availablePlayers = props.allPlayers.filter(p => !props.season.playerIds.includes(p.id));

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
            <SettingsHeader onBack={props.onBack} title={`Einstellungen: ${props.season.seasonName}`}/>
            <div className="space-y-8">
                <Card>
                    <form onSubmit={handleSaveSeasonDetails} className="space-y-4">
                        <h2 className="text-2xl font-bold mb-2">Season Details</h2>
                        <Input
                            label="Season Name"
                            type="text"
                            value={seasonName}
                            onChange={(e) => setSeasonName(e.target.value)}
                            required
                        />
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Season Image</label>
                            {seasonImagePreview && <img src={seasonImagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />}
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleSeasonImageChange}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit">Save Season Details</Button>
                        </div>
                    </form>
                </Card>

                <Card>
                    <h2 className="text-2xl font-bold mb-4">Spieler in dieser Season</h2>
                    <form onSubmit={handleAddPlayerToSeason} className="flex gap-4 mb-6">
                        <select
                          value={playerToAdd}
                          onChange={(e) => setPlayerToAdd(e.target.value)}
                          className="w-full bg-background border-2 border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                          disabled={availablePlayers.length === 0}
                        >
                          <option value="">{availablePlayers.length > 0 ? 'Spieler auswählen...' : 'Keine weiteren Spieler verfügbar'}</option>
                          {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <Button type="submit" disabled={!playerToAdd}>Hinzufügen</Button>
                    </form>
                    <div className="space-y-3">
                        {seasonPlayers.map(player => (
                            <div key={player.id} className="bg-background p-3 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {player.imageUrl ? <img src={player.imageUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover"/> : <span className="w-10 h-10 rounded-full" style={{ backgroundColor: player.color }}></span>}
                                    <span className="font-medium text-lg">{player.name}</span>
                                </div>
                                <button onClick={() => props.onRemovePlayerFromSeason(player.id)} className="text-red-500 hover:text-red-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                         {seasonPlayers.length === 0 && <p className="text-text-secondary">Noch keine Spieler zu dieser Season hinzugefügt.</p>}
                    </div>
                </Card>

                <Card>
                    <h2 className="text-2xl font-bold mb-4">Masken</h2>
                    <form onSubmit={handleAddMask} className="space-y-4 mb-6 p-4 bg-background rounded-lg">
                        <Input type="text" value={newMaskName} onChange={(e) => setNewMaskName(e.target.value)} placeholder="Neue Maske" required />
                        <Input type="file" accept="image/*" onChange={(e) => setNewMaskImage(e.target.files?.[0] || null)} />
                        <Button type="submit" className="w-full">Hinzufügen</Button>
                    </form>
                    <div className="space-y-3">
                        {props.season.masks.map(mask => (
                            <div key={mask.id} className="bg-background p-3 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                {mask.imageUrl && <img src={mask.imageUrl} alt={mask.name} className="w-10 h-10 rounded-full object-cover"/>}
                                    <span className="font-medium text-lg">{mask.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setEditingMask(mask)} className="text-accent hover:text-accent/80">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                    </button>
                                    <button onClick={() => props.onDeleteMask(mask.id)} className="text-red-500 hover:text-red-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <h2 className="text-2xl font-bold mb-4">Manage Shows</h2>
                    <div className="flex flex-wrap gap-3">
                        {props.season.shows.map(show => (
                            <div key={show.id} className="flex items-center bg-background rounded-full pl-4 pr-2 py-1 text-sm">
                                <span>{show.name}</span>
                                <button onClick={() => props.onDeleteShow(show.id)} className="text-red-400 hover:text-red-300 ml-2 p-1 rounded-full hover:bg-red-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                        {props.season.shows.length === 0 && <p className="text-text-secondary">No shows created yet.</p>}
                    </div>
                </Card>
            </div>
        </div>
        <EditMaskModal mask={editingMask} isOpen={!!editingMask} onClose={() => setEditingMask(null)} onSave={props.onUpdateMask} />
        <EditPlayerModal player={editingPlayer} isOpen={!!editingPlayer} onClose={() => setEditingPlayer(null)} onSave={props.onUpdatePlayer} />
    </div>
  );
};
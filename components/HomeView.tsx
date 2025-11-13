import React, { useState, useEffect } from 'react';
import { AppState, Season } from '../types';
import { Button, Card, Input, Modal } from './common/UI';
// Fix: Corrected typo in import from 'fileToBase66' to 'fileToBase64'.
import { downloadJson, readFileAsText, fileToBase64 } from '../utils';

// --- Edit Season Modal ---
const EditSeasonModal: React.FC<{
    season: Season | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, name: string, imageUrl?: string) => void;
}> = ({ season, isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | undefined>('');

    useEffect(() => {
        if (season) {
            setName(season.seasonName);
            setImagePreview(season.imageUrl);
            setNewImageFile(null);
        }
    }, [season]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!season || !name.trim()) return;

        let finalImageUrl = season.imageUrl;
        if (newImageFile) {
            finalImageUrl = await fileToBase64(newImageFile);
        }

        onSave(season.id, name.trim(), finalImageUrl);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={season ? `Edit ${season.seasonName}` : 'Edit Season'}>
            <form onSubmit={handleSave} className="space-y-4">
                <Input
                    label="Season Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                 <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Season Image</label>
                    {imagePreview && <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />}
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
};


interface HomeViewProps {
  appState: AppState;
  onNavigate: (view: 'game' | 'settings' | 'rules', seasonId?: string) => void;
  onImport: (state: AppState) => void;
  onReset: () => void;
  onAddSeason: (name: string) => void;
  onUpdateSeason: (id: string, name: string, imageUrl?: string) => void;
  onDeleteSeason: (id: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = (props) => {
  const { appState, onNavigate, onImport, onReset, onAddSeason, onUpdateSeason, onDeleteSeason } = props;
  const [newSeasonName, setNewSeasonName] = useState('');
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  const handleExport = () => {
    downloadJson(appState, `masked-singer-tipper_ALL-DATA_${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const inputElement = event.target;
    if (!file) return;
    try {
      const fileContent = await readFileAsText(file);
      const importedState = JSON.parse(fileContent);
      onImport(importedState);
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import file. It may be corrupted or not valid JSON.");
    } finally {
      if (inputElement) inputElement.value = '';
    }
  };

  const handleAddSeason = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSeason(newSeasonName);
    setNewSeasonName('');
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <header className="w-full max-w-7xl mx-auto mb-10 text-center">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-3">
                The Masked Singer Tipper
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary">Willkommen! Wähle eine Season oder starte eine neue.</p>
        </header>

        <main className="w-full max-w-7xl mx-auto flex flex-col gap-12">
            
            {/* Top Management Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card>
                    <h3 className="text-xl font-bold mb-4">Neue Season starten</h3>
                    <form onSubmit={handleAddSeason} className="flex flex-col sm:flex-row gap-4">
                        <Input
                            type="text"
                            value={newSeasonName}
                            onChange={(e) => setNewSeasonName(e.target.value)}
                            placeholder="Season Name"
                            className="flex-grow"
                            required
                        />
                        <Button type="submit" className="w-full sm:w-auto">Erstellen</Button>
                    </form>
                </Card>

                <Card>
                    <h3 className="text-xl font-bold mb-4">Verwaltung & Daten</h3>
                     <div className="grid grid-cols-2 gap-3">
                        <Button onClick={() => onNavigate('settings')} variant="secondary">Stammdaten</Button>
                        <Button onClick={() => onNavigate('rules')} variant="secondary">Spielregeln</Button>
                        <Button onClick={handleExport} variant="secondary" className="flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            Export
                        </Button>
                        <label htmlFor="import-file-input" className="bg-tertiary hover:bg-tertiary/80 border border-border px-4 py-2.5 font-bold rounded-lg transition-all duration-300 text-white flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            Import
                        </label>
                        <input id="import-file-input" type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                    </div>
                </Card>
            </section>

            {/* Seasons List */}
            <section>
                <h2 className="text-3xl font-bold mb-6">Deine Seasons</h2>
                {appState.seasons.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {appState.seasons.map(season => (
                            <div key={season.id} className="group relative rounded-xl overflow-hidden cursor-pointer h-48" onClick={() => onNavigate('game', season.id)}>
                                <img 
                                    src={season.imageUrl || 'https://images.unsplash.com/photo-1570641963303-34829dd79813?q=80&w=2070&auto=format&fit=crop'} 
                                    alt={season.seasonName} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
                                    <h3 className="text-xl font-bold text-white truncate">{season.seasonName}</h3>
                                    <p className="text-white/80 text-sm">{season.playerIds.length} Players, {season.masks.length} Masks</p>
                                </div>
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingSeason(season); }} className="bg-surface/80 p-2 rounded-full text-text-primary hover:bg-surface" title="Bearbeiten"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.402 2.622a2.496 2.496 0 00-3.528 0L2.622 13.874a2.496 2.496 0 00-.64 1.48V17.5a.5.5 0 00.5.5h2.146a2.496 2.496 0 001.48-.64l11.252-11.252a2.496 2.496 0 000-3.528zM4.44 15.864L13.25 7.05l1.697 1.697-8.81 8.81H4.44v-1.697z" /></svg></button>
                                    <button onClick={(e) => { e.stopPropagation(); onNavigate('settings', season.id); }} className="bg-surface/80 p-2 rounded-full text-text-primary hover:bg-surface" title="Einstellungen"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-1.57 1.996A1.532 1.532 0 013 7.482c-1.56.38-1.56 2.6 0 2.98a1.532 1.532 0 01.948 2.286c-.836 1.372.734 2.942 1.996 1.57A1.532 1.532 0 017.482 17c.38 1.56 2.6 1.56 2.98 0a1.532 1.532 0 012.286-.948c1.372.836 2.942-.734 1.57-1.996A1.532 1.532 0 0117 12.518c1.56-.38 1.56-2.6 0-2.98a1.532 1.532 0 01-.948-2.286c.836-1.372-.734-2.942-1.996-1.57A1.532 1.532 0 0112.518 3c-1.56-.38-2.6-1.56-2.98-2.83zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd" /><path d="M10 7a3 3 0 100 6 3 3 0 000-6z" /></svg></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-16 border-2 border-dashed border-border bg-surface/50">
                        <h3 className="text-2xl font-bold mb-2">Keine Seasons gefunden</h3>
                        <p className="text-text-secondary">Starte deine erste Season über das Formular oben.</p>
                    </Card>
                )}
            </section>
        </main>
      
      <EditSeasonModal
        season={editingSeason}
        isOpen={!!editingSeason}
        onClose={() => setEditingSeason(null)}
        onSave={(id, name, img) => {
            onUpdateSeason(id, name, img);
            const updatedSeason = appState.seasons.find(s => s.id === id);
            if (updatedSeason) {
                setEditingSeason({ ...updatedSeason, seasonName: name, imageUrl: img });
            }
        }}
      />
    </div>
  );
};
import React, { useState } from 'react';
import { AppState, Season } from '../types';
import { Button, Card, Input, Modal } from './common/UI';
import { downloadJson, readFileAsText } from '../utils';
import './HomeManagement.css';

interface HomeViewProps {
  appState: AppState;
  onPromiCheck: () => void;
  onNavigate: (view: 'game' | 'settings' | 'rules', seasonId?: string) => void;
  onImport: (state: AppState) => void;
  onReset: () => void;
  onAddSeason: (name: string) => void;
  onDeleteSeason: (id: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = (props) => {
  const { appState, onNavigate, onImport, onReset, onAddSeason, onDeleteSeason } = props;
  const [newSeasonName, setNewSeasonName] = useState('');
  
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

                <Card className="home-management">
                    <h3 id="home-management-heading" className="text-xl font-bold mb-4">Verwaltung & Daten</h3>
                    <div className="home-management__navigation">
                        <button type="button" onClick={props.onPromiCheck} className="home-management__nav home-management__catalog">Promi-Check · Katalog</button>
                        <button type="button" onClick={() => onNavigate('settings')} className="home-management__nav">Stammdaten</button>
                        <button type="button" onClick={() => onNavigate('rules')} className="home-management__nav">Spielregeln</button>
                    </div>
                    <div className="home-management__transfers" role="group" aria-label="Spieledaten übertragen">
                        <div className="home-management__import">
                            <input id="import-file-input" type="file" accept=".json" onChange={handleFileChange} className="home-management__file" aria-label="Import – Spieledaten einlesen" />
                            <label htmlFor="import-file-input" className="home-management__transfer home-management__transfer--import">
                                <img src="/ui/import-mask.webp" width="420" height="237" alt="" draggable={false} className="home-management__art" />
                                <span className="home-management__copy"><span className="home-management__title">IMPORT</span><span className="home-management__subtitle">Spieledaten einlesen</span></span>
                            </label>
                        </div>
                        <button type="button" onClick={handleExport} className="home-management__transfer home-management__transfer--export" aria-label="Export – Spieledaten sichern">
                            <img src="/ui/export-mask.webp" width="390" height="210" alt="" draggable={false} className="home-management__art" />
                            <span className="home-management__copy"><span className="home-management__title">EXPORT</span><span className="home-management__subtitle">Spieledaten sichern</span></span>
                        </button>
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
    </div>
  );
};

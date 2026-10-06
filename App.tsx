import React, { useState } from 'react';
import { useAppManager } from './hooks/useGameState';
import { HomeView } from './components/HomeView';
import { SettingsView } from './components/SettingsView';
import { GameView } from './components/GameView';
import { PromiCheckView } from './components/PromiCheckView';
import { RulesView } from './components/RulesView';

type View = 'home' | 'game' | 'settings' | 'rules' | 'promi';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  const {
    isLoading,
    storageReady,
    storageError,
    retrySave,
    appState,
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
    setRuleset,
    startOpportunity,
    createTournamentCopy,
    setPriorChanceCount,
    addOrUpdateTip,
    deleteLastTip,
    toggleTipFinal,
    addCounterBet,
    deleteCounterBet,
    addShow,
    deleteShow,
    setActiveShowId,
    importState,
    resetGame
  } = useAppManager();

  const handleNavigate = (view: View, seasonId?: string) => {
    setActiveSeasonId(seasonId || null);
    setCurrentView(view);
  };
  
  const handleBackToHome = () => {
      setActiveSeasonId(null);
      setCurrentView('home');
  };

  if (isLoading) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
            <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h2 className="text-2xl font-bold text-text-primary">Loading Game Data...</h2>
            </div>
        </div>
    );
  }

  if (!storageReady) {
    return <main className="min-h-screen bg-background text-text-primary p-6">
      <h1 className="text-2xl font-bold mb-4">Spielstand konnte nicht sicher geladen werden</h1>
      <p role="alert" className="mb-4">{storageError}</p>
      <p className="mb-4">Speicherung ist gesperrt. Vorhandene Daten bleiben erhalten. Kein Zurücksetzen und keine Browserdaten löschen.</p>
      <button className="bg-primary rounded-lg p-3" onClick={() => window.location.reload()}>Erneut laden</button>
    </main>;
  }

  const activeSeason = activeSeasonId ? appState.seasons.find(s => s.id === activeSeasonId) : null;

  const renderView = () => {
    switch (currentView) {
      case 'game':
        if (activeSeason) {
            return (
              <GameView
                season={activeSeason}
                allPlayers={appState.players}
                onBack={handleBackToHome}
                onRevealMask={(maskId, celebrity, imageUrl) => revealMask(activeSeasonId!, maskId, celebrity, imageUrl)}
                onAddOrUpdateTip={(maskId, playerId, celebrity, isFinal) => addOrUpdateTip(activeSeasonId!, maskId, playerId, celebrity, isFinal)}
                onToggleTipFinal={toggleTipFinal}
                onDeleteLastTip={(maskId, playerId) => deleteLastTip(activeSeasonId!, maskId, playerId)}
                onAddCounterBet={(maskId, bettor, target) => addCounterBet(activeSeasonId!, maskId, bettor, target)}
                onDeleteCounterBet={(id) => deleteCounterBet(activeSeasonId!, id)}
                onAddShow={() => addShow(activeSeasonId!)}
                onSetActiveShowId={(id) => setActiveShowId(activeSeasonId!, id)}
                onStartOpportunity={(maskId) => startOpportunity(activeSeasonId!, maskId)}
                onSetPriorChances={(maskId, count) => setPriorChanceCount(activeSeasonId!, maskId, count)}
              />
            );
        }
        break;
      case 'settings':
        return (
          <SettingsView
            season={activeSeason}
            allPlayers={appState.players}
            onBack={handleBackToHome}
            // Global player funcs
            onAddPlayer={addPlayer}
            onUpdatePlayer={updatePlayer}
            onDeletePlayer={deletePlayer}
            // Season-specific funcs
            onUpdateSeason={(name, img) => activeSeasonId && updateSeason(activeSeasonId, name, img)}
            onAddPlayerToSeason={(playerId) => activeSeasonId && addPlayerToSeason(activeSeasonId, playerId)}
            onRemovePlayerFromSeason={(playerId) => activeSeasonId && removePlayerFromSeason(activeSeasonId, playerId)}
            onAddMask={(name, img) => activeSeasonId && addMask(activeSeasonId, name, img)}
            onUpdateMask={(id, name, img) => activeSeasonId && updateMask(activeSeasonId, id, name, img)}
            onDeleteMask={(id) => activeSeasonId && deleteMask(activeSeasonId, id)}
            onDeleteShow={(id) => activeSeasonId && deleteShow(activeSeasonId, id)}
            onSetRuleset={(version) => activeSeasonId && setRuleset(activeSeasonId, version)}
            onCreateTournamentCopy={() => activeSeasonId && createTournamentCopy(activeSeasonId)}
          />
        );
       case 'rules':
        return <RulesView onBack={handleBackToHome} />;
      case 'promi':
        return <PromiCheckView onBack={handleBackToHome} seasons={appState.seasons} />;
      case 'home':
      default:
        return (
            <HomeView
              onPromiCheck={() => handleNavigate('promi')}
              appState={appState}
              onNavigate={handleNavigate}
              onImport={importState}
              onReset={resetGame}
              onAddSeason={addSeason}
              onDeleteSeason={deleteSeason}
            />
          );
    }
     // Fallback to home if view is inconsistent with active season
     handleBackToHome();
     return null;
  };

  return <div className="bg-background text-text-primary">
    {storageError && <div role="alert" className="bg-red-950 text-white p-4">
      <p>{storageError}</p><p>Bei Speicherfehlern: Export sichern, bevor du die App schließt.</p>
      <button className="underline mt-2" onClick={retrySave}>Speicherung erneut versuchen</button>
    </div>}
    {renderView()}
  </div>;
};

export default App;

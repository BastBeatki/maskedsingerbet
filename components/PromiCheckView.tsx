import React from 'react';
import { Button } from './common/UI';
import { CatalogBrowser } from './CatalogBrowser';
import type { Season } from '../types';
export { CatalogImage } from './CatalogBrowser';
export const PromiCheckView: React.FC<{ onBack: () => void; seasons?: readonly Season[] }> = ({ onBack, seasons = [] }) => <main className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
  <header className="mb-6"><Button onClick={onBack} variant="secondary">Zurück zur Startseite</Button>
    <h1 className="text-3xl sm:text-4xl font-bold mt-5 mb-2">Promi-Check</h1>
  </header>
  <CatalogBrowser seasons={seasons} />
</main>;

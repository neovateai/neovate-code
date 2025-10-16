import React from 'react';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-secondary/50 px-6 py-4">
        <h1 className="text-xl font-semibold">Neovate Desktop</h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}

export default App;

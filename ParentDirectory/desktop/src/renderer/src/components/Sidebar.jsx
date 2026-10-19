import React from 'react';

export default function Sidebar({ onNavigate }) {
  const navItems = [
    { key: 'chat', label: 'Chat' },
    { key: 'settings', label: 'Settings' },
    { key: 'stream', label: 'Stream' },
    { key: 'home', label: 'Home' }
  ];

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 p-4 flex flex-col gap-3">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-indigo-400">V.E.D.A.</h1>
        <p className="text-xs text-gray-500 mt-1">Desktop Agent</p>
      </div>

      {navItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onNavigate(item.key)}
          className="w-full text-left px-3 py-2 rounded-xl text-sm text-gray-200 bg-gray-900 hover:bg-gray-800 border border-gray-800 transition"
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}

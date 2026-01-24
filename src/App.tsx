import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Card from './components/Card';
import ThemeToggle from './components/ThemeToggle';
import { SECTIONS } from './constants';

const Background: React.FC = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute -top-[10%] -right-[10%] w-[800px] h-[800px] bg-gradient-to-br from-blue-300/40 to-purple-300/40 rounded-full blur-[80px] dark:from-blue-900/30 dark:to-purple-900/30 animate-float mix-blend-multiply dark:mix-blend-screen"></div>
    <div className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-pink-300/40 to-rose-300/40 rounded-full blur-[80px] dark:from-pink-900/30 dark:to-rose-900/30 animate-float-delayed mix-blend-multiply dark:mix-blend-screen"></div>
    <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-gradient-to-t from-cyan-300/40 to-teal-300/40 rounded-full blur-[80px] dark:from-cyan-900/30 dark:to-teal-900/30 animate-float-delayed-2 mix-blend-multiply dark:mix-blend-screen"></div>
  </div>
);

const App: React.FC = () => {
  return (
    <>
      <Background />

      <Header />

      <div className="relative z-10 flex max-w-[1800px] mx-auto px-6 pb-40 gap-8 pt-[340px]">
        <Sidebar />

        <main className="flex-1 min-w-0 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-60">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl filter drop-shadow-md">{section.icon}</span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                  {section.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
                {section.items.map((item, index) => (
                  <Card key={item.id} item={item} index={index} />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>

      <ThemeToggle />
    </>
  );
};

export default App;
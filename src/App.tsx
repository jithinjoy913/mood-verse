import React, { useEffect } from 'react';
import { Auth } from './components/Auth';
import { MoodAnalyzer } from './components/MoodAnalyzer';
import { AppFooter } from './components/AppFooter';
import { PrivacyCenterModal } from './components/PrivacyCenterModal';
import { useAuthStore } from './store/authStore';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { LogOut, Shield, Sparkles } from 'lucide-react';

function App() {
  const { user, setUser, signOut } = useAuthStore();
  const [privacyOpen, setPrivacyOpen] = React.useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [setUser]);

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-20 mv-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-purple-700">Mood Verse</h1>
              <p className="text-sm text-gray-600">Realtime emotion insights with curated recommendations</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Live Detection On
              </span>
              <button
                onClick={() => setPrivacyOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-indigo-200 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300"
              >
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </button>
              <button
                onClick={signOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        <div className="mv-fade-in">
          <MoodAnalyzer />
        </div>
      </main>

      <AppFooter className="px-4 sm:px-6 lg:px-8 pb-6" />
      <PrivacyCenterModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}

export default App;

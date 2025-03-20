import React, { useEffect } from 'react';
import { Auth } from './components/Auth';
import { MoodAnalyzer } from './components/MoodAnalyzer';
import { useAuthStore } from './store/authStore';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { LogOut } from 'lucide-react';

function App() {
  const { user, setUser, signOut } = useAuthStore();

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-purple-600">Mood Analyzer</h1>
            <button
              onClick={signOut}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <MoodAnalyzer />
      </main>
    </div>
  );
}

export default App;
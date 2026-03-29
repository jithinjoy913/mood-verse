import { useEffect, useMemo, useState } from 'react';
import { Activity, Music, NotebookPen, Timer, Users, ShieldAlert, Wind, Phone, AlertCircle } from 'lucide-react';

type AppMood = 'happy' | 'sad' | 'neutral' | 'excited' | 'tired';

type JournalEntry = {
  mood: AppMood;
  note: string;
  createdAt: string;
};

type Habits = {
  sleepHours: number;
  waterGlasses: number;
  steps: number;
  sunlightMinutes: number;
};

const JOURNAL_KEY = 'moodverse_journal_v1';
const HABITS_KEY = 'moodverse_habits_v1';
const CHECKLIST_KEY = 'moodverse_checklist_v1';

const reflectionPrompts: Record<AppMood, string> = {
  happy: 'What made you feel good today, and how can you repeat it tomorrow?',
  sad: 'What is one gentle thing you can do for yourself in the next 10 minutes?',
  neutral: 'What meaningful task can you complete today to build momentum?',
  excited: 'How can you channel this energy into one focused, useful action?',
  tired: 'What rest or reset action can you take right now to recover energy?'
};

const transitionMixes: Record<AppMood, Array<{ title: string; link: string; note: string }>> = {
  happy: [
    { title: 'Keep the vibe high', link: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs', note: 'Sustain positive energy.' },
    { title: 'Focused upbeat mix', link: 'https://www.youtube.com/watch?v=5qap5aO4i9A', note: 'Stay productive with positive rhythm.' }
  ],
  sad: [
    { title: 'Calm to neutral', link: 'https://www.youtube.com/watch?v=lFcSrYw-ARY', note: 'Slow emotional reset.' },
    { title: 'Gentle uplifting tracks', link: 'https://www.youtube.com/watch?v=DWcJFNfaw9c', note: 'Move from low to balanced.' }
  ],
  neutral: [
    { title: 'Steady concentration', link: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', note: 'Maintain balanced flow.' },
    { title: 'Light motivation', link: 'https://www.youtube.com/watch?v=rUxyKA_-grg', note: 'Shift into productive mode.' }
  ],
  excited: [
    { title: 'Channel energy', link: 'https://www.youtube.com/watch?v=9Gq9N-sPdYg', note: 'Convert excitement into action.' },
    { title: 'Workout energy mix', link: 'https://www.youtube.com/watch?v=QdBZY2fkU-0', note: 'Use energy physically first.' }
  ],
  tired: [
    { title: 'Deep relaxation', link: 'https://www.youtube.com/watch?v=1ZYbU82GVz4', note: 'Recover and recharge.' },
    { title: 'Gentle focus reset', link: 'https://www.youtube.com/watch?v=5yx6BWlEVcY', note: 'Low-intensity concentration.' }
  ]
};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors gracefully
  }
}

export function WellbeingHub({ mood }: { mood: AppMood }) {
  const [note, setNote] = useState('');
  const [journal, setJournal] = useState<JournalEntry[]>(() => readJson<JournalEntry[]>(JOURNAL_KEY, []));
  const [breathingRunning, setBreathingRunning] = useState(false);
  const [breathingSeconds, setBreathingSeconds] = useState(120);
  const [anxietyMode, setAnxietyMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hubRefreshing, setHubRefreshing] = useState(false);

  const [habits, setHabits] = useState<Record<string, Habits>>(() =>
    readJson<Record<string, Habits>>(HABITS_KEY, {})
  );

  const [checklist, setChecklist] = useState<Record<string, boolean>>(() =>
    readJson<Record<string, boolean>>(CHECKLIST_KEY, {})
  );

  const today = getTodayKey();
  const todayHabits = habits[today] ?? {
    sleepHours: 7,
    waterGlasses: 6,
    steps: 4000,
    sunlightMinutes: 15
  };

  const lowMoodAlert = useMemo(() => {
    const recent = journal.slice(0, 7);
    if (recent.length < 4) return false;
    const lowCount = recent.filter((entry) => entry.mood === 'sad' || entry.mood === 'tired').length;
    return lowCount >= 4;
  }, [journal]);

  const anxietyRisk = mood === 'sad' || mood === 'tired';

  const habitSuggestion = useMemo(() => {
    if (todayHabits.sleepHours < 6) return 'Sleep looked low. Prioritize earlier bedtime tonight for better next-day mood stability.';
    if (todayHabits.waterGlasses < 6) return 'Hydration may be dragging energy. Try 2 glasses of water in the next hour.';
    if (todayHabits.sunlightMinutes < 10) return 'Get at least 10 more minutes of daylight to support mood and alertness.';
    if (todayHabits.steps < 4000) return 'A short walk can quickly improve mood. Aim for +1500 steps today.';
    return 'Habits look solid today. Keep consistency and focus on one meaningful task next.';
  }, [todayHabits]);

  useEffect(() => {
    writeJson(JOURNAL_KEY, journal);
  }, [journal]);

  useEffect(() => {
    writeJson(HABITS_KEY, habits);
  }, [habits]);

  useEffect(() => {
    writeJson(CHECKLIST_KEY, checklist);
  }, [checklist]);

  useEffect(() => {
    if (!breathingRunning) return;

    const timer = window.setInterval(() => {
      setBreathingSeconds((prev) => {
        if (prev <= 1) {
          setBreathingRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [breathingRunning]);

  useEffect(() => {
    const latest = journal[0];
    if (latest?.mood === mood) {
      const latestTime = new Date(latest.createdAt).getTime();
      const now = Date.now();
      const within30Min = now - latestTime < 30 * 60 * 1000;
      if (within30Min) return;
    }

    const entry: JournalEntry = {
      mood,
      note: '',
      createdAt: new Date().toISOString()
    };

    setJournal((prev) => [entry, ...prev].slice(0, 40));
  }, [mood]);

  useEffect(() => {
    setHubRefreshing(true);
    const timer = window.setTimeout(() => setHubRefreshing(false), 350);
    return () => window.clearTimeout(timer);
  }, [mood]);

  const saveReflection = () => {
    const trimmed = note.trim();
    if (!trimmed) return;

    const entry: JournalEntry = {
      mood,
      note: trimmed,
      createdAt: new Date().toISOString()
    };

    setJournal((prev) => [entry, ...prev].slice(0, 40));
    setNote('');
  };

  const updateHabit = <K extends keyof Habits>(key: K, value: Habits[K]) => {
    setHabits((prev) => ({
      ...prev,
      [today]: {
        ...todayHabits,
        [key]: value
      }
    }));
  };

  const shareMessage = `Hey, I am doing a quick mood reset. Can we check in later today?`;

  const copyShareMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const checklistItems = [
    { key: `${today}-water`, label: 'Drink one glass of water' },
    { key: `${today}-stretch`, label: 'Do a 2-minute stretch' },
    { key: `${today}-breathe`, label: 'Complete a breathing cycle' }
  ];

  const anxietyChecklistItems = [
    { key: `${today}-anx-54321`, label: 'Do the 5-4-3-2-1 grounding scan' },
    { key: `${today}-anx-breath`, label: 'Complete 60 seconds of slow breathing' },
    { key: `${today}-anx-water`, label: 'Sip cold water and relax shoulders' },
    { key: `${today}-anx-message`, label: 'Send a short check-in message to someone you trust' }
  ];

  const cardMotionClass = () =>
    `transition-all duration-300 ease-out ${hubRefreshing ? 'opacity-70 translate-y-1' : 'opacity-100 translate-y-0'}`;

  const cardMotionStyle = (index: number) => ({
    transitionDelay: `${index * 70}ms`
  });

  return (
    <div className="mt-8 relative">
      {hubRefreshing && <WellbeingHubSkeleton />}

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all duration-300 ${hubRefreshing ? 'opacity-75 scale-[0.995]' : 'opacity-100 scale-100'}`}>
      <div className={`rounded-xl border border-gray-200 bg-white p-4 ${cardMotionClass()}`} style={cardMotionStyle(0)}>
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <NotebookPen className="h-4 w-4 text-purple-600" />
          Mood Journal
        </div>
        <p className="text-xs text-gray-600 mt-1">{reflectionPrompts[mood]}</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write 1-2 lines about how you feel right now..."
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          rows={3}
        />
        <button
          onClick={saveReflection}
          className="mt-2 rounded-lg bg-purple-600 text-white text-sm px-3 py-2 hover:bg-purple-700"
        >
          Save Reflection
        </button>
        <div className="mt-3 space-y-2 max-h-40 overflow-auto">
          {journal.slice(0, 5).map((entry, idx) => (
            <div key={`${entry.createdAt}-${idx}`} className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()} - <span className="capitalize">{entry.mood}</span></p>
              {entry.note && <p className="text-sm text-gray-700 mt-1">{entry.note}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-xl border border-gray-200 bg-white p-4 ${cardMotionClass()}`} style={cardMotionStyle(1)}>
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <Timer className="h-4 w-4 text-purple-600" />
          2-Minute Breathing Reset
        </div>
        <p className="text-xs text-gray-600 mt-1">Inhale 4s, hold 4s, exhale 6s. Repeat gently.</p>
        <p className="mt-3 text-2xl font-bold text-purple-700">{Math.floor(breathingSeconds / 60)}:{String(breathingSeconds % 60).padStart(2, '0')}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setBreathingRunning(true)}
            className="rounded-lg bg-purple-600 text-white text-sm px-3 py-2 hover:bg-purple-700"
          >
            Start
          </button>
          <button
            onClick={() => setBreathingRunning(false)}
            className="rounded-lg border border-gray-300 text-gray-700 text-sm px-3 py-2 hover:bg-gray-50"
          >
            Pause
          </button>
          <button
            onClick={() => {
              setBreathingRunning(false);
              setBreathingSeconds(120);
            }}
            className="rounded-lg border border-gray-300 text-gray-700 text-sm px-3 py-2 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {checklistItems.map((item) => (
            <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(checklist[item.key])}
                onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))}
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div className={`rounded-xl border border-rose-200 bg-rose-50/60 p-4 ${cardMotionClass()}`} style={cardMotionStyle(2)}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-rose-900 font-semibold">
              <Wind className="h-4 w-4" />
              Anxiety Support (Free)
            </div>
            <p className="text-xs text-rose-800 mt-1">Use this when you feel anxious, overwhelmed, or emotionally flooded.</p>
          </div>
          <button
            onClick={() => setAnxietyMode((prev) => !prev)}
            className={`rounded-lg text-sm px-3 py-2 border ${
              anxietyMode ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-700 border-rose-300'
            }`}
          >
            {anxietyMode ? 'SOS Mode On' : 'Start SOS Mode'}
          </button>
        </div>

        {(anxietyMode || anxietyRisk) && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-white p-3">
            <p className="text-sm font-semibold text-rose-900 inline-flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Try this now (about 2-3 minutes)
            </p>
            <ol className="mt-2 text-sm text-rose-900 list-decimal pl-5 space-y-1">
              <li>Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.</li>
              <li>Breathe in 4s, hold 2s, out 6s for 6 rounds.</li>
              <li>Relax your jaw and shoulders; place both feet flat on the floor.</li>
              <li>Send a short message: "I feel anxious right now. Can we check in?"</li>
            </ol>

            <div className="mt-3 space-y-2">
              {anxietyChecklistItems.map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-sm text-rose-900">
                  <input
                    type="checkbox"
                    checked={Boolean(checklist[item.key])}
                    onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                  />
                  {item.label}
                </label>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://findahelpline.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-rose-300 text-rose-800 text-sm px-3 py-2 hover:bg-rose-100"
              >
                <Phone className="h-4 w-4 mr-2" />
                Find support line
              </a>
            </div>
          </div>
        )}
      </div>

      <div className={`rounded-xl border border-gray-200 bg-white p-4 ${cardMotionClass()}`} style={cardMotionStyle(3)}>
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <Activity className="h-4 w-4 text-purple-600" />
          Habit Coach (Free)
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label className="text-gray-700">Sleep (hours)
            <input type="number" min={0} max={12} value={todayHabits.sleepHours} onChange={(e) => updateHabit('sleepHours', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1" />
          </label>
          <label className="text-gray-700">Water (glasses)
            <input type="number" min={0} max={20} value={todayHabits.waterGlasses} onChange={(e) => updateHabit('waterGlasses', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1" />
          </label>
          <label className="text-gray-700">Steps
            <input type="number" min={0} max={50000} value={todayHabits.steps} onChange={(e) => updateHabit('steps', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1" />
          </label>
          <label className="text-gray-700">Sunlight (mins)
            <input type="number" min={0} max={180} value={todayHabits.sunlightMinutes} onChange={(e) => updateHabit('sunlightMinutes', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1" />
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-700 bg-purple-50 border border-purple-100 rounded-lg p-2">{habitSuggestion}</p>
      </div>

      <div className={`rounded-xl border border-gray-200 bg-white p-4 ${cardMotionClass()}`} style={cardMotionStyle(4)}>
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <Music className="h-4 w-4 text-purple-600" />
          Music Therapy Mode
        </div>
        <p className="text-xs text-gray-600 mt-1">Free transition tracks to help shift your current mood.</p>
        <div className="mt-3 space-y-2">
          {transitionMixes[mood].map((mix) => (
            <a key={mix.title} href={mix.link} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
              <p className="text-sm font-semibold text-gray-800">{mix.title}</p>
              <p className="text-xs text-gray-600 mt-1">{mix.note}</p>
            </a>
          ))}
        </div>
      </div>

      <div className={`rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2 ${cardMotionClass()}`} style={cardMotionStyle(5)}>
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <Users className="h-4 w-4 text-purple-600" />
          Social Support Nudges
        </div>
        <p className="text-xs text-gray-600 mt-1">Quick free actions if you want social support.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`mailto:?subject=Mood check-in&body=${encodeURIComponent(shareMessage)}`}
            className="rounded-lg bg-purple-600 text-white text-sm px-3 py-2 hover:bg-purple-700"
          >
            Email a friend
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 text-gray-700 text-sm px-3 py-2 hover:bg-gray-50"
          >
            WhatsApp message
          </a>
          <button
            onClick={copyShareMessage}
            className="rounded-lg border border-gray-300 text-gray-700 text-sm px-3 py-2 hover:bg-gray-50"
          >
            {copied ? 'Copied' : 'Copy message'}
          </button>
        </div>

        {lowMoodAlert && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-800 inline-flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Gentle support reminder</p>
            <p className="text-xs text-amber-700 mt-1">You have had several low-energy moods recently. Consider talking to someone you trust and taking a restorative break today.</p>
            <a
              href="https://findahelpline.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-amber-800 underline"
            >
              Find local emotional support resources
            </a>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function WellbeingHubSkeleton() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3, 4].map((card) => (
          <div key={card} className={`rounded-xl border border-gray-100 bg-white/90 p-4 animate-pulse ${card === 4 ? 'lg:col-span-2' : ''}`}>
            <div className="h-4 w-40 rounded bg-gray-200 mb-3" />
            <div className="h-3 w-5/6 rounded bg-gray-200 mb-2" />
            <div className="h-3 w-3/5 rounded bg-gray-200 mb-4" />
            <div className="h-9 w-full rounded bg-gray-200 mb-2" />
            <div className="h-9 w-4/5 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

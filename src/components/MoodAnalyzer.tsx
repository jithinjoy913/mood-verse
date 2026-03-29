import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import { Camera, RefreshCw, Music, Film, Activity, ArrowRight, ScanFace, Shield, Zap, HeartPulse, AlertTriangle, VideoOff, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { getMoodCoachTip } from '../services/aiMoodCoach';
import { WellbeingHub } from './WellbeingHub';
import { PanicSupportModal } from './PanicSupportModal';

type AppMood = 'happy' | 'sad' | 'neutral' | 'excited' | 'tired';
type RecommendationTab = 'music' | 'movies' | 'activities';

const MODEL_SOURCES = [
  '/models',
  'https://justadudewhohacks.github.io/face-api.js/models'
];

const HISTORY_WINDOW = 8;
const PERSONALIZATION_KEY = 'moodverse_recommendation_scores_v1';
const DEFAULT_CONFIDENCE_THRESHOLD = 0.62;

const TAB_PRIORITY_BY_MOOD: Record<AppMood, RecommendationTab[]> = {
  happy: ['activities', 'music', 'movies'],
  sad: ['music', 'activities', 'movies'],
  neutral: ['activities', 'music', 'movies'],
  excited: ['activities', 'music', 'movies'],
  tired: ['activities', 'music', 'movies']
};

function readPreferenceScores(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(PERSONALIZATION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writePreferenceScores(scores: Record<string, number>) {
  try {
    window.localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(scores));
  } catch {
    // Ignore storage failures gracefully.
  }
}

function recommendationKey(tab: RecommendationTab, mood: AppMood, title: string): string {
  return `${tab}|${mood}|${title}`;
}

function adjustRecommendationScore(tab: RecommendationTab, mood: AppMood, title: string, delta: number) {
  const scores = readPreferenceScores();
  const key = recommendationKey(tab, mood, title);
  const nextScore = (scores[key] ?? 0) + delta;
  scores[key] = Math.max(-5, Math.min(25, nextScore));
  writePreferenceScores(scores);
}

function getRecommendationScore(tab: RecommendationTab, mood: AppMood, title: string): number {
  const scores = readPreferenceScores();
  return scores[recommendationKey(tab, mood, title)] ?? 0;
}

function trackRecommendationInteraction(tab: RecommendationTab, mood: AppMood, title: string) {
  adjustRecommendationScore(tab, mood, title, 1);
}

function trackRecommendationFeedback(tab: RecommendationTab, mood: AppMood, title: string, helpful: boolean) {
  adjustRecommendationScore(tab, mood, title, helpful ? 2 : -2);
}

function sortByPreference<T extends { title: string }>(items: T[], tab: RecommendationTab, mood: AppMood): T[] {
  return [...items]
    .map((item, index) => ({
      item,
      index,
      score: getRecommendationScore(tab, mood, item.title)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

function getCameraErrorContext(error: unknown): { status: 'denied' | 'blocked'; message: string } {
  const mediaError = error as DOMException | undefined;
  const errorName = mediaError?.name ?? '';

  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorName === 'SecurityError') {
    return {
      status: 'denied',
      message: 'Camera permission is blocked. Please allow camera access in your browser settings and retry.'
    };
  }

  return {
    status: 'blocked',
    message: 'No accessible camera was found. Connect a camera or check device permissions.'
  };
}

function mapExpressionsToMood(expressions: faceapi.FaceExpressions): { mood: AppMood; confidence: number } {
  const moodScores: Record<AppMood, number> = {
    happy: expressions.happy,
    sad: expressions.sad,
    neutral: expressions.neutral,
    excited: expressions.surprised * 0.7 + expressions.happy * 0.2 + expressions.angry * 0.1,
    tired: expressions.neutral * 0.45 + expressions.sad * 0.3 + expressions.fearful * 0.2 + expressions.disgusted * 0.05
  };

  const entries = Object.entries(moodScores) as Array<[AppMood, number]>;
  const [mood, confidence] = entries.reduce((best, current) =>
    current[1] > best[1] ? current : best
  );

  return { mood, confidence };
}

function getMostFrequentMood(history: AppMood[]): AppMood | null {
  if (!history.length) return null;

  const counts = history.reduce<Record<AppMood, number>>((acc, mood) => {
    acc[mood] += 1;
    return acc;
  }, {
    happy: 0,
    sad: 0,
    neutral: 0,
    excited: 0,
    tired: 0
  });

  const sorted = (Object.entries(counts) as Array<[AppMood, number]>).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

export function MoodAnalyzer() {
  const webcamRef = useRef<Webcam>(null);
  const rafIdRef = useRef<number | null>(null);
  const moodHistoryRef = useRef<AppMood[]>([]);
  const lastInferenceRef = useRef(0);

  const [mood, setMood] = useState<AppMood | null>(null);
  const [liveMood, setLiveMood] = useState<AppMood | null>(null);
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelSource, setModelSource] = useState<string | null>(null);
  const [faceVisible, setFaceVisible] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(DEFAULT_CONFIDENCE_THRESHOLD);
  const [cameraState, setCameraState] = useState<'unknown' | 'granted' | 'denied' | 'blocked'>('unknown');
  const [cameraMessage, setCameraMessage] = useState('');
  const [webcamKey, setWebcamKey] = useState(0);
  const [panicSupportOpen, setPanicSupportOpen] = useState(false);

  const lowConfidence = !!liveMood && faceVisible && liveConfidence < confidenceThreshold;

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        await tf.setBackend('webgl');

        for (const source of MODEL_SOURCES) {
          try {
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(source),
              faceapi.nets.faceExpressionNet.loadFromUri(source)
            ]);
            setModelSource(source);
            setModelLoaded(true);
            return;
          } catch (sourceError) {
            console.warn(`Failed loading face-api models from ${source}`, sourceError);
          }
        }

        throw new Error('Could not load face-api model files from any configured source.');
      } catch (err) {
        console.error('Error loading face detection model:', err);
        setError('Failed to load expression model. Ensure model files are available in /public/models or try again.');
      }
    };

    loadModel();

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      tf.dispose();
    };
  }, []);

  useEffect(() => {
    if (!modelLoaded || cameraState !== 'granted') {
      return;
    }

    let stopped = false;

    const infer = async () => {
      if (stopped) return;

      const video = webcamRef.current?.video as HTMLVideoElement | undefined;
      const now = performance.now();

      if (video && video.readyState === 4 && now - lastInferenceRef.current > 700) {
        lastInferenceRef.current = now;
        try {
          const result = await faceapi
            .detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.5
              })
            )
            .withFaceExpressions();

          if (result?.expressions) {
            setFaceVisible(true);
            const { mood: predictedMood, confidence } = mapExpressionsToMood(result.expressions);

            moodHistoryRef.current = [...moodHistoryRef.current, predictedMood].slice(-HISTORY_WINDOW);
            const stableMood = getMostFrequentMood(moodHistoryRef.current);

            if (stableMood) {
              setLiveMood(stableMood);
              setLiveConfidence(confidence);
            }
          } else {
            setFaceVisible(false);
          }
        } catch (inferenceError) {
          console.error('Realtime mood inference failed:', inferenceError);
          setError('Realtime mood detection stopped unexpectedly. Please refresh and try again.');
          return;
        }
      }

      rafIdRef.current = requestAnimationFrame(infer);
    };

    rafIdRef.current = requestAnimationFrame(infer);

    return () => {
      stopped = true;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [modelLoaded, cameraState]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (showRecommendations && mood) {
    return (
      <>
        <RecommendationsPage
          mood={mood}
          liveMood={liveMood}
          liveConfidence={liveConfidence}
          continuousMode={continuousMode}
          confidenceThreshold={confidenceThreshold}
          onToggleContinuousMode={() => setContinuousMode((prev) => !prev)}
          onThresholdChange={(value) => setConfidenceThreshold(value)}
          onReset={() => {
            setShowRecommendations(false);
            setMood(null);
            moodHistoryRef.current = [];
          }}
        />
        <button
          onClick={() => setPanicSupportOpen(true)}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-rose-600 text-white px-4 py-3 shadow-lg hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
          aria-label="Open emergency anxiety support"
        >
          SOS Support
        </button>
        <PanicSupportModal open={panicSupportOpen} onClose={() => setPanicSupportOpen(false)} />
      </>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-sm text-gray-600">
          <div className="flex items-center gap-2 text-purple-700 font-semibold mb-1"><Zap className="h-4 w-4" /> Live Scan</div>
          Mood updates every second while your face is visible.
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-sm text-gray-600">
          <div className="flex items-center gap-2 text-purple-700 font-semibold mb-1"><Shield className="h-4 w-4" /> Privacy First</div>
          Processing runs in-browser without uploading camera frames.
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-sm text-gray-600">
          <div className="flex items-center gap-2 text-purple-700 font-semibold mb-1"><HeartPulse className="h-4 w-4" /> Smart Suggestions</div>
          Recommendations adapt to your detected emotional state.
        </div>
      </div>

      <div className="mb-4 bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Live Mood</p>
          <p className="text-2xl font-bold text-purple-600 capitalize">{liveMood ?? 'Detecting...'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {faceVisible
              ? `Confidence: ${(liveConfidence * 100).toFixed(0)}%`
              : 'No face detected. Align your face in the frame.'}
          </p>
          {lowConfidence && (
            <p className="text-xs text-amber-700 mt-2">
              Confidence is low. Improve framing and lighting before using this mood.
            </p>
          )}
        </div>
        <div className="text-xs text-gray-500">
          Model source: {modelSource ?? 'loading...'}
        </div>
      </div>

      <div className="relative">
        {(cameraState === 'denied' || cameraState === 'blocked') && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Camera access needed</p>
                <p className="text-sm text-amber-700 mt-1">{cameraMessage}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setCameraState('unknown');
                      setCameraMessage('');
                      setWebcamKey((prev) => prev + 1);
                    }}
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Camera Access
                  </button>
                  <a
                    href="https://support.google.com/chrome/answer/2693767"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm hover:bg-amber-100"
                  >
                    Permission Help
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {cameraState === 'granted' && lowConfidence && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-800">Get a better read</p>
            <ul className="mt-2 text-sm text-amber-700 list-disc list-inside space-y-1">
              <li>Face the camera directly and keep your full face inside the frame.</li>
              <li>Use soft front lighting and avoid strong backlight.</li>
              <li>Hold still for 2 to 3 seconds before tapping Use Live Mood.</li>
            </ul>
          </div>
        )}

        <Webcam
          key={webcamKey}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="w-full rounded-xl shadow-xl border border-white/70"
          mirrored={true}
          audio={false}
          onUserMedia={() => {
            setCameraState('granted');
            setCameraMessage('');
          }}
          onUserMediaError={(webcamError) => {
            const context = getCameraErrorContext(webcamError);
            setCameraState(context.status);
            setCameraMessage(context.message);
            setFaceVisible(false);
          }}
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: "user"
          }}
        />
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => {
              if (!liveMood) return;
              setMood(liveMood);
              setShowRecommendations(true);
            }}
            disabled={!modelLoaded || !liveMood || !faceVisible || cameraState !== 'granted' || lowConfidence}
            className="bg-purple-600 text-white px-4 sm:px-6 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!modelLoaded ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading model...</span>
              </>
            ) : (
              <>
                <ScanFace className="h-5 w-5" />
                <span className="hidden sm:inline">Use Live Mood</span>
                <span className="sm:hidden">Use Mood</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              moodHistoryRef.current = [];
              setLiveMood(null);
              setLiveConfidence(0);
            }}
            className="bg-white text-gray-700 px-3 sm:px-4 py-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors inline-flex items-center space-x-2"
          >
            <Camera className="h-5 w-5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {cameraState !== 'granted' && (
          <div className="absolute top-3 left-3 rounded-lg bg-black/65 text-white px-3 py-2 text-xs flex items-center gap-2">
            <VideoOff className="h-4 w-4" />
            Waiting for camera permission
          </div>
        )}
      </div>

      <button
        onClick={() => setPanicSupportOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-rose-600 text-white px-4 py-3 shadow-lg hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
        aria-label="Open emergency anxiety support"
      >
        SOS Support
      </button>
      <PanicSupportModal open={panicSupportOpen} onClose={() => setPanicSupportOpen(false)} />
    </div>
  );
}

interface RecommendationsPageProps {
  mood: AppMood;
  liveMood: AppMood | null;
  liveConfidence: number;
  continuousMode: boolean;
  confidenceThreshold: number;
  onToggleContinuousMode: () => void;
  onThresholdChange: (value: number) => void;
  onReset: () => void;
}

function RecommendationsPage({ mood, liveMood, liveConfidence, continuousMode, confidenceThreshold, onToggleContinuousMode, onThresholdChange, onReset }: RecommendationsPageProps) {
  const [activeTab, setActiveTab] = useState<RecommendationTab>('music');
  const [currentMood, setCurrentMood] = useState<AppMood>(mood);
  const [justUpdated, setJustUpdated] = useState(false);
  const [isPanelRefreshing, setIsPanelRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [aiTip, setAiTip] = useState('');
  const [aiTipSource, setAiTipSource] = useState<'local' | 'huggingface' | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const moodInsights: Record<AppMood, { focus: string; action: string }> = {
    happy: {
      focus: 'You are in a high-energy positive state.',
      action: 'Best next step: choose social or creative activities to sustain momentum.'
    },
    sad: {
      focus: 'Your emotional state looks low and reflective.',
      action: 'Best next step: start with calming music, then try one gentle self-care activity.'
    },
    neutral: {
      focus: 'You appear steady and balanced right now.',
      action: 'Best next step: pick productivity or skill-building recommendations first.'
    },
    excited: {
      focus: 'You are showing elevated activation and enthusiasm.',
      action: 'Best next step: channel energy into movement, focused goals, or group engagement.'
    },
    tired: {
      focus: 'Your expression suggests low energy or fatigue.',
      action: 'Best next step: prioritize restorative activities before high-intensity options.'
    }
  };

  const tabDescriptions: Record<RecommendationTab, { label: string; hint: string; count: number }> = {
    music: {
      label: 'Music',
      hint: 'Play mood-matched tracks instantly',
      count: 2
    },
    movies: {
      label: 'Movies',
      hint: 'Watch titles that fit your state',
      count: 2
    },
    activities: {
      label: 'Activities',
      hint: 'Actionable tasks for right now',
      count: 2
    }
  };

  useEffect(() => {
    setCurrentMood(mood);
  }, [mood]);

  useEffect(() => {
    const [firstTab] = TAB_PRIORITY_BY_MOOD[currentMood];
    setActiveTab(firstTab);
  }, [currentMood]);

  useEffect(() => {
    if (!continuousMode || !liveMood || liveMood === currentMood || liveConfidence < confidenceThreshold) {
      return;
    }

    setCurrentMood(liveMood);
    setJustUpdated(true);
    const timer = window.setTimeout(() => setJustUpdated(false), 1200);
    return () => window.clearTimeout(timer);
  }, [continuousMode, liveMood, liveConfidence, confidenceThreshold, currentMood]);

  const fetchAiTip = async () => {
    setAiLoading(true);
    const result = await getMoodCoachTip(currentMood);
    setAiTip(result.text);
    setAiTipSource(result.source);
    setAiLoading(false);
  };

  const handleInteraction = (tab: RecommendationTab, title: string) => {
    trackRecommendationInteraction(tab, currentMood, title);
  };

  const handleFeedback = (tab: RecommendationTab, title: string, helpful: boolean) => {
    trackRecommendationFeedback(tab, currentMood, title, helpful);
    setFeedbackMessage(helpful ? 'Thanks. We will prioritize similar suggestions.' : 'Understood. We will show fewer similar suggestions.');
    window.setTimeout(() => setFeedbackMessage(''), 1500);
  };

  useEffect(() => {
    setIsPanelRefreshing(true);
    const timer = window.setTimeout(() => setIsPanelRefreshing(false), 350);
    return () => window.clearTimeout(timer);
  }, [activeTab, currentMood]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 border border-gray-100">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Your Mood: <span className="text-purple-600 capitalize">{currentMood}</span></h2>
          <p className="text-gray-600 mt-2">Here are some personalized recommendations for you</p>
          {justUpdated && (
            <p className="text-sm text-emerald-600 mt-2 inline-flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              Updated based on your live expression
            </p>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Continuous recommendations mode</p>
            <p className="text-xs text-gray-600 mt-1">
              {continuousMode
                ? `Auto-refreshing suggestions as your mood changes (${(liveConfidence * 100).toFixed(0)}% confidence).`
                : 'Suggestions stay fixed until you manually scan again.'}
            </p>
            <div className="mt-3">
              <p className="text-xs text-gray-600 mb-1">Confidence threshold: {(confidenceThreshold * 100).toFixed(0)}%</p>
              <input
                type="range"
                min={0.45}
                max={0.9}
                step={0.01}
                value={confidenceThreshold}
                onChange={(e) => onThresholdChange(Number(e.target.value))}
                className="w-52 accent-purple-600"
              />
            </div>
          </div>
          <button
            onClick={onToggleContinuousMode}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              continuousMode
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            {continuousMode ? 'Auto Mode: ON' : 'Auto Mode: OFF'}
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
          <p className="text-sm font-semibold text-indigo-900">Mood insight</p>
          <p className="text-sm text-indigo-800 mt-1">{moodInsights[currentMood].focus}</p>
          <p className="text-xs text-indigo-700 mt-2">{moodInsights[currentMood].action}</p>
        </div>

        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-900">AI mood coach</p>
              <p className="text-xs text-emerald-700 mt-1">Uses free Hugging Face inference when token is set, otherwise local smart fallback.</p>
            </div>
            <button
              onClick={fetchAiTip}
              disabled={aiLoading}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {aiLoading ? 'Thinking...' : 'Generate Tip'}
            </button>
          </div>
          {aiTip && (
            <div className="mt-3 text-sm text-emerald-900">
              <p>{aiTip}</p>
              <p className="text-xs text-emerald-700 mt-2">Source: {aiTipSource === 'huggingface' ? 'Hugging Face free-tier API' : 'Local fallback tips'}</p>
            </div>
          )}
        </div>

        <div className="flex justify-center flex-wrap gap-3 mb-6">
          <TabButton
            active={activeTab === 'music'}
            onClick={() => setActiveTab('music')}
            icon={<Music className="h-5 w-5" />}
            label={tabDescriptions.music.label}
            hint={tabDescriptions.music.hint}
            count={tabDescriptions.music.count}
          />
          <TabButton
            active={activeTab === 'movies'}
            onClick={() => setActiveTab('movies')}
            icon={<Film className="h-5 w-5" />}
            label={tabDescriptions.movies.label}
            hint={tabDescriptions.movies.hint}
            count={tabDescriptions.movies.count}
          />
          <TabButton
            active={activeTab === 'activities'}
            onClick={() => setActiveTab('activities')}
            icon={<Activity className="h-5 w-5" />}
            label={tabDescriptions.activities.label}
            hint={tabDescriptions.activities.hint}
            count={tabDescriptions.activities.count}
          />
        </div>

        <div className="mb-8 text-center">
          <p className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 text-xs font-medium">
            Showing {tabDescriptions[activeTab].label.toLowerCase()} picks for your <span className="capitalize mx-1">{currentMood}</span> mood
          </p>
          {feedbackMessage && <p className="text-xs text-emerald-700 mt-2">{feedbackMessage}</p>}
        </div>

        <div className={`mt-8 transition-opacity duration-300 ${isPanelRefreshing ? 'opacity-80' : 'opacity-100'}`}>
          {isPanelRefreshing ? (
            <RecommendationSkeleton />
          ) : (
            <>
              {activeTab === 'music' && <MusicRecommendations mood={currentMood} onInteract={handleInteraction} onFeedback={handleFeedback} />}
              {activeTab === 'movies' && <MovieRecommendations mood={currentMood} onInteract={handleInteraction} onFeedback={handleFeedback} />}
              {activeTab === 'activities' && <ActivityRecommendations mood={currentMood} onInteract={handleInteraction} onFeedback={handleFeedback} />}
            </>
          )}
        </div>

        <WellbeingHub mood={currentMood} />

        <div className="mt-8 text-center">
          <button
            onClick={onReset}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            ← Try Another Capture
          </button>
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
  count: number;
}

function TabButton({ active, onClick, icon, label, hint, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl transition-all border px-4 py-3 min-w-[180px] text-left ${
        active
          ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-[1.01]'
          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          {icon}
          <span>{label}</span>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full border ${
          active ? 'border-white/50 bg-white/15 text-white' : 'border-gray-300 bg-white text-gray-600'
        }`}>
          {count} picks
        </span>
      </div>
      <p className={`mt-1 text-xs ${active ? 'text-purple-100' : 'text-gray-500'}`}>{hint}</p>
    </button>
  );
}

function RecommendationSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[0, 1].map((item) => (
        <div key={item} className="p-6 rounded-xl border border-gray-100 bg-gray-50 animate-pulse">
          <div className="h-5 w-28 rounded bg-gray-200 mb-4" />
          <div className="h-4 w-4/5 rounded bg-gray-200 mb-2" />
          <div className="h-4 w-3/5 rounded bg-gray-200 mb-5" />
          <div className="h-8 w-36 rounded bg-gray-200 mb-3" />
          <div className="h-8 w-44 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

interface RecommendationFeedbackProps {
  onHelpful: () => void;
  onNotHelpful: () => void;
}

function RecommendationFeedback({ onHelpful, onNotHelpful }: RecommendationFeedbackProps) {
  return (
    <div className="flex gap-2 mt-3" onClick={(event) => event.stopPropagation()}>
      <button
        onClick={(event) => {
          event.preventDefault();
          onHelpful();
        }}
        className="inline-flex items-center text-xs rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-1 hover:bg-emerald-100"
      >
        <ThumbsUp className="h-3.5 w-3.5 mr-1" />
        Helpful
      </button>
      <button
        onClick={(event) => {
          event.preventDefault();
          onNotHelpful();
        }}
        className="inline-flex items-center text-xs rounded-full border border-rose-300 bg-rose-50 text-rose-700 px-3 py-1 hover:bg-rose-100"
      >
        <ThumbsDown className="h-3.5 w-3.5 mr-1" />
        Not helping
      </button>
    </div>
  );
}

function MusicRecommendations({ mood, onInteract, onFeedback }: { mood: AppMood; onInteract: (tab: RecommendationTab, title: string) => void; onFeedback: (tab: RecommendationTab, title: string, helpful: boolean) => void }) {
  const recommendations = {
    happy: [
      {
        title: "Bollywood Party Hits",
        description: "Upbeat Bollywood songs to keep you dancing",
        link: "https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM",
        platform: "Spotify"
      },
      {
        title: "Punjabi Beats",
        description: "High-energy Punjabi music",
        link: "https://www.youtube.com/playlist?list=PLvlw_ICcAI4c7xX_Y_8RtGYr1wHgY6ZO3",
        platform: "YouTube"
      }
    ],
    sad: [
      {
        title: "Soulful Hindi Melodies",
        description: "Emotional and touching Bollywood songs",
        link: "https://open.spotify.com/playlist/37i9dQZF1DX6cg4h2PoN9y",
        platform: "Spotify"
      },
      {
        title: "Classical Indian Music",
        description: "Calming ragas and classical pieces",
        link: "https://www.youtube.com/playlist?list=PLvlw_ICcAI4d_f-E-YuRRvY1KpJ1EW1w1",
        platform: "YouTube"
      }
    ],
    neutral: [
      {
        title: "Indie India",
        description: "Contemporary Indian indie artists",
        link: "https://open.spotify.com/playlist/37i9dQZF1DX5q67ZpWyRrZ",
        platform: "Spotify"
      },
      {
        title: "Sufi & Folk",
        description: "Soulful Sufi and folk music",
        link: "https://www.youtube.com/playlist?list=PLvlw_ICcAI4f_oQPv7Y-lUJBXWXz4qgBd",
        platform: "YouTube"
      }
    ],
    excited: [
      {
        title: "Desi EDM Mix",
        description: "Indian fusion with electronic beats",
        link: "https://open.spotify.com/playlist/37i9dQZF1DX7ZUug1ANKRP",
        platform: "Spotify"
      },
      {
        title: "Bollywood Workout",
        description: "High-energy Bollywood hits for exercise",
        link: "https://www.youtube.com/playlist?list=PLvlw_ICcAI4e_sG8Y-4s-tXH-xXz4qgBl",
        platform: "YouTube"
      }
    ],
    tired: [
      {
        title: "Peaceful Sanskrit Chants",
        description: "Calming mantras and spiritual music",
        link: "https://open.spotify.com/playlist/37i9dQZF1DWZd79rJ6a7lp",
        platform: "Spotify"
      },
      {
        title: "Indian Instrumental",
        description: "Soothing instrumental versions of Indian classics",
        link: "https://www.youtube.com/playlist?list=PLvlw_ICcAI4c_f-E-YuRRvY1KpJ1EW1w1",
        platform: "YouTube"
      }
    ]
  };

  const moodRecs = sortByPreference(recommendations[mood as keyof typeof recommendations] || [], 'music', mood);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {moodRecs.map((rec, index) => (
        <a
          key={index}
          href={rec.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onInteract('music', rec.title)}
          className="block p-6 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
        >
          {index === 0 && (
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full mb-3">
              Top Match
            </span>
          )}
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{rec.title}</h3>
          <p className="text-gray-600 mb-4">{rec.description}</p>
          <div className="flex items-center text-purple-600">
            <span className="font-medium">Listen on {rec.platform}</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </div>
          <RecommendationFeedback
            onHelpful={() => onFeedback('music', rec.title, true)}
            onNotHelpful={() => onFeedback('music', rec.title, false)}
          />
        </a>
      ))}
    </div>
  );
}

function MovieRecommendations({ mood, onInteract, onFeedback }: { mood: AppMood; onInteract: (tab: RecommendationTab, title: string) => void; onFeedback: (tab: RecommendationTab, title: string, helpful: boolean) => void }) {
  const recommendations = {
    happy: [
      {
        title: "3 Idiots",
        genre: "Comedy, Drama",
        description: "A heartwarming tale of friendship and following your dreams",
        link: "https://www.netflix.com/title/70121522"
      },
      {
        title: "Zindagi Na Milegi Dobara",
        genre: "Adventure, Comedy, Drama",
        description: "A joyful celebration of life and friendship",
        link: "https://www.amazon.com/Zindagi-Na-Milegi-Dobara-Akhtar/dp/B07CQKX1YH"
      }
    ],
    sad: [
      {
        title: "Taare Zameen Par",
        genre: "Drama, Family",
        description: "An emotional journey of a child and his teacher",
        link: "https://www.netflix.com/title/70087087"
      },
      {
        title: "Kal Ho Naa Ho",
        genre: "Romance, Drama",
        description: "A touching story about living life to the fullest",
        link: "https://www.amazon.com/Kal-Ho-Naa-Shah-Khan/dp/B07C24MXPQ"
      }
    ],
    neutral: [
      {
        title: "Lunchbox",
        genre: "Drama, Romance",
        description: "A heartwarming story of unexpected connection",
        link: "https://www.amazon.com/Lunchbox-Irrfan-Khan/dp/B00JFKX5YW"
      },
      {
        title: "Piku",
        genre: "Comedy, Drama",
        description: "A slice-of-life story about family relationships",
        link: "https://www.netflix.com/title/80037004"
      }
    ],
    excited: [
      {
        title: "Dhoom 3",
        genre: "Action, Thriller",
        description: "High-octane action and thrilling sequences",
        link: "https://www.amazon.com/Dhoom-3-Aamir-Khan/dp/B00JZKX3CW"
      },
      {
        title: "RRR",
        genre: "Action, Drama",
        description: "Epic action drama with stunning visuals",
        link: "https://www.netflix.com/title/81476453"
      }
    ],
    tired: [
      {
        title: "Barfi!",
        genre: "Comedy, Drama, Romance",
        description: "A heartwarming and peaceful love story",
        link: "https://www.netflix.com/title/70242034"
      },
      {
        title: "English Vinglish",
        genre: "Drama, Family",
        description: "A gentle and inspiring story of self-discovery",
        link: "https://www.amazon.com/English-Vinglish-Sridevi/dp/B00GXKF8BQ"
      }
    ]
  };

  const moodRecs = sortByPreference(recommendations[mood as keyof typeof recommendations] || [], 'movies', mood);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {moodRecs.map((movie, index) => (
        <a
          key={index}
          href={movie.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onInteract('movies', movie.title)}
          className="block p-6 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
        >
          {index === 0 && (
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full mb-3">
              Top Match
            </span>
          )}
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{movie.title}</h3>
          <p className="text-purple-600 text-sm mb-2">{movie.genre}</p>
          <p className="text-gray-600 mb-4">{movie.description}</p>
          <div className="flex items-center text-purple-600">
            <span className="font-medium">Watch Now</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </div>
          <RecommendationFeedback
            onHelpful={() => onFeedback('movies', movie.title, true)}
            onNotHelpful={() => onFeedback('movies', movie.title, false)}
          />
        </a>
      ))}
    </div>
  );
}

function ActivityRecommendations({ mood, onInteract, onFeedback }: { mood: AppMood; onInteract: (tab: RecommendationTab, title: string) => void; onFeedback: (tab: RecommendationTab, title: string, helpful: boolean) => void }) {
  const [showQuiz, setShowQuiz] = useState(false);
  
  const recommendations = {
    happy: [
      {
        title: "Creative Expression",
        description: "Channel your positive energy",
        tasks: [
          "Learn a Bollywood dance routine",
          "Try your hand at rangoli art",
          "Practice mehendi designs",
          "Cook your favorite Indian dish"
        ]
      },
      {
        title: "Social Connection",
        description: "Share your joy with others",
        tasks: [
          "Plan a chai time with friends",
          "Organize a festive gathering",
          "Join a garba/dandiya class",
          "Share family recipes"
        ]
      }
    ],
    sad: [
      {
        title: "Mindful Activities",
        description: "Find peace and balance",
        tasks: [
          "Practice yoga asanas",
          "Try pranayama breathing",
          "Listen to bhajans",
          "Visit a nearby temple"
        ]
      },
      {
        title: "Self-Care Routine",
        description: "Nurture yourself",
        tasks: [
          "Make a cup of masala chai",
          "Oil massage (abhyanga)",
          "Practice meditation",
          "Write in your journal"
        ]
      }
    ],
    neutral: [
      {
        title: "Productivity Boost",
        description: "Make the most of your time",
        tasks: [
          "Learn Sanskrit shlokas",
          "Practice classical music",
          "Study Vedic mathematics",
          "Read Indian literature"
        ]
      },
      {
        title: "Skill Development",
        description: "Learn something new",
        tasks: [
          "Try a new Indian recipe",
          "Learn classical dance basics",
          "Practice calligraphy",
          "Study Ayurveda basics"
        ]
      }
    ],
    excited: [
      {
        title: "Energy Channel",
        description: "Make use of your high spirits",
        tasks: [
          "Join a Bhangra class",
          "Learn Bollywood choreography",
          "Practice tabla or drums",
          "Plan a cultural event"
        ]
      },
      {
        title: "Creative Pursuits",
        description: "Express your energy",
        tasks: [
          "Create fusion music",
          "Design Indian fashion",
          "Paint madhubani art",
          "Make DIY festival decorations"
        ]
      }
    ],
    tired: [
      {
        title: "Gentle Movement",
        description: "Restore your energy",
        tasks: [
          "Practice gentle yoga",
          "Do simple stretches",
          "Walk in a garden",
          "Feed birds (a traditional activity)"
        ]
      },
      {
        title: "Restorative Practice",
        description: "Find peace and rest",
        tasks: [
          "Listen to Sanskrit chants",
          "Practice meditation",
          "Try aromatherapy with Indian essences",
          "Read spiritual texts"
        ]
      }
    ]
  };

  const moodRecs = sortByPreference(recommendations[mood as keyof typeof recommendations] || [], 'activities', mood);

  if (showQuiz) {
    return <MoodQuiz mood={mood} onBack={() => setShowQuiz(false)} />;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {moodRecs.map((activity, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-lg p-6"
          >
            {index === 0 && (
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full mb-3">
                Top Match
              </span>
            )}
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{activity.title}</h3>
            <p className="text-gray-600 mb-4">{activity.description}</p>
            <ul className="space-y-2">
              {activity.tasks.map((task, taskIndex) => (
                <li key={taskIndex} className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                  {task}
                </li>
              ))}
            </ul>
            <RecommendationFeedback
              onHelpful={() => {
                onInteract('activities', activity.title);
                onFeedback('activities', activity.title, true);
              }}
              onNotHelpful={() => onFeedback('activities', activity.title, false)}
            />
          </div>
        ))}
      </div>
      
      <div className="text-center">
        <button
          onClick={() => setShowQuiz(true)}
          className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Take a Mood Quiz
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

interface MoodQuizProps {
  mood: AppMood;
  onBack: () => void;
}

function MoodQuiz({ mood, onBack }: MoodQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const questions = {
    happy: [
      {
        question: "How likely are you to share your happiness with others?",
        options: [
          "Very likely",
          "Somewhat likely",
          "Not sure",
          "Not likely"
        ]
      },
      {
        question: "What activity would you most enjoy right now?",
        options: [
          "Dancing",
          "Calling friends",
          "Creating art",
          "Relaxing alone"
        ]
      },
      {
        question: "How energetic do you feel?",
        options: [
          "Very energetic",
          "Moderately energetic",
          "Slightly energetic",
          "Not very energetic"
        ]
      }
    ],
    sad: [
      {
        question: "What would help you feel better right now?",
        options: [
          "Talking to someone",
          "Being alone",
          "Physical activity",
          "Creative expression"
        ]
      },
      {
        question: "How do you prefer to process your emotions?",
        options: [
          "Writing",
          "Meditation",
          "Exercise",
          "Music"
        ]
      },
      {
        question: "What type of support would be most helpful?",
        options: [
          "Friend's company",
          "Professional guidance",
          "Self-reflection time",
          "Physical activity"
        ]
      }
    ],
    neutral: [
      {
        question: "What would you like to accomplish today?",
        options: [
          "Learn something new",
          "Complete tasks",
          "Relax and recharge",
          "Connect with others"
        ]
      },
      {
        question: "How would you like to spend your energy?",
        options: [
          "Productive tasks",
          "Creative projects",
          "Social activities",
          "Personal development"
        ]
      },
      {
        question: "What would make your day better?",
        options: [
          "Achievement",
          "Connection",
          "Relaxation",
          "Adventure"
        ]
      }
    ],
    excited: [
      {
        question: "How would you like to channel your excitement?",
        options: [
          "Physical activity",
          "Creative projects",
          "Social interaction",
          "Goal pursuit"
        ]
      },
      {
        question: "What type of activity appeals to you most?",
        options: [
          "High-energy exercise",
          "Creative expression",
          "Social gathering",
          "Learning something new"
        ]
      },
      {
        question: "How would you like to share your energy?",
        options: [
          "Group activities",
          "Individual pursuits",
          "Helping others",
          "Creative projects"
        ]
      }
    ],
    tired: [
      {
        question: "What type of rest do you need most?",
        options: [
          "Physical rest",
          "Mental rest",
          "Emotional rest",
          "Social rest"
        ]
      },
      {
        question: "What would help you recharge?",
        options: [
          "Quiet time alone",
          "Gentle movement",
          "Nature sounds",
          "Light socializing"
        ]
      },
      {
        question: "What activity feels most manageable?",
        options: [
          "Meditation",
          "Gentle stretching",
          "Reading",
          "Listening to music"
        ]
      }
    ]
  };

  const currentMoodQuestions = questions[mood as keyof typeof questions] || [];

  const handleAnswer = (optionIndex: number) => {
    const points = 3 - optionIndex;
    setScore(score + points);
    
    if (currentQuestion < currentMoodQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  if (showResults) {
    const maxScore = currentMoodQuestions.length * 3;
    const percentage = (score / maxScore) * 100;
    
    return (
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Quiz Results</h3>
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-purple-600 h-4 rounded-full"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-gray-600">
            {percentage >= 75
              ? "You're making great choices for your current mood!"
              : percentage >= 50
              ? "You're on the right track with managing your mood."
              : "Consider trying some of our recommended activities to boost your mood."}
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          ← Back to Activities
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Question {currentQuestion + 1} of {currentMoodQuestions.length}
        </h3>
        <p className="text-gray-600">{currentMoodQuestions[currentQuestion].question}</p>
      </div>

      <div className="space-y-4">
        {currentMoodQuestions[currentQuestion].options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            className="w-full p-4 text-left rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={onBack}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          ← Back to Activities
        </button>
      </div>
    </div>
  );
}
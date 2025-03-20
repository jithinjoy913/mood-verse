import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';
import { Camera, RefreshCw, Music, Film, Activity, ArrowRight } from 'lucide-react';

export function MoodAnalyzer() {
  const webcamRef = useRef<Webcam>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<faceDetection.FaceDetector | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        await tf.setBackend('webgl');
        
        const detector = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          { 
            runtime: 'tfjs',
            modelType: 'short'
          }
        );
        setModel(detector);
      } catch (err) {
        console.error('Error loading face detection model:', err);
        setError('Failed to load face detection model. Please refresh the page.');
      }
    };

    loadModel();

    return () => {
      if (model) {
        tf.dispose();
      }
    };
  }, []);

  const capture = useCallback(async () => {
    if (!webcamRef.current || !model) return;

    setAnalyzing(true);
    setError(null);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image from webcam');
      }

      const img = new Image();
      img.src = imageSrc;
      await img.decode();
      
      const faces = await model.detectFaces(img);
      
      if (faces.length > 0) {
        const moods = ['happy', 'sad', 'neutral', 'excited', 'tired'];
        const detectedMood = moods[Math.floor(Math.random() * moods.length)];
        setMood(detectedMood);
        setShowRecommendations(true);
      } else {
        setError('No face detected. Please ensure your face is visible in the camera.');
      }
    } catch (error) {
      console.error('Error analyzing mood:', error);
      setError('Failed to analyze mood. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [model]);

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
    return <RecommendationsPage mood={mood} onReset={() => {
      setShowRecommendations(false);
      setMood(null);
    }} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="relative">
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="w-full rounded-lg shadow-lg"
          mirrored={true}
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: "user"
          }}
        />
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 space-x-4">
          <button
            onClick={capture}
            disabled={analyzing || !model}
            className="bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : !model ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading model...</span>
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span>Capture Mood</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RecommendationsPageProps {
  mood: string;
  onReset: () => void;
}

function RecommendationsPage({ mood, onReset }: RecommendationsPageProps) {
  const [activeTab, setActiveTab] = useState<'music' | 'movies' | 'activities'>('music');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Your Mood: <span className="text-purple-600 capitalize">{mood}</span></h2>
          <p className="text-gray-600 mt-2">Here are some personalized recommendations for you</p>
        </div>

        <div className="flex justify-center space-x-4 mb-8">
          <TabButton
            active={activeTab === 'music'}
            onClick={() => setActiveTab('music')}
            icon={<Music className="h-5 w-5" />}
            label="Music"
          />
          <TabButton
            active={activeTab === 'movies'}
            onClick={() => setActiveTab('movies')}
            icon={<Film className="h-5 w-5" />}
            label="Movies"
          />
          <TabButton
            active={activeTab === 'activities'}
            onClick={() => setActiveTab('activities')}
            icon={<Activity className="h-5 w-5" />}
            label="Activities"
          />
        </div>

        <div className="mt-8">
          {activeTab === 'music' && <MusicRecommendations mood={mood} />}
          {activeTab === 'movies' && <MovieRecommendations mood={mood} />}
          {activeTab === 'activities' && <ActivityRecommendations mood={mood} />}
        </div>

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
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
        active
          ? 'bg-purple-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MusicRecommendations({ mood }: { mood: string }) {
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

  const moodRecs = recommendations[mood as keyof typeof recommendations] || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {moodRecs.map((rec, index) => (
        <a
          key={index}
          href={rec.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{rec.title}</h3>
          <p className="text-gray-600 mb-4">{rec.description}</p>
          <div className="flex items-center text-purple-600">
            <span className="font-medium">Listen on {rec.platform}</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </div>
        </a>
      ))}
    </div>
  );
}

function MovieRecommendations({ mood }: { mood: string }) {
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

  const moodRecs = recommendations[mood as keyof typeof recommendations] || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {moodRecs.map((movie, index) => (
        <a
          key={index}
          href={movie.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{movie.title}</h3>
          <p className="text-purple-600 text-sm mb-2">{movie.genre}</p>
          <p className="text-gray-600 mb-4">{movie.description}</p>
          <div className="flex items-center text-purple-600">
            <span className="font-medium">Watch Now</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </div>
        </a>
      ))}
    </div>
  );
}

function ActivityRecommendations({ mood }: { mood: string }) {
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

  const moodRecs = recommendations[mood as keyof typeof recommendations] || [];

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
  mood: string;
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
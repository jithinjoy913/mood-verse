export type AppMood = 'happy' | 'sad' | 'neutral' | 'excited' | 'tired';

export interface MusicRecommendation {
  title: string;
  description: string;
  link: string;
  platform: string;
}

export interface MovieRecommendation {
  title: string;
  genre: string;
  description: string;
  link: string;
}

type MovieSource = 'tmdb' | 'local';
type MusicSource = 'itunes' | 'local';

const FALLBACK_MUSIC: Record<AppMood, MusicRecommendation[]> = {
  happy: [
    {
      title: 'Bollywood Party Hits',
      description: 'Upbeat Bollywood songs to keep you dancing',
      link: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM',
      platform: 'Spotify'
    },
    {
      title: 'Punjabi Beats',
      description: 'High-energy Punjabi music',
      link: 'https://www.youtube.com/playlist?list=PLvlw_ICcAI4c7xX_Y_8RtGYr1wHgY6ZO3',
      platform: 'YouTube'
    }
  ],
  sad: [
    {
      title: 'Soulful Hindi Melodies',
      description: 'Emotional and touching Bollywood songs',
      link: 'https://open.spotify.com/playlist/37i9dQZF1DX6cg4h2PoN9y',
      platform: 'Spotify'
    },
    {
      title: 'Classical Indian Music',
      description: 'Calming ragas and classical pieces',
      link: 'https://www.youtube.com/playlist?list=PLvlw_ICcAI4d_f-E-YuRRvY1KpJ1EW1w1',
      platform: 'YouTube'
    }
  ],
  neutral: [
    {
      title: 'Indie India',
      description: 'Contemporary Indian indie artists',
      link: 'https://open.spotify.com/playlist/37i9dQZF1DX5q67ZpWyRrZ',
      platform: 'Spotify'
    },
    {
      title: 'Sufi & Folk',
      description: 'Soulful Sufi and folk music',
      link: 'https://www.youtube.com/playlist?list=PLvlw_ICcAI4f_oQPv7Y-lUJBXWXz4qgBd',
      platform: 'YouTube'
    }
  ],
  excited: [
    {
      title: 'Desi EDM Mix',
      description: 'Indian fusion with electronic beats',
      link: 'https://open.spotify.com/playlist/37i9dQZF1DX7ZUug1ANKRP',
      platform: 'Spotify'
    },
    {
      title: 'Bollywood Workout',
      description: 'High-energy Bollywood hits for exercise',
      link: 'https://www.youtube.com/playlist?list=PLvlw_ICcAI4e_sG8Y-4s-tXH-xXz4qgBl',
      platform: 'YouTube'
    }
  ],
  tired: [
    {
      title: 'Peaceful Sanskrit Chants',
      description: 'Calming mantras and spiritual music',
      link: 'https://open.spotify.com/playlist/37i9dQZF1DWZd79rJ6a7lp',
      platform: 'Spotify'
    },
    {
      title: 'Indian Instrumental',
      description: 'Soothing instrumental versions of Indian classics',
      link: 'https://www.youtube.com/playlist?list=PLvlw_ICcAI4c_f-E-YuRRvY1KpJ1EW1w1',
      platform: 'YouTube'
    }
  ]
};

const FALLBACK_MOVIES: Record<AppMood, MovieRecommendation[]> = {
  happy: [
    {
      title: '3 Idiots',
      genre: 'Comedy, Drama',
      description: 'A heartwarming tale of friendship and following your dreams',
      link: 'https://www.themoviedb.org/search?query=3%20Idiots'
    },
    {
      title: 'Zindagi Na Milegi Dobara',
      genre: 'Adventure, Comedy, Drama',
      description: 'A joyful celebration of life and friendship',
      link: 'https://www.themoviedb.org/search?query=Zindagi%20Na%20Milegi%20Dobara'
    }
  ],
  sad: [
    {
      title: 'Taare Zameen Par',
      genre: 'Drama, Family',
      description: 'An emotional journey of a child and his teacher',
      link: 'https://www.themoviedb.org/search?query=Taare%20Zameen%20Par'
    },
    {
      title: 'Kal Ho Naa Ho',
      genre: 'Romance, Drama',
      description: 'A touching story about living life to the fullest',
      link: 'https://www.themoviedb.org/search?query=Kal%20Ho%20Naa%20Ho'
    }
  ],
  neutral: [
    {
      title: 'The Lunchbox',
      genre: 'Drama, Romance',
      description: 'A heartwarming story of unexpected connection',
      link: 'https://www.themoviedb.org/search?query=The%20Lunchbox'
    },
    {
      title: 'Piku',
      genre: 'Comedy, Drama',
      description: 'A slice-of-life story about family relationships',
      link: 'https://www.themoviedb.org/search?query=Piku'
    }
  ],
  excited: [
    {
      title: 'Dhoom 3',
      genre: 'Action, Thriller',
      description: 'High-octane action and thrilling sequences',
      link: 'https://www.themoviedb.org/search?query=Dhoom%203'
    },
    {
      title: 'RRR',
      genre: 'Action, Drama',
      description: 'Epic action drama with stunning visuals',
      link: 'https://www.themoviedb.org/search?query=RRR'
    }
  ],
  tired: [
    {
      title: 'Barfi!',
      genre: 'Comedy, Drama, Romance',
      description: 'A heartwarming and peaceful love story',
      link: 'https://www.themoviedb.org/search?query=Barfi'
    },
    {
      title: 'English Vinglish',
      genre: 'Drama, Family',
      description: 'A gentle and inspiring story of self-discovery',
      link: 'https://www.themoviedb.org/search?query=English%20Vinglish'
    }
  ]
};

const MOVIE_GENRE_BY_MOOD: Record<AppMood, string> = {
  happy: '35,10751',
  sad: '18,10749',
  neutral: '18,99',
  excited: '28,12,53',
  tired: '16,14,35'
};

const MUSIC_QUERY_BY_MOOD: Record<AppMood, string> = {
  happy: 'upbeat bollywood hits',
  sad: 'calming hindi songs',
  neutral: 'indie india chill',
  excited: 'desi workout edm',
  tired: 'relaxing indian instrumental'
};

const MOVIE_GENRE_LABELS: Record<number, string> = {
  12: 'Adventure',
  14: 'Fantasy',
  16: 'Animation',
  18: 'Drama',
  28: 'Action',
  35: 'Comedy',
  53: 'Thriller',
  99: 'Documentary',
  10749: 'Romance',
  10751: 'Family'
};

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function uniqueByTitle<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

export async function getMovieRecommendations(
  mood: AppMood
): Promise<{ source: MovieSource; items: MovieRecommendation[] }> {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
  if (!apiKey) {
    return { source: 'local', items: FALLBACK_MOVIES[mood] };
  }

  try {
    const genre = MOVIE_GENRE_BY_MOOD[mood];
    const endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(apiKey)}&language=en-IN&sort_by=popularity.desc&with_genres=${genre}&include_adult=false&vote_count.gte=80&page=1`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`TMDB request failed: ${response.status}`);
    }

    type TmdbMovie = {
      id: number;
      title: string;
      overview: string;
      genre_ids: number[];
    };

    const payload = (await response.json()) as { results?: TmdbMovie[] };
    const items = (payload.results ?? [])
      .filter((movie) => movie.title && movie.overview)
      .slice(0, 8)
      .map<MovieRecommendation>((movie) => {
        const genres = movie.genre_ids
          .map((id) => MOVIE_GENRE_LABELS[id])
          .filter(Boolean)
          .slice(0, 2)
          .join(', ') || 'Popular';

        return {
          title: movie.title,
          genre: genres,
          description: truncate(movie.overview, 120),
          link: `https://www.themoviedb.org/movie/${movie.id}`
        };
      });

    const unique = uniqueByTitle(items).slice(0, 4);
    if (!unique.length) {
      throw new Error('No TMDB movies after filtering');
    }

    return { source: 'tmdb', items: unique };
  } catch {
    return { source: 'local', items: FALLBACK_MOVIES[mood] };
  }
}

export async function getMusicRecommendations(
  mood: AppMood
): Promise<{ source: MusicSource; items: MusicRecommendation[] }> {
  const query = MUSIC_QUERY_BY_MOOD[mood];

  try {
    const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=12`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`iTunes request failed: ${response.status}`);
    }

    type ItunesTrack = {
      trackName?: string;
      artistName?: string;
      primaryGenreName?: string;
      trackViewUrl?: string;
      collectionViewUrl?: string;
    };

    const payload = (await response.json()) as { results?: ItunesTrack[] };
    const items = (payload.results ?? [])
      .filter((track) => track.trackName && (track.trackViewUrl || track.collectionViewUrl))
      .map<MusicRecommendation>((track) => ({
        title: track.trackName ?? 'Trending Track',
        description: `${track.artistName ?? 'Various Artists'}${track.primaryGenreName ? ` • ${track.primaryGenreName}` : ''}`,
        link: track.trackViewUrl ?? track.collectionViewUrl ?? 'https://music.apple.com',
        platform: 'Apple Music'
      }));

    const unique = uniqueByTitle(items).slice(0, 4);
    if (!unique.length) {
      throw new Error('No iTunes tracks after filtering');
    }

    return { source: 'itunes', items: unique };
  } catch {
    return { source: 'local', items: FALLBACK_MUSIC[mood] };
  }
}

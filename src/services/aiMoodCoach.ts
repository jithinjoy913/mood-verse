export type CoachMood = 'happy' | 'sad' | 'neutral' | 'excited' | 'tired';

const FALLBACK_TIPS: Record<CoachMood, string[]> = {
  happy: [
    'Capture this momentum: pick one social activity and one creative task for today.',
    'Use your high mood wisely by starting your most important task in the next 20 minutes.'
  ],
  sad: [
    'Start small: take 3 deep breaths, drink water, and play one calming track.',
    'Pick one gentle action now, such as journaling for 5 minutes or a short walk.'
  ],
  neutral: [
    'Great state for progress. Choose one meaningful task and finish it before switching context.',
    'Use this balanced mood to plan your next 3 hours with one top priority.'
  ],
  excited: [
    'Channel your energy: do a short physical activity, then start a focused goal sprint.',
    'You are energized. Convert excitement into output by finishing one concrete deliverable now.'
  ],
  tired: [
    'Prioritize recovery first: stretch, hydrate, and do one low-effort restorative activity.',
    'Protect your energy by choosing simple, high-value tasks and avoiding multitasking.'
  ]
};

function randomFallback(mood: CoachMood): string {
  const tips = FALLBACK_TIPS[mood];
  return tips[Math.floor(Math.random() * tips.length)];
}

export async function getMoodCoachTip(mood: CoachMood): Promise<{ source: 'local' | 'huggingface'; text: string }> {
  const token = import.meta.env.VITE_HF_API_TOKEN as string | undefined;

  if (!token) {
    return { source: 'local', text: randomFallback(mood) };
  }

  try {
    const prompt = `You are a concise wellness coach. The user mood is ${mood}. Give one practical, supportive suggestion in under 30 words.`;

    const response = await fetch('https://api-inference.huggingface.co/models/google/flan-t5-base', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 80,
          temperature: 0.7,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Hugging Face request failed with ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data[0]?.generated_text) {
      return {
        source: 'huggingface',
        text: String(data[0].generated_text).trim()
      };
    }

    if (typeof data?.generated_text === 'string') {
      return {
        source: 'huggingface',
        text: data.generated_text.trim()
      };
    }

    throw new Error('Unexpected Hugging Face response shape');
  } catch {
    return { source: 'local', text: randomFallback(mood) };
  }
}

export type Emotion = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral'|'fear'|'disgust';

export interface SelfieItem {
  id?: string;
  user_id: string;
  image_url: string;
  emotion: Emotion;
  date: string; // ISO string
}

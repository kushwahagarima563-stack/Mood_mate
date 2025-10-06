export interface EmotionScores {
  happy?: number;
  sad?: number;
  angry?: number;
  surprised?: number;
  fearful?: number;
  disgusted?: number;
  neutral?: number;
  [key: string]: number | undefined;
}

export interface SelfieLog {
  id: string;
  user_id: string;
  image_url: string;
  emotion: string;
  emotion_scores: EmotionScores;
  summary: string;
  created_at: string;
}

export interface EmotionAnalysisResult {
  emotion: string;
  emotion_scores: EmotionScores;
  summary: string;
}

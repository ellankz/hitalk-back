export interface Answer {
  optionIndex: number; // 0–3
  isCorrect: boolean;
  answeredAt: Date;
  timeElapsed: number; // Seconds since question started
  pointsEarned: number; // Calculated points for this answer
}

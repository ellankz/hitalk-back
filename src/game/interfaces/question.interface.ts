export interface Question {
  id: string;
  text: string;
  options: string[]; // Exactly 4 options
  correctOptionIndex: number; // 0–3
  imageUrl?: string; // Optional image URL
}

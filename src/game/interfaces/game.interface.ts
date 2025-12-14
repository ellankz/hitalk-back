import { Question } from './question.interface';
import { Player } from './player.interface';
import { Answer } from './answer.interface';

export type GameState = 'lobby' | 'question' | 'results' | 'finished';

export interface Game {
  id: string; // 6-digit number, serves as room code
  hostSocketId: string;
  title: string;
  questions: Question[];
  currentQuestionIndex: number; // -1 before start
  state: GameState;
  players: Map<string, Player>; // socketId → Player
  answers: Map<string, Answer>; // Current question answers (cleared after each question)
  questionStartedAt?: Date; // Timestamp when current question started
  createdAt: Date;
}

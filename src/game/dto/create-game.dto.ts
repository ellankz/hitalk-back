import { Question } from '../interfaces/question.interface';

export interface CreateGameDto {
  title: string;
  questions: Question[];
}

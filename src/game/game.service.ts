import { Injectable } from '@nestjs/common';
import { Game } from './interfaces/game.interface';
import { Player } from './interfaces/player.interface';
import { Question } from './interfaces/question.interface';
import { Answer } from './interfaces/answer.interface';
import { CreateGameDto } from './dto/create-game.dto';
import { PlayerScore } from './dto/player-score.dto';

@Injectable()
export class GameService {
  private games: Map<string, Game> = new Map();

  /**
   * Generate a random 6-digit room code
   */
  private generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a new game
   */
  createGame(hostSocketId: string, dto: CreateGameDto): Game {
    const roomCode = this.generateRoomCode();

    const game: Game = {
      id: roomCode,
      hostSocketId,
      title: dto.title,
      questions: dto.questions,
      currentQuestionIndex: -1,
      state: 'lobby',
      players: new Map(),
      answers: new Map(),
      createdAt: new Date(),
    };

    // Add host as a player
    const hostPlayer: Player = {
      socketId: hostSocketId,
      nickname: 'Host',
      score: 0,
      isHost: true,
    };
    game.players.set(hostSocketId, hostPlayer);

    this.games.set(roomCode, game);
    return game;
  }

  /**
   * Get game by ID
   */
  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  /**
   * Add player to game
   */
  joinGame(gameId: string, socketId: string, nickname: string): Player | null {
    const game = this.games.get(gameId);
    if (!game || game.state !== 'lobby') {
      return null;
    }

    const player: Player = {
      socketId,
      nickname,
      score: 0,
      isHost: false,
    };

    game.players.set(socketId, player);
    return player;
  }

  /**
   * Get all players in a game
   */
  getPlayers(gameId: string): Player[] {
    const game = this.games.get(gameId);
    if (!game) return [];
    return Array.from(game.players.values());
  }

  /**
   * Start the game and show first question
   */
  startGame(gameId: string): Question | null {
    const game = this.games.get(gameId);
    if (!game || game.state !== 'lobby' || game.questions.length === 0) {
      return null;
    }

    game.state = 'question';
    game.currentQuestionIndex = 0;
    game.questionStartedAt = new Date();
    game.answers.clear();

    return game.questions[0];
  }

  /**
   * Move to next question
   */
  nextQuestion(gameId: string): Question | null {
    const game = this.games.get(gameId);
    if (!game || game.state !== 'results') {
      return null;
    }

    game.currentQuestionIndex++;

    if (game.currentQuestionIndex >= game.questions.length) {
      game.state = 'finished';
      return null;
    }

    game.state = 'question';
    game.questionStartedAt = new Date();
    game.answers.clear();

    return game.questions[game.currentQuestionIndex];
  }

  /**
   * Submit an answer for current question
   */
  submitAnswer(gameId: string, socketId: string, optionIndex: number): boolean {
    const game = this.games.get(gameId);
    if (!game || game.state !== 'question' || !game.questionStartedAt) {
      return false;
    }

    // Check if player already answered
    if (game.answers.has(socketId)) {
      return false;
    }

    const currentQuestion = game.questions[game.currentQuestionIndex];
    const answeredAt = new Date();
    const timeElapsed = (answeredAt.getTime() - game.questionStartedAt.getTime()) / 1000;
    const isCorrect = optionIndex === currentQuestion.correctOptionIndex;

    // Calculate points: max(500, 1000 - (secondsTaken * 10)) for correct answers, 0 for incorrect
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = Math.max(500, 1000 - Math.floor(timeElapsed * 10));
    }

    const answer: Answer = {
      optionIndex,
      isCorrect,
      answeredAt,
      timeElapsed,
      pointsEarned,
    };

    game.answers.set(socketId, answer);

    // Update player score
    const player = game.players.get(socketId);
    if (player) {
      player.score += pointsEarned;
    }

    return true;
  }

  /**
   * Show results for current question
   */
  showResults(gameId: string): {
    correctAnswer: number;
    correctCount: number;
    incorrectCount: number;
    leaderboard: PlayerScore[];
  } | null {
    const game = this.games.get(gameId);
    if (!game || game.state !== 'question') {
      return null;
    }

    game.state = 'results';

    const currentQuestion = game.questions[game.currentQuestionIndex];
    let correctCount = 0;
    let incorrectCount = 0;

    game.answers.forEach((answer) => {
      if (answer.isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const leaderboard: PlayerScore[] = Array.from(game.players.values())
      .filter(p => !p.isHost) // Exclude host from leaderboard
      .map(p => ({ nickname: p.nickname, score: p.score }))
      .sort((a, b) => b.score - a.score);

    return {
      correctAnswer: currentQuestion.correctOptionIndex,
      correctCount,
      incorrectCount,
      leaderboard,
    };
  }

  /**
   * Get final scores for game
   */
  getFinalScores(gameId: string): PlayerScore[] {
    const game = this.games.get(gameId);
    if (!game) return [];

    return Array.from(game.players.values())
      .filter(p => !p.isHost)
      .map(p => ({ nickname: p.nickname, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get game by player socket ID
   */
  findGameBySocket(socketId: string): Game | undefined {
    for (const game of this.games.values()) {
      if (game.players.has(socketId)) {
        return game;
      }
    }
    return undefined;
  }

  /**
   * Remove player from game
   */
  removePlayer(gameId: string, socketId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.players.delete(socketId);
    game.answers.delete(socketId);

    // If host disconnects or no players left, remove game
    if (socketId === game.hostSocketId || game.players.size === 0) {
      this.games.delete(gameId);
    }
  }
}

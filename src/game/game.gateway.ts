import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { JoinGameDto } from './dto/join-game.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@WebSocketGateway({
  cors: {
    origin: '*', // For MVP - in production, specify frontend URL
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Find game and remove player
    const game = this.gameService.findGameBySocket(client.id);
    if (game) {
      this.gameService.removePlayer(game.id, client.id);

      // Notify remaining players
      if (game.state === 'lobby') {
        const players = this.gameService.getPlayers(game.id);
        this.server.to(game.id).emit('player:joined', { players });
      }
    }
  }

  /**
   * Host creates a new game
   */
  @SubscribeMessage('create:game')
  handleCreateGame(
    @MessageBody() dto: CreateGameDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const game = this.gameService.createGame(client.id, dto);

      // Join socket room
      client.join(game.id);

      // Send confirmation to host
      client.emit('game:created', {
        gameId: game.id,
        roomCode: game.id,
      });

      console.log(`Game created: ${game.id} by ${client.id}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to create game' });
    }
  }

  /**
   * Player joins a game
   */
  @SubscribeMessage('join:game')
  handleJoinGame(
    @MessageBody() dto: JoinGameDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const player = this.gameService.joinGame(
        dto.roomCode,
        client.id,
        dto.nickname,
      );

      if (!player) {
        client.emit('error', { message: 'Game not found or already started' });
        return;
      }

      // Join socket room
      client.join(dto.roomCode);

      // Get all players and broadcast to room
      const players = this.gameService.getPlayers(dto.roomCode);
      this.server.to(dto.roomCode).emit('player:joined', { players });

      console.log(`Player ${dto.nickname} joined game ${dto.roomCode}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to join game' });
    }
  }

  /**
   * Host starts the game
   */
  @SubscribeMessage('start:game')
  handleStartGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const game = this.gameService.getGame(data.gameId);

      if (!game) {
        client.emit('error', { message: 'Game not found' });
        return;
      }

      if (game.hostSocketId !== client.id) {
        client.emit('error', { message: 'Only host can start the game' });
        return;
      }

      const question = this.gameService.startGame(data.gameId);

      if (!question) {
        client.emit('error', { message: 'Cannot start game' });
        return;
      }

      // Broadcast to all players in room
      this.server.to(data.gameId).emit('game:started', {
        currentQuestion: question,
        questionNumber: 1,
      });

      console.log(`Game ${data.gameId} started`);
    } catch (error) {
      client.emit('error', { message: 'Failed to start game' });
    }
  }

  /**
   * Host moves to next question
   */
  @SubscribeMessage('next:question')
  handleNextQuestion(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const game = this.gameService.getGame(data.gameId);

      if (!game) {
        client.emit('error', { message: 'Game not found' });
        return;
      }

      if (game.hostSocketId !== client.id) {
        client.emit('error', { message: 'Only host can advance questions' });
        return;
      }

      const question = this.gameService.nextQuestion(data.gameId);

      if (!question) {
        // Game finished
        const finalScores = this.gameService.getFinalScores(data.gameId);
        this.server.to(data.gameId).emit('game:finished', { finalScores });
        console.log(`Game ${data.gameId} finished`);
        return;
      }

      // Broadcast next question
      this.server.to(data.gameId).emit('question:started', {
        question,
        questionNumber: game.currentQuestionIndex + 1,
        totalQuestions: game.questions.length,
      });

      console.log(
        `Game ${data.gameId} - Question ${game.currentQuestionIndex + 1}`,
      );
    } catch (error) {
      client.emit('error', { message: 'Failed to advance question' });
    }
  }

  /**
   * Player submits an answer
   */
  @SubscribeMessage('submit:answer')
  handleSubmitAnswer(
    @MessageBody() dto: SubmitAnswerDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const success = this.gameService.submitAnswer(
        dto.gameId,
        client.id,
        dto.optionIndex,
      );

      if (!success) {
        client.emit('error', {
          message: 'Failed to submit answer or already answered',
        });
        return;
      }

      // Notify host that player answered
      const game = this.gameService.getGame(dto.gameId);
      if (game) {
        this.server.to(game.hostSocketId).emit('answer:submitted', {
          playerId: client.id,
        });
      }

      console.log(`Player ${client.id} answered in game ${dto.gameId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to submit answer' });
    }
  }

  /**
   * Host shows results for current question
   */
  @SubscribeMessage('show:results')
  handleShowResults(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const game = this.gameService.getGame(data.gameId);

      if (!game) {
        client.emit('error', { message: 'Game not found' });
        return;
      }

      if (game.hostSocketId !== client.id) {
        client.emit('error', { message: 'Only host can show results' });
        return;
      }

      const results = this.gameService.showResults(data.gameId);

      if (!results) {
        client.emit('error', { message: 'Cannot show results' });
        return;
      }

      // Broadcast results to all players
      this.server.to(data.gameId).emit('results:question', results);

      console.log(`Results shown for game ${data.gameId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to show results' });
    }
  }
}

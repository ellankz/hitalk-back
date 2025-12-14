# HiTalk Backend

NestJS backend with Socket.IO for real-time quiz game.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run start:dev

# Build
npm run build

# Run production
npm start
```

Server runs on `http://localhost:3000` with WebSocket support.

## Architecture

See [../docs/architecture.md](../docs/architecture.md) for complete system design.

## Project Structure

```
src/
├── game/
│   ├── dto/                    # Data Transfer Objects
│   ├── interfaces/             # TypeScript interfaces
│   ├── game.gateway.ts        # Socket.IO WebSocket gateway
│   ├── game.service.ts        # Game logic and state management
│   └── game.module.ts
├── app.module.ts
└── main.ts
```

## WebSocket Events

### Client → Server
- `create:game` - Host creates new game
- `join:game` - Player joins with room code
- `start:game` - Host starts the game
- `next:question` - Host advances to next question
- `submit:answer` - Player submits answer
- `show:results` - Host reveals results

### Server → Client
- `game:created` - Game creation confirmation
- `player:joined` - Updated player list
- `game:started` - Game begins with first question
- `question:started` - New question displayed
- `answer:submitted` - Player answered notification
- `results:question` - Question results with leaderboard
- `game:finished` - Final scores
- `error` - Error messages

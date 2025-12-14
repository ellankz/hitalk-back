import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true, // Enable CORS at app level
  });

  // Additional CORS configuration for Socket.IO
  app.enableCors({
    origin: '*', // For MVP - in production, specify frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // Bind to 0.0.0.0 for Render.io

  console.log(`🚀 Server is running on port: ${port}`);
  console.log(`🔌 WebSocket server is ready`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Server URL: http://0.0.0.0:${port}`);
}

bootstrap();

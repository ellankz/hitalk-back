import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: '*', // For MVP - in production, specify frontend URL
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // Bind to 0.0.0.0 for Render.io

  console.log(`🚀 Server is running on port: ${port}`);
  console.log(`🔌 WebSocket server is ready`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();

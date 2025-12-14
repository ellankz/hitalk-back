import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'HiTalk Backend is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealthCheck() {
    return {
      status: 'ok',
      message: 'HiTalk Backend is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}

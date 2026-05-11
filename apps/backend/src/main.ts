import { NestFactory } from '@nestjs/core';
import { AppSelfHostModule } from './app.selfhost.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SettingsService } from './settings/settings.service.js';

async function bootstrap() {
  const RootModule = AppSelfHostModule;

  const app = await NestFactory.create(RootModule, {
    logger: ['error', 'warn'],
    rawBody: true,
  });

  const frontendPort = process.env.FRONTEND_PORT ?? '4200';
  const nginxPort = process.env.NGINX_PORT ?? '8080';
  const backendBindPort = process.env.BACKEND_BIND_PORT ?? '3000';

  // Enable CORS
  app.enableCors({
    origin: [
      `http://localhost:${frontendPort}`,
      `http://localhost:${nginxPort}`,
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Delivreel')
    .setDescription('Video collaboration platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Create default admin user after database is ready
  const dataSource = app.get(DataSource);
  // await createDefaultAdmin(dataSource);

  const settingsService = app.get(SettingsService);
  await settingsService.assertBootConfiguration();

  await app.listen(Number(backendBindPort), '0.0.0.0');
  console.log(`🚀 Delivreel is running on port : ${backendBindPort}`);
}

// async function createDefaultAdmin(dataSource: DataSource) {
//   try {
//     const userRepository = dataSource.getRepository('User');
    
//     // Check if admin user already exists
//     const existingAdmin = await userRepository.findOne({
//       where: { email: 'admin@delivreel.com' }
//     });

//     if (!existingAdmin) {
//       const hashedPassword = await bcrypt.hash('admin123', 10);
      
//       await userRepository.save({
//         name: 'System Administrator',
//         email: 'admin@delivreel.com',
//         password: hashedPassword,
//         role: 'admin',
//         isActive: true,
//       });
      
//       console.log('✅ Default admin user created: admin@delivreel.com / admin123');
//     } else {
//       console.log('✅ Admin user already exists');
//     }
//   } catch (error) {
//     console.error('❌ Error creating default admin user:', error);
//   }
// }

bootstrap();

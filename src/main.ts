import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    // class-validator 를 사용하기 위해 적용
    new ValidationPipe({
      whitelist: true, // 데코레이터가 없는 속성은 제거
      forbidNonWhitelisted: true,
      // transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

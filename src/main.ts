import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        // logger: ['warn']
    });

    app.enableVersioning({
        type: VersioningType.URI
        // defaultVersion: '1' // ['1', '2'] : 리스트도 가능
    });
    // app.setGlobalPrefix('v1');

    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
    app.useGlobalPipes(
        // class-validator 를 사용하기 위해 적용
        new ValidationPipe({
            whitelist: true, // 데코레이터가 없는 속성은 제거
            forbidNonWhitelisted: true,
            // transform: true,
            transformOptions: {
                enableImplicitConversion: true // dto 의 타입에 맞게 자동으로 타입 변경
            }
        })
    );
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { Environment } from "./config/environment";

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService<Environment, true>);

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: config.get("WEB_ORIGIN", { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  if (config.get("SWAGGER_ENABLED", { infer: true })) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("API")
      .setDescription("REST API documentation")
      .setVersion("1.0")
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup("docs", app, document, {
      jsonDocumentUrl: "docs-json",
    });
  }
}

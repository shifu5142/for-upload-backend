import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { Environment } from "./config/environment";

function isAllowedWebOrigin(origin: string | undefined, webOrigin: string) {
  if (!origin || origin === webOrigin) return true;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.hostname.startsWith("for-upload-frontend") &&
      url.hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService<Environment, true>);

  app.setGlobalPrefix("api/v1");
  const webOrigin = config.get("WEB_ORIGIN", { infer: true });
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean | string) => void,
    ) => {
      if (isAllowedWebOrigin(origin, webOrigin)) {
        callback(null, origin ?? webOrigin);
        return;
      }
      callback(null, false);
    },
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

import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApplication } from "./app.setup";
import type { Environment } from "./config/environment";
const PORT = process.env.PORT || 5000;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);

  const config = app.get(ConfigService<Environment, true>);
  await app.listen(PORT);
}

void bootstrap();

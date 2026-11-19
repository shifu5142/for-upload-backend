import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApplication } from "./app.setup";
import type { Environment } from "./config/environment";
const PORT = Number(process.env.PORT) || 5000;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);

  const config = app.get(ConfigService<Environment, true>);
  await app.listen(PORT, "0.0.0.0");
}

void bootstrap();

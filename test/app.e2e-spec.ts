import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApplication } from '../src/app.setup';
import { DatabaseService } from '../src/db/database.service';

describe('API smoke checks', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ db: null })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('GET /api/v1/health returns service health', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({ service: 'api', status: 'ok' });
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  it('publishes the health endpoint in OpenAPI', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(response.body.paths).toHaveProperty('/api/v1/health');
    expect(response.body.paths).toHaveProperty('/api/v1/health/database');
  });

  it('returns 503 for the database check when the database is not configured', async () => {
    await request(app.getHttpServer()).post('/api/v1/health/database').expect(503);
  });

  afterAll(async () => {
    await app?.close();
  });
});

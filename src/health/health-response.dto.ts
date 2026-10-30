import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ enum: ['api'], example: 'api' })
  service!: 'api';

  @ApiProperty({ example: '2026-09-08T12:00:00.000Z', format: 'date-time' })
  timestamp!: string;
}

export class DatabaseHealthResponseDto {
  @ApiProperty({ example: '019c53fc-35e6-7000-8000-000000000000', format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: '2026-09-08T12:00:00.000Z', format: 'date-time' })
  timestamp!: string;
}

import { relations } from 'drizzle-orm';
import { healthLogs } from './schema';

export const healthLogsRelations = relations(healthLogs, () => ({}));

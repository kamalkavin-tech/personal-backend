import { createApp } from './main';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverless from 'serverless-http';

const expressApp = express();

void createApp(new ExpressAdapter(expressApp)).catch((error) => {
  console.error('Failed to initialize Nest application:', error);
});

const handler = serverless(expressApp);

export default handler;

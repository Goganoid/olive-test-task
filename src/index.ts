import { createServer } from './server/server';
import { Route, RouteConfig } from './server/types';
import { z } from 'zod';
const routeConfig: RouteConfig = {
  routes: [
    new Route('/api/hello', 'GET', async () => {
      return {
        statusCode: 200,
        body: {
          message: 'Hello, world!',
        },
      };
    }),
    new Route(
      '/api/hello/:name',
      'GET',
      async (req) => {
        return {
          statusCode: 200,
          body: {
            message: `Hello ${req.params.name}!`,
          },
        };
      },
      {
        params: z.object({
          name: z.string(),
        }),
      },
    ),
  ],
};

// Create and start the server
const server = createServer(routeConfig);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Shutting down...');
  server.close(() => {
    console.log('Server closed.');
  });
});

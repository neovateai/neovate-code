import { FastifyPluginAsync } from 'fastify';
import { CreateServerOpts } from '../types';
import { ApiResponse, BrowserAppData } from '../types';

const appDataRoute: FastifyPluginAsync<CreateServerOpts> = async (
  app,
  opts,
) => {
  app.get('/app-data', async (request, reply) => {
    const res: ApiResponse<BrowserAppData> = {
      success: true,
      data: opts.appData,
    };
    reply.send(res);
  });
};

export default appDataRoute;

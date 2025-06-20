interface Config {
  port: number;
  host: string;
  logger: {
    level: string;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '1024'),
  host: process.env.HOST || '0.0.0.0',
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;

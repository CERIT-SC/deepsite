import { NextAuthRequest } from 'next-auth';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      ),
  transports: [
    new transports.Console(),
  ],
});

export function getLogger(request: NextAuthRequest) {
  const route = request.nextUrl.pathname;
  const method = request.method;
  
  const baseMeta = { method, route };
  
  if (request.auth) {
    const session = request.auth;
    const username = session.user?.name;
    return logger.child({ ...baseMeta, username });
  }
  
  return logger.child(baseMeta);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logInfo = (request: NextAuthRequest, message: string, meta?: any) => {
  const logger = getLogger(request);
  logger.info(message, meta);
};

export default logger;

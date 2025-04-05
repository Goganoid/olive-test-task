const prefixLogger = (prefix: string) => {
  return (message?: any, ...optionalParams: any[]) => {
    console.log(prefix, message, ...optionalParams);
  };
};

export const logger = {
  log: prefixLogger('[INFO]'),
  info: prefixLogger('[INFO]'),
  error: prefixLogger('[ERROR]'),
  warn: prefixLogger('[WARN]'),
  debug: prefixLogger('[DEBUG]'),
};

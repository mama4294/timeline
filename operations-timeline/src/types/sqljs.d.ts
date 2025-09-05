declare module 'sql.js' {
  type SqlJsStatic = {
    Database: new (data?: Uint8Array) => any;
  };
  type InitConfig = {
    locateFile?: (file: string) => string;
  };
  const initSqlJs: (config?: InitConfig) => Promise<SqlJsStatic>;
  export default initSqlJs;
}

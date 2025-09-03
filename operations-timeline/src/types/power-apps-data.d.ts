declare module '@microsoft/power-apps/data' {
  export type IOperationResult<T = any> = { data?: T; status?: number; error?: any };
  export interface IPowerClient {
    createRecordAsync<TIn = any, TOut = any>(dataSource: string, record: TIn): Promise<IOperationResult<TOut>>;
    updateRecordAsync<TIn = any, TOut = any>(dataSource: string, id: string, record: TIn): Promise<IOperationResult<TOut>>;
    deleteRecordAsync(dataSource: string, id: string): Promise<IOperationResult<void>>;
  // accept an options object for retrieve (generated code passes IGetOptions / IGetAllOptions)
  retrieveRecordAsync<TOut = any>(dataSource: string, id: string, options?: any): Promise<IOperationResult<TOut>>;
  // retrieveMultiple should return an operation result that wraps an array of items
  retrieveMultipleRecordsAsync<TOut = any>(dataSource: string, query?: any): Promise<IOperationResult<TOut[]>>;
  }

  export function getClient(_dataSourcesInfo?: any): IPowerClient;
}

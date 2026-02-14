export interface ApiError {
  statusCode: number;
  message: string;
  error?: any;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T> {
  users: T[];
  total: number;
  page: number;
  limit: number;
}

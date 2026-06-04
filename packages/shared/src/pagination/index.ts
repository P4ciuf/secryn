/**
 * Generic wrapper for paginated API responses.
 *
 * @template T - The type of each item in the data array
 *
 * @property data - The current page of items
 * @property total - Total number of items across all pages
 * @property page - Current page number (1-indexed)
 * @property pageSize - Maximum number of items per page
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

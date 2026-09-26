import { z } from 'zod';
import {
  booleanQuery,
  dateOnly,
  OPERATION_TYPES,
  optionalEnum,
  optionalId,
  pagination,
  searchText,
  statusList,
} from '../../utils/validators.js';

/** Filters shared by GET /api/operations and GET /api/adjustments. */
export const listQuerySchema = z.object({
  type: optionalEnum(OPERATION_TYPES),
  status: statusList,
  warehouseId: optionalId,
  locationId: optionalId,
  categoryId: optionalId,
  productId: optionalId,
  search: searchText,
  dateFrom: dateOnly,
  dateTo: dateOnly,
  late: booleanQuery,
  sort: optionalEnum(['created', 'scheduled']),
  ...pagination,
});

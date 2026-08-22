const { z } = require('zod');

const ListShopsQueryParams = z.object({
  search: z.coerce.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional()
});

console.log(ListShopsQueryParams.safeParse({}));
console.log(ListShopsQueryParams.safeParse({ search: undefined }));
console.log(ListShopsQueryParams.safeParse({ search: "" }));

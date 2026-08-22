import { z } from 'zod';
console.log("page:", z.coerce.number().optional().safeParse(undefined));
console.log("limit:", z.coerce.number().optional().safeParse(undefined));
console.log("empty string:", z.coerce.number().optional().safeParse(""));

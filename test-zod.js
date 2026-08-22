const { z } = require('zod');
console.log(z.coerce.string().optional().safeParse(undefined).data);
console.log(z.coerce.number().optional().safeParse(undefined).data);
console.log(z.coerce.string().optional().safeParse(null).data);

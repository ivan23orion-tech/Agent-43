import { PrismaClient } from '@prisma/client';

// Ensure the PrismaClient is instantiated only once during the
// hot reload cycles in development. Otherwise a new client
// would be created on every API call and exceed the database
// connection limit.
let globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

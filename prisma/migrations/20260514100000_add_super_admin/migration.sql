-- Add SUPER_ADMIN to Role enum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- Make schoolId nullable on users (SUPER_ADMIN has no school)
ALTER TABLE "users" ALTER COLUMN "schoolId" DROP NOT NULL;

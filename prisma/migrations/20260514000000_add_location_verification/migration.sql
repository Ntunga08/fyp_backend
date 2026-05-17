-- CreateEnum
CREATE TYPE "LocationVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "allowed_locations" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMetres" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowed_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_verifications" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "allowedLocationId" INTEGER,
    "submittedLat" DOUBLE PRECISION,
    "submittedLng" DOUBLE PRECISION,
    "distanceMetres" DOUBLE PRECISION,
    "status" "LocationVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_verifications_lessonId_key" ON "location_verifications"("lessonId");

-- AddForeignKey
ALTER TABLE "location_verifications" ADD CONSTRAINT "location_verifications_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_verifications" ADD CONSTRAINT "location_verifications_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_verifications" ADD CONSTRAINT "location_verifications_allowedLocationId_fkey" FOREIGN KEY ("allowedLocationId") REFERENCES "allowed_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

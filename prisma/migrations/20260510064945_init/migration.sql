-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TEACHER', 'PRINCIPAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "Day" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('CONDUCTED', 'MISSED', 'SUBSTITUTED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateEnum
CREATE TYPE "FaceVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "day" "Day" NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "timeIn" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "timetableId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'CONDUCTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substitutes" (
    "id" SERIAL NOT NULL,
    "originalTeacherId" INTEGER NOT NULL,
    "substituteTeacherId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "substitutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_verifications" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "status" "FaceVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_teacherId_date_key" ON "attendance"("teacherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_timetableId_date_key" ON "lessons"("timetableId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "substitutes_lessonId_key" ON "substitutes"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "face_verifications_lessonId_key" ON "face_verifications"("lessonId");

-- AddForeignKey
ALTER TABLE "timetable" ADD CONSTRAINT "timetable_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutes" ADD CONSTRAINT "substitutes_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutes" ADD CONSTRAINT "substitutes_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutes" ADD CONSTRAINT "substitutes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_verifications" ADD CONSTRAINT "face_verifications_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_verifications" ADD CONSTRAINT "face_verifications_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

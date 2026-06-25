-- Add email field to User table

-- Add email field
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

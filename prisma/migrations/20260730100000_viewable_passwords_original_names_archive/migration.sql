-- Client-facing archive, uploaded by the admin rather than generated.
ALTER TABLE "Project" ADD COLUMN "archiveName" TEXT;
ALTER TABLE "Project" ADD COLUMN "archiveSize" INTEGER;

-- Photos keep the name they were uploaded under.
ALTER TABLE "Photo" ADD COLUMN "originalName" TEXT;

-- Existing rows predate original names; fall back to the on-disk filename so the
-- column can be made required.
UPDATE "Photo" SET "originalName" = "filename" WHERE "originalName" IS NULL;

ALTER TABLE "Photo" ALTER COLUMN "originalName" SET NOT NULL;

CREATE UNIQUE INDEX "Photo_projectId_originalName_key" ON "Photo"("projectId", "originalName");

-- Gallery passwords move from bcrypt hashes to AES-256-GCM ciphertext so the
-- photographer can read them back. Old hashes cannot be decrypted, so they are
-- cleared and must be set again.
UPDATE "Project" SET "password" = NULL WHERE "password" IS NOT NULL;

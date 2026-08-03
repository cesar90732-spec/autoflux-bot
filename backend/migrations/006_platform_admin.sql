-- 006_platform_admin.sql
-- Resolve a limitação apontada na Etapa 5: como o banco é compartilhado
-- entre todas as empresas do SaaS, backups não podem ficar acessíveis a
-- qualquer admin de empresa cliente. is_platform_admin é uma flag
-- independente do "role" (que continua só 'admin'/'employee', com
-- significado por empresa) — só é ativada manualmente via
-- scripts/grant-platform-admin.js, nunca por cadastro/UI.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

// scripts/grant-platform-admin.js
// Concede (ou revoga) o papel de administrador de plataforma a um
// usuário, direto no banco — deliberadamente sem rota HTTP, para que
// essa permissão (acesso a backups com dados de todas as empresas do
// SaaS) nunca possa ser autoconcedida por ninguém através do painel.
//
// Uso:
//   node scripts/grant-platform-admin.js email@empresa.com          (concede)
//   node scripts/grant-platform-admin.js email@empresa.com --revoke (revoga)

require('dotenv').config();
const userModel = require('../src/models/user.model');
const { pool } = require('../src/config/db');

async function main() {
  const [email, flag] = process.argv.slice(2);

  if (!email) {
    console.error('Uso: node scripts/grant-platform-admin.js email@empresa.com [--revoke]');
    process.exit(1);
  }

  const isPlatformAdmin = flag !== '--revoke';
  const user = await userModel.setPlatformAdmin(email, isPlatformAdmin);

  if (!user) {
    console.error(`Nenhum usuário encontrado com o e-mail "${email}".`);
    process.exit(1);
  }

  console.log(
    `${user.name} (${user.email}) agora ${isPlatformAdmin ? 'É' : 'NÃO é mais'} administrador de plataforma.`
  );
  console.log('O usuário precisa fazer login novamente para o novo token refletir essa mudança.');
  await pool.end();
}

main().catch((err) => {
  console.error(`Falha ao executar o script: ${err.message}`);
  process.exit(1);
});

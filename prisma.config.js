const path = require('node:path');
const fs = require('node:fs');

// Charger les variables d'environnement depuis le fichier .env si non définies
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && !process.env.DATABASE_URL) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const matched = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (matched) {
      const key = matched[1];
      let value = matched[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  }
}

module.exports = {
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    seed: process.env.NODE_ENV === 'production' ? 'node prisma/seed.js' : 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
};

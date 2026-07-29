import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

async function updateDb(connectionString: string, label: string) {
  console.log(`Connecting to ${label}...`)
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10000,
  })

  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const result = await prisma.groupe.updateMany({
      data: {
        tempsFacture: 60,
      },
    })
    console.log(`SUCCESS [${label}]: ${result.count} groupes mis à jour avec tempsFacture = 60.`)
    return true
  } catch (error) {
    console.error(`ERROR [${label}]:`, error)
    return false
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

async function main() {
  const prodUrl1 = 'postgresql://postgres.nlrwhuisfyexuzjsvlgz:TritonNewSite84%23@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'
  const prodUrl2 = 'postgresql://postgres.nlrwhuisfyexuzjsvlgz:TritonNewSite84%23@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'
  const prodUrl3 = 'postgresql://postgres:TritonNewSite84%23@db.nlrwhuisfyexuzjsvlgz.supabase.co:5432/postgres'
  const localUrl = 'postgresql://postgres:TritonNewSite84@localhost:5432/postgres'

  console.log('--- Mise à jour des groupes (tempsFacture = 60) ---')
  
  let success = await updateDb(prodUrl1, 'SUPABASE PROD (Pooler 6543)')
  if (!success) {
    success = await updateDb(prodUrl2, 'SUPABASE PROD (Pooler 5432)')
  }
  if (!success) {
    success = await updateDb(prodUrl3, 'SUPABASE PROD (Direct 5432)')
  }
  
  await updateDb(localUrl, 'LOCAL POSTGRES')
}

main().catch(console.error)

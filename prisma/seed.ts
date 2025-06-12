import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.contact.deleteMany();

  // === CASE 1 ===
  const docBrown = await prisma.contact.create({
    data: {
      email: 'docbrown@hillvalley.edu',
      phoneNumber: '9999999999',
      linkPrecedence: 'PRIMARY',
    },
  });

  // === CASE 2 ===
  await prisma.contact.create({
    data: {
      email: 'brownie@hillvalley.edu',
      phoneNumber: '9999999999',
      linkPrecedence: 'SECONDARY',
      linkedId: docBrown.id,
    },
  });

  // === CASE 4 (two primaries, merged on identify request) ===
  const george = await prisma.contact.create({
    data: {
      email: 'george@hillvalley.edu',
      phoneNumber: '919191',
      linkPrecedence: 'PRIMARY',
    },
  });

  await prisma.contact.create({
    data: {
      email: 'biff@hillvalley.edu',
      phoneNumber: '717171',
      linkPrecedence: 'PRIMARY',
    },
  });

  // === CASE 6 === (Already linked secondary reused)
  await prisma.contact.create({
    data: {
      email: 'reused@hillvalley.edu',
      phoneNumber: '8888888888',
      linkPrecedence: 'PRIMARY',
    },
  });

  console.log('Seed data inserted successfully.');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

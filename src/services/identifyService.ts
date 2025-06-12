import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const handleIdentify = async ({ email, phoneNumber }: { email?: string; phoneNumber?: string; }) => {
  if (!email && !phoneNumber) throw new Error("Email or phoneNumber is required");

  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined },
      ]
    }
  });

  if (contacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: { email, phoneNumber, linkPrecedence: 'PRIMARY' }
    });
    return {
      primaryContatctId: newContact.id,
      emails: [newContact.email].filter(Boolean),
      phoneNumbers: [newContact.phoneNumber].filter(Boolean),
      secondaryContactIds: []
    };
  }

  const contactGroup = await findAllRelatedContacts(contacts);

  contactGroup.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const primary = contactGroup.find(c => c.linkPrecedence === 'PRIMARY') || contactGroup[0];

  const hasNewEmail = email && !contactGroup.some(c => c.email === email);
  const hasNewPhone = phoneNumber && !contactGroup.some(c => c.phoneNumber === phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'SECONDARY',
        linkedId: primary.id
      }
    });
  }

  const finalGroup = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id }
      ]
    }
  });

  const emails = Array.from(new Set(finalGroup.map(c => c.email).filter(Boolean)));
  const phones = Array.from(new Set(finalGroup.map(c => c.phoneNumber).filter(Boolean)));
  const secondaryIds = finalGroup.filter(c => c.linkPrecedence === 'SECONDARY').map(c => c.id);

  return {
    primaryContatctId: primary.id,
    emails: [primary.email, ...emails.filter(e => e !== primary.email)],
    phoneNumbers: [primary.phoneNumber, ...phones.filter(p => p !== primary.phoneNumber)],
    secondaryContactIds: secondaryIds
  };
};

const findAllRelatedContacts = async (initialContacts: any[]) => {
  const visited = new Set<number>();
  const allContacts = [...initialContacts];
  const queue = [...initialContacts];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const linked = await prisma.contact.findMany({
      where: {
        OR: [
          { email: current.email },
          { phoneNumber: current.phoneNumber }
        ],
        NOT: { id: current.id }
      }
    });

    for (const c of linked) {
      if (!visited.has(c.id)) {
        queue.push(c);
        allContacts.push(c);
      }
    }
  }

  return allContacts;
};

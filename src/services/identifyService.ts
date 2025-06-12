import { PrismaClient, Contact } from '@prisma/client';

const prisma = new PrismaClient();

export const handleIdentify = async ({
    email,
    phoneNumber
}: {
    email?: string;
    phoneNumber?: string;
}) => {
    if (!email && !phoneNumber) {
        throw new Error("Email or phoneNumber is required");
    }

    const matchingContacts = await prisma.contact.findMany({
        where: {
            OR: [
                email ? { email } : undefined,
                phoneNumber ? { phoneNumber } : undefined
            ].filter(Boolean) as any
        }
    });

    if (matchingContacts.length === 0) {
        const newContact = await prisma.contact.create({
            data: {
                email,
                phoneNumber,
                linkPrecedence: 'PRIMARY'
            }
        });

        return formatResponse(newContact, [], []);
    }

    const relatedContacts = await findAllRelatedContacts(matchingContacts);


    relatedContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const primary = relatedContacts.find(c => c.linkPrecedence === 'PRIMARY') || relatedContacts[0];


    await Promise.all(
        relatedContacts
            .filter(c => c.id !== primary.id && c.linkPrecedence === 'PRIMARY')
            .map(c =>
                prisma.contact.update({
                    where: { id: c.id },
                    data: {
                        linkPrecedence: 'SECONDARY',
                        linkedId: primary.id
                    }
                })
            )
    );

    const hasNewEmail = email && !relatedContacts.some(c => c.email === email);
    const hasNewPhone = phoneNumber && !relatedContacts.some(c => c.phoneNumber === phoneNumber);

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
            OR: [{ id: primary.id }, { linkedId: primary.id }]
        }
    });

    const emails = Array.from(new Set(finalGroup.map(c => c.email).filter(Boolean)));
    const phones = Array.from(new Set(finalGroup.map(c => c.phoneNumber).filter(Boolean)));
    const secondaryIds = finalGroup
        .filter(c => c.linkPrecedence === 'SECONDARY')
        .map(c => c.id);

    return {
        contact: {
            primaryContactId: primary.id,
            emails: [primary.email, ...emails.filter(e => e !== primary.email)],
            phoneNumbers: [primary.phoneNumber, ...phones.filter(p => p !== primary.phoneNumber)],
            secondaryContactIds: secondaryIds
        }
    };
};

const findAllRelatedContacts = async (initialContacts: Contact[]): Promise<Contact[]> => {
    const visited = new Set<number>();
    const allContacts: Contact[] = [...initialContacts];
    const queue = [...initialContacts];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current.id)) continue;

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
                allContacts.push(c);
                queue.push(c);
            }
        }
    }

    return allContacts;
};

const formatResponse = (
    primary: Contact,
    emails: string[],
    phones: string[]
) => {
    return {

        primaryContactId: primary.id,
        emails: [primary.email, ...emails.filter(e => e !== primary.email)].filter(Boolean),
        phoneNumbers: [primary.phoneNumber, ...phones.filter(p => p !== primary.phoneNumber)].filter(Boolean),
        secondaryContactIds: []

    };
};

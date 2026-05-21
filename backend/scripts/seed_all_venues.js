const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const venues = [
    {
      name: "Track 97",
      atmosphere: "Track 97 is a versatile space that can be used for hosting parties and events. With ample space, high-quality audiovisual equipment, and a professional sound system, this is the perfect spot to host a variety of events, from birthday parties to product launches.",
      facilities: "Indoor venue, Professional Sound System, Audiovisual Equipment, Ample Space",
      capacity: 150,
      charge: 10000.0,
      imageUrl: "/uploads/track97.jpg",
    },
    {
      name: "Conference Room",
      atmosphere: "A modern, air-conditioned conference room ideal for corporate meetings, seminars, and professional gatherings. Equipped with presentation facilities and comfortable seating.",
      facilities: "Air Conditioning, Projector, Whiteboard, Conference Seating",
      capacity: 40,
      charge: 5000.0,
      imageUrl: "/uploads/conference_room.jpg",
    },
    {
      name: "President's Lounge",
      atmosphere: "An elegant and exclusive lounge designed for VIP events, private dinners, and formal gatherings. Features luxurious décor and premium amenities.",
      facilities: "Air Conditioning, Premium Furniture, Private Bar, Sound System",
      capacity: 60,
      charge: 5000.0,
      imageUrl: "/uploads/presidents_lounge.jpg",
    },
    {
      name: "Outdoor Lawn",
      atmosphere: "A spacious open-air lawn perfect for garden parties, outdoor receptions, and large social gatherings. Enjoy the fresh air in a beautifully maintained green setting.",
      facilities: "Open Air, Garden Setting, Outdoor Lighting, Tent Setup Available",
      capacity: 300,
      charge: 3000.0,
      imageUrl: "/uploads/outdoor_lawn.jpg",
    },
  ];

  for (const venue of venues) {
    const existing = await p.venue.findFirst({ where: { name: venue.name } });
    if (existing) {
      await p.venue.update({
        where: { id: existing.id },
        data: venue,
      });
      console.log(`✅ Updated: ${venue.name} (ID: ${existing.id})`);
    } else {
      const created = await p.venue.create({ data: venue });
      console.log(`✅ Created: ${venue.name} (ID: ${created.id})`);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());

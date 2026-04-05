const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const sourceImage = 'C:/Users/user/.gemini/antigravity/brain/85c3ec07-275a-4ca7-8d99-878cd0bd131b/uploaded_media_1769512223520.jpg';
    const destDir = path.join(__dirname, 'public', 'uploads');
    const destImage = path.join(destDir, 'track97.jpg');

    // Ensure directory exists (redundant if mkdir verified, but safe)
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy image
    try {
        fs.copyFileSync(sourceImage, destImage);
        console.log(`✅ Image copied to ${destImage}`);
    } catch (err) {
        console.error(`❌ Failed to copy image: ${err.message}`);
        // proceed anyway, maybe image manually placed later
    }

    const venueData = {
        name: "Track 97",
        facilities: "Indoor venue, Professional Sound System, audiovisual equipment",
        capacity: 150,
        charge: 500.0,
        imageUrl: "/uploads/track97.jpg",
        atmosphere: "Versatile, Party, Professional"
    };

    const venue = await prisma.venue.create({
        data: venueData
    });

    console.log(`✅ Venue created: ${venue.name} (ID: ${venue.id})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

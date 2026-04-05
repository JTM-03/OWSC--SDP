const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const sourceImage = 'C:/Users/user/.gemini/antigravity/brain/85c3ec07-275a-4ca7-8d99-878cd0bd131b/uploaded_media_1769512799640.jpg';
    const destDir = path.join(__dirname, 'public', 'uploads');
    const destImage = path.join(destDir, 'conference_room.jpg');

    // Ensure directory exists
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy image
    try {
        fs.copyFileSync(sourceImage, destImage);
        console.log(`✅ Image copied to ${destImage}`);
    } catch (err) {
        console.error(`❌ Failed to copy image: ${err.message}`);
    }

    const venueData = {
        name: "Conference Room",
        facilities: "Indoor A/C area, Audiovisual, High-speed Internet",
        capacity: 100,
        charge: 2000.0,
        imageUrl: "/uploads/conference_room.jpg",
        atmosphere: "Professional, Corporate, Tech-equipped"
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

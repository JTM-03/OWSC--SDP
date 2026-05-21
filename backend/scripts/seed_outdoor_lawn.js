const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const sourceImage = 'C:/Users/user/.gemini/antigravity/brain/85c3ec07-275a-4ca7-8d99-878cd0bd131b/uploaded_media_1769513230142.jpg';
    const destDir = path.join(__dirname, 'public', 'uploads');
    const destImage = path.join(destDir, 'outdoor_lawn.jpg');

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
        name: "Outdoor lawn",
        facilities: "Outdoor Non A/c",
        capacity: 150,
        charge: 1000.0,
        imageUrl: "/uploads/outdoor_lawn.jpg",
        atmosphere: "Sprawling, beautiful surroundings, fresh air"
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

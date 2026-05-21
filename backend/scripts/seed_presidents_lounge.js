const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const sourceImage = 'C:/Users/user/.gemini/antigravity/brain/85c3ec07-275a-4ca7-8d99-878cd0bd131b/uploaded_media_1769512595967.jpg';
    const destDir = path.join(__dirname, 'public', 'uploads');
    const destImage = path.join(destDir, 'presidents_lounge.jpg');

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
        name: "President's Lounge",
        facilities: "Indoor venue with A/C, Private",
        capacity: 50,
        charge: 250.0,
        imageUrl: "/uploads/presidents_lounge.jpg",
        atmosphere: "Intimate, Luxurious, Private"
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

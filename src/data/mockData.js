import venueImg from '../assets/venue-private.png';
import loginBg from '../assets/login-bg.png';

export const venues = [
    {
        id: 1,
        name: "The Royal Jazz Lounge",
        type: "Lounge",
        capacity: 40,
        price: 1500,
        image: loginBg,
        description: "An open-plan lounge with live jazz music and ambient lighting.",
        available: true
    },
    {
        id: 2,
        name: "Golden Private Dining",
        type: "Private Room",
        capacity: 12,
        price: 3500,
        image: venueImg,
        description: "Exclusive private dining room with gold accents and a fireplace.",
        available: true
    },
    {
        id: 3,
        name: "The Sapphire Terrace",
        type: "Outdoor",
        capacity: 60,
        price: 2000,
        image: loginBg,
        description: "Stunning rooftop terrace with city views.",
        available: false
    },
    {
        id: 4,
        name: "Vault 19",
        type: "Private Room",
        capacity: 8,
        price: 5000,
        image: venueImg,
        description: "Ultra-exclusive basement vault converted into a whisky tasting room.",
        available: true
    }
];


export const menuItems = [
    {
        id: 101,
        name: "Wagyu Beef Carpaccio",
        category: "Starters",
        price: 32,
        image: venueImg, // Placeholder for now
        available: true
    },
    {
        id: 102,
        name: "Lobster Thermidor",
        category: "Mains",
        price: 85,
        image: import.meta.glob('../assets/food-platter.png', { eager: true })['../assets/food-platter.png']?.default || venueImg,
        description: "Fresh lobster grilled with rich brandy sauce.",
        available: true
    },
    {
        id: 103,
        name: "Truffle Risotto",
        category: "Mains",
        price: 45,
        image: venueImg,
        description: "Creamy arborio rice with black truffle shavings.",
        available: true
    },
    {
        id: 104,
        name: "Gold Leaf Martini",
        category: "Drinks",
        price: 28,
        image: loginBg,
        available: true
    },
    {
        id: 105,
        name: "Oysters Rockefeller",
        category: "Starters",
        price: 36,
        image: venueImg,
        available: false // Out of stock
    }
];

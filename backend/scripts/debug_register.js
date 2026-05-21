const axios = require('axios');

const registerData = {
    fullName: "Debug User",
    email: "debug_" + Date.now() + "@test.com",
    username: "debug_" + Date.now(),
    password: "password123",
    confirmPassword: "password123",
    phone: "0771234567",
    nic: "199012345678",
    address: "123 Debug St",
    emergencyContact: "Emergency Name",
    emergencyPhone: "0779876543",
    membershipType: "full",
    role: "member",
    agreeTerms: true
};

axios.post('http://localhost:5000/api/auth/register', registerData)
    .then(res => console.log('SUCCESS:', res.data))
    .catch(err => {
        console.error('ERROR status:', err.response?.status);
        console.error('ERROR data:', JSON.stringify(err.response?.data, null, 2));
    });

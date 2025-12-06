const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); 

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;


exports.hashPassword = (password) => {
    return bcrypt.hash(password, SALT_ROUNDS);
};


exports.comparePassword = (password, hash) => {
    return bcrypt.compare(password, hash);
};


exports.generateToken = (vendorId) => {
    //contains the vendorId
    return jwt.sign({ vendorId }, JWT_SECRET, { expiresIn: '1h' }); 
};


exports.protect = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expects 'Bearer <token>'

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        // Attach the vendorId from the token to the request object
        req.vendorId = decoded.vendorId;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
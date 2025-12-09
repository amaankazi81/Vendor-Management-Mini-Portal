const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');

//CONFIGURATION
const dbConfig = {
    user: 'postgres', 
    host: 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

const PORT = process.env.PORT || 5000;
const app = express();

//Database connection
const pool = new Pool(dbConfig);

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Successfully connected to PostgreSQL database!');
    release();
});

module.exports = pool; 

//Middlewares
app.use(cors()); 
app.use(express.json()); 

//Routes
const vendorRoutes = require('./vendorRoutes');

app.use('/api/vendors', vendorRoutes);

app.get('/api/diagnostic/products-schema', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT column_name, data_type FROM information_schema.columns 
             WHERE table_name = 'products' ORDER BY ordinal_position`
        );
        res.json({ products_columns: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//Public API routes (Listing and Showcase)
app.get('/api/public/vendors', async (req, res) => {
    //Vendor Listing Page API
    const { search, category, sort } = req.query; 
    let query = 'SELECT vendor_id, vendor_name, business_category, logo_url, average_rating, review_count FROM vendors';
    
    //Simple implementation 
    if (search) {
        query += ` WHERE vendor_name ILIKE '%${search}%'`; // Not safe for real app, use parameterized query!
    }
    if (sort === 'rating') {
        query += ' ORDER BY average_rating DESC';
    }

    try {
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ message: 'Could not fetch vendor list.' });
    }
});

//Get Single Vendor Profile with Products
app.get('/api/public/vendors/:vendorId', async (req, res) => {
    const { vendorId } = req.params;

    try {
        // Fetch vendor details
        const vendorResult = await pool.query(
            'SELECT vendor_id, vendor_name, business_category, city, description, logo_url, average_rating, review_count FROM vendors WHERE vendor_id = $1',
            [vendorId]
        );

        if (vendorResult.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found.' });
        }

        const vendor = vendorResult.rows[0];

        // Try to fetch products
        try {
            const productsResult = await pool.query(
                'SELECT * FROM products WHERE vendor_id = $1',
                [vendorId]
            );
            vendor.products = productsResult.rows;
        } catch (err) {
            // Products table doesn't exist or has no data - set empty array
            console.log('Products not available:', err.message);
            vendor.products = [];
        }

        res.json(vendor);
    } catch (error) {
        console.error('Error fetching vendor profile:', error);
        res.status(500).json({ message: 'Could not fetch vendor profile.' });
    }
});

//Submit Feedback & Rating
app.post('/api/ratings', async (req, res) => {
    const { vendor_id, client_name, project_name, rating, comments } = req.body;

    if (!vendor_id || !client_name || !rating || !comments) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO ratings (vendor_id, client_name, project_name, rating, comments) VALUES ($1, $2, $3, $4, $5) RETURNING rating_id',
            [vendor_id, client_name, project_name, rating, comments]
        );

        res.status(201).json({ 
            message: 'Rating submitted successfully.',
            rating_id: result.rows[0].rating_id
        });
    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ message: 'Could not submit rating.' });
    }
});

//Starting Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
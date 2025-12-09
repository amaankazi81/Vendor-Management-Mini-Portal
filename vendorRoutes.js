const express = require('express');
const { protect, hashPassword, comparePassword, generateToken } = require('./auth');
const pool = require('./server'); 

const router = express.Router();

// Vendor registration fields
const validateRegistration = (req, res, next) => {
    const { vendor_name, email, password, confirm_password, business_category } = req.body;
    if (!vendor_name || !email || !password || !confirm_password || !business_category) {
        return res.status(400).json({ message: 'Missing required fields: name, email, password, category.' });
    }
    if (password !== confirm_password) {
        return res.status(400).json({ message: 'Password and Confirm Password do not match.' });
    }
    next();
};


// 1. Vendor Registration - POST /api/vendors/register //
router.post('/register', validateRegistration, async (req, res) => {
    const { vendor_name, owner_name, contact_number, email, business_category, city, description, logo_url, password } = req.body;
    
    try {
        //Check if vendor already exists
        const existingVendor = await pool.query('SELECT * FROM vendors WHERE email = $1', [email]);
        if (existingVendor.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        //Hash Password
        const password_hash = await hashPassword(password);

        //Saving vendor details
        const result = await pool.query(
            `INSERT INTO vendors (vendor_name, owner_name, contact_number, email, password_hash, business_category, city, description, logo_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING vendor_id, vendor_name`,
            [vendor_name, owner_name, contact_number, email, password_hash, business_category, city, description, logo_url]
        );

        //Success
        res.status(201).json({ 
            message: 'Vendor registration successful.',
            vendor: result.rows[0]
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


//2. Vendor Login - POST /api/vendors/login //

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        //Find vendor by email
        const result = await pool.query('SELECT vendor_id, password_hash FROM vendors WHERE email = $1', [email]);
        const vendor = result.rows[0];

        if (!vendor) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        //Comparing password
        const isMatch = await comparePassword(password, vendor.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        //Generate token
        const token = generateToken(vendor.vendor_id);

        res.json({ 
            message: 'Login successful',
            token,
            vendorId: vendor.vendor_id
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


//3. Get Vendor Profile (Protected) - GET /api/vendors/profile //
router.get('/profile', protect, async (req, res) => {
    const vendorId = req.vendorId;

    try {
        const result = await pool.query(
            'SELECT vendor_id, vendor_name, owner_name, contact_number, email, business_category, city, description, logo_url FROM vendors WHERE vendor_id = $1',
            [vendorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});


// 4. Protected Route: Update Vendor Details - PUT /api/vendors/profile //
router.put('/profile', protect, async (req, res) => {
    const { vendor_name, owner_name, contact_number, business_category, city, description, logo_url } = req.body;
    const vendorId = req.vendorId; // Set by the 'protect' middleware

    try {
        const result = await pool.query(
            `UPDATE vendors SET 
                vendor_name = $1, 
                owner_name = $2, 
                contact_number = $3, 
                business_category = $4, 
                city = $5, 
                description = $6, 
                logo_url = $7
             WHERE vendor_id = $8 RETURNING *`,
            [vendor_name, owner_name, contact_number, business_category, city, description, logo_url, vendorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found.' });
        }

        //Excluding sensitive fields 
        const { password_hash, ...vendorData } = result.rows[0];

        res.json({
            message: 'Profile updated successfully.',
            vendor: vendorData
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error during profile update.' });
    }
});


//5. Add Product (Protected) - POST /api/vendors/products //
router.post('/products', protect, async (req, res) => {
    const { name, description, price_range, image } = req.body;
    const vendorId = req.vendorId;

    if (!name || !description || !price_range) {
        return res.status(400).json({ message: 'Missing required fields: name, description, price_range.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO products (vendor_id, product_name, short_description, price_range, product_image_url)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [vendorId, name, description, price_range, image]
        );

        res.status(201).json({
            message: 'Product added successfully.',
            product: result.rows[0]
        });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ message: 'Server error adding product.' });
    }
});

//6. Get Vendor Products (Protected) - GET /api/vendors/products //
router.get('/products', protect, async (req, res) => {
    const vendorId = req.vendorId;

    try {
        const result = await pool.query(
            `SELECT * FROM products WHERE vendor_id = $1 ORDER BY created_at DESC`,
            [vendorId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Fetch products error:', error);
        res.status(500).json({ message: 'Server error fetching products.' });
    }
});

//7. Update Product (Protected) - PUT /api/vendors/products/:productId //
router.put('/products/:productId', protect, async (req, res) => {
    const { productId } = req.params;
    const { name, description, price_range, image } = req.body;
    const vendorId = req.vendorId;

    if (!name || !description || !price_range) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const result = await pool.query(
            `UPDATE products SET product_name = $1, short_description = $2, price_range = $3, product_image_url = $4
             WHERE product_id = $5 AND vendor_id = $6 RETURNING *`,
            [name, description, price_range, image, productId, vendorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.json({
            message: 'Product updated successfully.',
            product: result.rows[0]
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Server error updating product.' });
    }
});

//8. Delete Product (Protected) - DELETE /api/vendors/products/:productId //
router.delete('/products/:productId', protect, async (req, res) => {
    const { productId } = req.params;
    const vendorId = req.vendorId;

    try {
        const result = await pool.query(
            `DELETE FROM products WHERE product_id = $1 AND vendor_id = $2 RETURNING product_id`,
            [productId, vendorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.json({ message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Server error deleting product.' });
    }
});

module.exports = router;
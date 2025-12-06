import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, User, Star, StarHalf, LogIn, LogOut, Briefcase, List, PlusCircle, PenTool, Trash2 } from 'lucide-react';
import './App.css';

// --- Configuration & Utilities ---
const API_BASE_URL = 'http://localhost:5000/api'; 
const CATEGORIES = ['Contractor', 'Material Supplier', 'Consultant', 'Fabricator', 'Other'];

//Fetching
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 401) throw new Error('Unauthorized'); 
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Fetch attempt ${i + 1} failed. Retrying in ${2 ** i}s...`);
      await new Promise(res => setTimeout(res, 2 ** i * 1000));
    }
  }
};

// Reusable UI Components

const StarRating = ({ rating, count }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="star-rating vendor-rating-container">
      {Array(fullStars).fill(0).map((_, i) => <Star key={`full-${i}`} className="star-icon" fill="currentColor" size={16} />)}
      {halfStar && <StarHalf className="star-icon" fill="currentColor" size={16} />}
      {Array(emptyStars).fill(0).map((_, i) => <Star key={`empty-${i}`} className="star-icon" stroke="currentColor" size={16} />)}
      <span className="review-count">({count} reviews)</span>
    </div>
  );
};

const Header = ({ currentPage, setCurrentPage, vendor, handleLogout }) => (
  <header className="header">
    <div className="container header-content">
      <h1 
        className="logo"
        onClick={() => setCurrentPage('listing')}
      >
        QuickSO Vendor Portal
      </h1>
      <nav className="nav">
        <button 
          onClick={() => setCurrentPage('listing')} 
          className={`nav-button ${currentPage === 'listing' ? 'active' : 'default'}`}
        >
          <List className="nav-button-icon" size={16} /> Listing
        </button>
        {vendor ? (
          <>
            <button 
              onClick={() => setCurrentPage('dashboard')} 
              className={`nav-button ${currentPage === 'dashboard' ? 'active' : 'default'}`}
            >
              <Briefcase className="nav-button-icon" size={16} /> Dashboard
            </button>
            <button 
              onClick={handleLogout} 
              className="nav-button logout"
            >
              <LogOut className="nav-button-icon" size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setCurrentPage('login')} 
              className={`nav-button login ${currentPage === 'login' ? 'active' : ''}`}
            >
              <LogIn className="nav-button-icon" size={16} /> Login
            </button>
            <button 
              onClick={() => setCurrentPage('register')} 
              className={`nav-button register`}
            >
              <User className="nav-button-icon" size={16} /> Register
            </button>
          </>
        )}
      </nav>
    </div>
  </header>
);

const Input = ({ name, label, type = 'text', value, onChange, required = false, minLength, selectOptions, disabled = false, style = {} }) => (
  <div className="form-group">
    <label htmlFor={name} className="label">
      {label}
    </label>
    {selectOptions ? (
      <select 
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="select"
        style={style}
      >
        {selectOptions.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    ) : type === 'textarea' ? (
      <textarea 
        id={name}
        name={name}
        rows="3"
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="textarea"
        style={style}
      ></textarea>
    ) : (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        disabled={disabled}
        className="input"
        style={style}
      />
    )}
  </div>
);

const VendorCard = ({ vendor, handleViewProfile }) => (
  <div className="vendor-card">
    <div className="vendor-card-body">
      <div className="vendor-card-header">
        <img 
          src={vendor.logo_url || 'https://placehold.co/64x64/1e40af/ffffff?text=L'} 
          alt={`${vendor.vendor_name} logo`}
          className="vendor-logo"
          onError={(e) => e.target.src = 'https://placehold.co/64x64/1e40af/ffffff?text=L'}
        />
        <div>
          <h3 className="vendor-name">{vendor.vendor_name}</h3>
          <p className="vendor-category">{vendor.business_category}</p>
        </div>
      </div>
      <StarRating rating={vendor.average_rating || 0} count={vendor.review_count || 0} />
      <button 
        onClick={() => handleViewProfile(vendor.vendor_id)}
        className="btn-view-profile"
      >
        View Profile
      </button>
    </div>
  </div>
);

const ProductCard = ({ product }) => (
    <div className="product-card">
        <img 
            src={product.image || product.product_image_url} 
            alt={product.name || product.product_name} 
            className="product-image"
            onError={(e) => e.target.src = 'https://placehold.co/200x200/1e40af/ffffff?text=Product'}
        />
        <div className="product-details">
            <h4 className="product-name">{product.name || product.product_name}</h4>
            <p className="product-description">{product.description || product.short_description}</p>
            <p className="product-price">{product.price_range}</p>
        </div>
    </div>
);


//Page Components

//1. Vendor Registration Page
const RegisterPage = ({ setCurrentPage }) => {
  const [formData, setFormData] = useState({
    vendor_name: '', owner_name: '', contact_number: '', email: '', 
    business_category: CATEGORIES[0], city: '', description: '', 
    logo_url: '', password: '', confirm_password: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (formData.password !== formData.confirm_password) {
      setMessage('Error: Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/vendors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Registration successful! Redirecting to login...');
        setTimeout(() => setCurrentPage('login'), 2000); 
      } else {
        setMessage(`Error: ${data.message || 'Registration failed.'}`);
      }
    } catch (error) {
      console.error('Registration API Error:', error);
      setMessage('Network or server error during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-content">
      <div className="card form-container">
        <h2 className="form-title" style={{ color: 'var(--color-primary)' }}>Vendor Registration</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="form-group grid-2">
            <Input name="vendor_name" label="Vendor Name (Required)" value={formData.vendor_name} onChange={handleChange} required />
            <Input name="owner_name" label="Owner Name" value={formData.owner_name} onChange={handleChange} />
          </div>
          
          <div className="form-group grid-2">
            <Input name="contact_number" label="Contact Number" value={formData.contact_number} onChange={handleChange} />
            <Input name="email" label="Email (Required)" type="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group grid-2">
            <Input name="business_category" label="Business Category (Required)" value={formData.business_category} onChange={handleChange} selectOptions={CATEGORIES} required />
            <Input name="city" label="City" value={formData.city} onChange={handleChange} />
          </div>

          <Input name="logo_url" label="Company Logo URL (Optional)" value={formData.logo_url} onChange={handleChange} />
          
          <Input name="description" label="Description" value={formData.description} onChange={handleChange} type="textarea" />

          <div className="form-group grid-2">
            <Input name="password" label="Password (Required)" type="password" value={formData.password} onChange={handleChange} required minLength={6} />
            <Input name="confirm_password" label="Confirm Password (Required)" type="password" value={formData.confirm_password} onChange={handleChange} required minLength={6} />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-submit"
          >
            {loading ? (
              <RefreshCw size={20} style={{ marginRight: '0.5rem' }} className="animate-spin" />
            ) : (
              'Register Vendor'
            )}
          </button>
        </form>
        {message && (
          <p className={`message-box ${message.startsWith('Error') ? 'error' : 'success'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};


//2. Vendor Login
const LoginPage = ({ setVendor, setCurrentPage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/vendors/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('vendorToken', data.token);
        localStorage.setItem('vendorId', data.vendorId);
        
        setVendor({ id: data.vendorId }); 
        setCurrentPage('dashboard');
      } else {
        setMessage(`Error: ${data.message || 'Login failed.'}`);
      }
    } catch (error) {
      console.error('Login API Error:', error);
      setMessage('Network or server error during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-content">
      <div className="card form-container" style={{maxWidth: '400px'}}>
        <h2 className="form-title" style={{ color: 'var(--color-secondary)' }}>Vendor Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input name="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input name="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <button 
            type="submit" 
            disabled={loading}
            className="btn-submit"
            style={{backgroundColor: 'var(--color-secondary)'}}
          >
            {loading ? <RefreshCw size={20} style={{ marginRight: '0.5rem' }} className="animate-spin" /> : 'Login'}
          </button>
        </form>
        {message && (
          <p className="message-box error">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

//5. Vendor Listing Page
const VendorListingPage = ({ setCurrentVendorId, setCurrentPage }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('');
  
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/public/vendors?`;
      if (search) url += `search=${search}&`;
      if (category) url += `category=${category}&`;
      if (sort) url += `sort=${sort}`;

      const response = await fetchWithRetry(url, { method: 'GET' });
      const data = await response.json();
      
      setVendors(data || []);

    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, sort]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleViewProfile = (vendorId) => {
    setCurrentVendorId(vendorId);
    setCurrentPage('profile');
  };

  return (
    <div className="container page-content">
      <h2 className="listing-header">Vendor Directory</h2>
      <div className="filter-bar">
        <input 
          type="text" 
          placeholder="Search by Vendor Name..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filter-input"
        />
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select 
          value={sort} 
          onChange={(e) => setSort(e.target.value)}
          className="filter-select"
        >
          <option value="">Sort By</option>
          <option value="rating">Average Rating</option>
        </select>
        <button 
            onClick={fetchVendors}
            className="filter-button"
        >
            <RefreshCw size={18} />
        </button>
      </div>

      {loading && <p style={{textAlign: 'center', fontSize: '1.25rem', color: 'var(--color-primary)'}}>Loading vendors...</p>}
      
      <div className="vendor-grid">
        {!loading && vendors.length === 0 && (
          <p style={{gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-subtext)'}}>No vendors found matching your criteria.</p>
        )}
        {vendors.map(v => (
          <VendorCard 
            key={v.vendor_id} 
            vendor={v} 
            handleViewProfile={handleViewProfile} 
          />
        ))}
      </div>
    </div>
  );
};

//3. Vendor Product Showcase Page
const VendorProfilePage = ({ vendorId, setCurrentPage }) => {
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVendorProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchWithRetry(`${API_BASE_URL}/public/vendors/${vendorId}`, { method: 'GET' });
        const data = await response.json();
        setVendorData(data);
      } catch (err) {
        console.error('Failed to fetch vendor profile:', err);
        setError('Failed to load vendor profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVendorProfile();
  }, [vendorId]);

  if (loading) return <p style={{textAlign: 'center', marginTop: '5rem', fontSize: '1.25rem', color: 'var(--color-primary)'}}>Loading Vendor Profile...</p>;
  if (error) return <p style={{textAlign: 'center', marginTop: '5rem', fontSize: '1.25rem', color: '#dc2626'}}>{error}</p>;
  if (!vendorData) return <p style={{textAlign: 'center', marginTop: '5rem', fontSize: '1.25rem', color: '#dc2626'}}>Vendor not found.</p>;

  return (
    <div className="container page-content">
      <div className="card profile-container">
        <div className="profile-header">
          <img 
            src={vendorData.logo_url} 
            alt={`${vendorData.vendor_name} logo`}
            className="profile-logo"
            onError={(e) => e.target.src = 'https://placehold.co/128x128/94a3b8/ffffff?text=V'}
          />
          <h2 className="profile-name">{vendorData.vendor_name}</h2>
          <p className="profile-category">{vendorData.business_category} in {vendorData.city}</p>
          <StarRating rating={vendorData.average_rating} count={vendorData.review_count} />
        </div>
        
        <p className="profile-description">
          {vendorData.description}
        </p>

        <h3 className="products-title">Our Products & Services</h3>
        <div className="product-list">
          {vendorData.products && vendorData.products.length > 0 ? (
            vendorData.products.map(p => (
              <ProductCard key={p.id || p.product_id} product={p} />
            ))
          ) : (
            <p style={{gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-subtext)'}}>No products available at this time.</p>
          )}
        </div>

        <button
          onClick={() => setCurrentPage('feedback')}
          className="btn-submit"
          style={{backgroundColor: '#4f46e5', marginTop: '2rem'}}
        >
          Submit Client Feedback & Rating
        </button>
      </div>
    </div>
  );
};


//6. Feedback & Rating Page
const FeedbackPage = ({ vendorId, setCurrentPage }) => {
  const [formData, setFormData] = useState({ client_name: '', project_name: '', rating: 5, comments: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [vendorName, setVendorName] = useState('Vendor');

  useEffect(() => {
    const fetchVendorName = async () => {
      try {
        const response = await fetchWithRetry(`${API_BASE_URL}/public/vendors/${vendorId}`, { method: 'GET' });
        const data = await response.json();
        setVendorName(data.vendor_name || 'Vendor');
      } catch (error) {
        console.error('Failed to fetch vendor name:', error);
        setVendorName('Vendor');
      }
    };
    
    fetchVendorName();
  }, [vendorId]); 

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    const payload = { ...formData, vendor_id: vendorId, rating: parseInt(formData.rating, 10) };

    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/ratings`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Thank you! Your feedback has been submitted successfully.');
        setFormData({ client_name: '', project_name: '', rating: 5, comments: '' });
      } else {
        setMessage(`Error: ${data.message || 'Feedback submission failed.'}`);
      }
    } catch (error) {
      console.error('Feedback API Error:', error);
      setMessage('Network or server error during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-content">
      <div className="card form-container">
        <h2 className="form-title" style={{ color: '#4f46e5' }}>Client Feedback for {vendorName}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="client_name" label="Your Name (Client Name)" value={formData.client_name} onChange={handleChange} required />
          <Input name="project_name" label="Project Name (Optional)" value={formData.project_name} onChange={handleChange} />
          
          <Input 
            name="rating" 
            label="Rating (1 to 5 Stars)" 
            value={formData.rating} 
            onChange={handleChange} 
            selectOptions={[5, 4, 3, 2, 1].map(r => `${r} Star${r > 1 ? 's' : ''}`)}
            required 
          />

          <Input name="comments" label="Comments" value={formData.comments} onChange={handleChange} type="textarea" required />

          <button 
            type="submit" 
            disabled={loading}
            className="btn-submit"
            style={{backgroundColor: '#4f46e5'}}
          >
            {loading ? <RefreshCw size={20} style={{ marginRight: '0.5rem' }} className="animate-spin" /> : 'Submit Feedback'}
          </button>
        </form>
        {message && (
          <p className={`message-box ${message.startsWith('Error') ? 'error' : 'success'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

//7. Profile Edit Page
const ProfileEditPage = ({ vendor, setCurrentPage, onProfileUpdate }) => {
  const [formData, setFormData] = useState({
    vendor_name: '', owner_name: '', contact_number: '', 
    business_category: CATEGORIES[0], city: '', description: '', logo_url: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('vendorToken');
        const response = await fetchWithRetry(`${API_BASE_URL}/vendors/profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setFormData(data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setMessage('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsSaving(true);

    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetchWithRetry(`${API_BASE_URL}/vendors/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Profile updated successfully!');
        if (onProfileUpdate) onProfileUpdate();
        setTimeout(() => setCurrentPage('dashboard'), 1500);
      } else {
        setMessage(`Error: ${data.message || 'Update failed.'}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      setMessage('Network or server error.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <p style={{textAlign: 'center', marginTop: '5rem', fontSize: '1.25rem'}}>Loading profile...</p>;

  return (
    <div className="container page-content">
      <div className="card form-container">
        <h2 className="form-title" style={{ color: 'var(--color-primary)' }}>Edit Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group grid-2">
            <Input name="vendor_name" label="Vendor Name" value={formData.vendor_name} onChange={handleChange} required />
            <Input name="owner_name" label="Owner Name" value={formData.owner_name} onChange={handleChange} />
          </div>
          <div className="form-group grid-2">
            <Input name="contact_number" label="Contact Number" value={formData.contact_number} onChange={handleChange} />
            <Input name="email" label="Email (Read-only)" value={formData.email} disabled style={{opacity: 0.6}} />
          </div>
          <div className="form-group grid-2">
            <Input name="business_category" label="Business Category" value={formData.business_category} onChange={handleChange} selectOptions={CATEGORIES} />
            <Input name="city" label="City" value={formData.city} onChange={handleChange} />
          </div>
          <Input name="logo_url" label="Company Logo URL" value={formData.logo_url} onChange={handleChange} />
          <Input name="description" label="Description" value={formData.description} onChange={handleChange} type="textarea" />
          
          <div style={{display: 'flex', gap: '1rem'}}>
            <button type="submit" disabled={isSaving} className="btn-submit">
              {isSaving ? <RefreshCw size={20} className="animate-spin" /> : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setCurrentPage('dashboard')} className="btn-submit" style={{backgroundColor: '#6b7280'}}>
              Cancel
            </button>
          </div>
        </form>
        {message && (
          <p className={`message-box ${message.startsWith('Error') ? 'error' : 'success'}`} style={{marginTop: '1rem'}}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

//8. Add Product Page
const AddProductPage = ({ setCurrentPage }) => {
  const [formData, setFormData] = useState({ name: '', description: '', price_range: '', image: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (!formData.name || !formData.description || !formData.price_range) {
      setMessage('Error: Please fill all required fields.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetchWithRetry(`${API_BASE_URL}/vendors/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Product added successfully!');
        setTimeout(() => setCurrentPage('manage-products'), 1500);
      } else {
        setMessage(`Error: ${data.message || 'Failed to add product.'}`);
      }
    } catch (error) {
      console.error('Add product error:', error);
      setMessage('Network or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-content">
      <div className="card form-container">
        <h2 className="form-title" style={{ color: 'var(--color-primary)' }}>Add New Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" label="Product Name (Required)" value={formData.name} onChange={handleChange} required />
          <Input name="description" label="Description (Required)" value={formData.description} onChange={handleChange} type="textarea" required />
          <Input name="price_range" label="Price Range (Required)" value={formData.price_range} onChange={handleChange} required />
          <Input name="image" label="Product Image URL" value={formData.image} onChange={handleChange} />
          
          <div style={{display: 'flex', gap: '1rem'}}>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? <RefreshCw size={20} className="animate-spin" /> : 'Add Product'}
            </button>
            <button type="button" onClick={() => setCurrentPage('manage-products')} className="btn-submit" style={{backgroundColor: '#6b7280'}}>
              Cancel
            </button>
          </div>
        </form>
        {message && (
          <p className={`message-box ${message.startsWith('Error') ? 'error' : 'success'}`} style={{marginTop: '1rem'}}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

//9. Manage Products Page
const ManageProductsPage = ({ setCurrentPage }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetchWithRetry(`${API_BASE_URL}/vendors/products`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch products error:', error);
      setMessage('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetchWithRetry(`${API_BASE_URL}/vendors/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage('Product deleted successfully!');
        fetchProducts();
      } else {
        setMessage('Failed to delete product.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setMessage('Network or server error.');
    }
  };

  const handleEditStart = (product) => {
    setEditingId(product.product_id);
    setEditFormData({
      name: product.product_name,
      description: product.short_description,
      price_range: product.price_range,
      image: product.product_image_url
    });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('vendorToken');
      const response = await fetchWithRetry(`${API_BASE_URL}/vendors/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        setMessage('Product updated successfully!');
        setEditingId(null);
        fetchProducts();
      } else {
        setMessage('Failed to update product.');
      }
    } catch (error) {
      console.error('Update error:', error);
      setMessage('Network or server error.');
    }
  };

  if (loading) return <p style={{textAlign: 'center', marginTop: '5rem', fontSize: '1.25rem'}}>Loading products...</p>;

  return (
    <div className="container page-content">
      <div className="card profile-container">
        <h2 className="form-title" style={{marginBottom: '1.5rem', color: 'var(--color-primary)'}}>Manage Products</h2>
        
        <button onClick={() => setCurrentPage('add-product')} className="btn-submit" style={{marginBottom: '2rem'}}>
          <PlusCircle size={16} style={{marginRight: '0.5rem'}} /> Add New Product
        </button>

        {message && (
          <p className={`message-box ${message.startsWith('Error') || message.startsWith('Failed') ? 'error' : 'success'}`} style={{marginBottom: '1.5rem'}}>
            {message}
          </p>
        )}

        {products.length === 0 ? (
          <p style={{textAlign: 'center', color: 'var(--color-subtext)', padding: '2rem'}}>No products yet. Start by adding one!</p>
        ) : (
          <div style={{display: 'grid', gap: '1.5rem'}}>
            {products.map(product => (
              <div key={product.product_id} className="card" style={{padding: '1.5rem', borderLeft: '4px solid var(--color-primary)'}}>
                {editingId === product.product_id ? (
                  <form onSubmit={handleEditSubmit} className="space-y-3">
                    <Input name="name" label="Product Name" value={editFormData.name || editFormData.product_name || ''} onChange={handleEditChange} required />
                    <Input name="description" label="Description" value={editFormData.description || editFormData.short_description || ''} onChange={handleEditChange} type="textarea" required />
                    <Input name="price_range" label="Price Range" value={editFormData.price_range} onChange={handleEditChange} required />
                    <Input name="image" label="Image URL" value={editFormData.image || editFormData.product_image_url || ''} onChange={handleEditChange} />
                    <div style={{display: 'flex', gap: '1rem'}}>
                      <button type="submit" className="btn-submit">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-submit" style={{backgroundColor: '#6b7280'}}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h3 style={{marginBottom: '0.5rem', color: 'var(--color-text)'}}>{product.product_name}</h3>
                    <p style={{color: 'var(--color-subtext)', marginBottom: '0.5rem'}}>{product.short_description}</p>
                    <p style={{fontWeight: '600', color: 'var(--color-primary)', marginBottom: '1rem'}}>Price: {product.price_range}</p>
                    <div style={{display: 'flex', gap: '1rem'}}>
                      <button onClick={() => handleEditStart(product)} className="btn-submit" style={{backgroundColor: '#10b981', flex: 1}}>
                        <PenTool size={16} style={{marginRight: '0.5rem'}} /> Edit
                      </button>
                      <button onClick={() => handleDelete(product.product_id)} className="btn-submit" style={{backgroundColor: '#ef4444', flex: 1}}>
                        <Trash2 size={16} style={{marginRight: '0.5rem'}} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setCurrentPage('dashboard')} className="btn-submit" style={{marginTop: '2rem', backgroundColor: '#6b7280', width: '100%'}}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

// 2. Vendor Dashboard 
const DashboardPage = ({ vendor, setCurrentPage }) => {
    return (
        <div className="container page-content">
            <div className="profile-container card">
                <h2 className="form-title" style={{marginBottom: '1rem', color: 'var(--color-text)'}}>Vendor Dashboard</h2>
                <p style={{fontSize: '1.25rem', color: 'var(--color-secondary)', marginBottom: '2rem'}}>Welcome back, Vendor ID: {vendor.id}</p>

                <div className="dashboard-grid">
                    <div className="dashboard-card profile">
                        <h3 className="dashboard-card-title"><User size={24} /> Profile Management</h3>
                        <p style={{color: 'var(--color-subtext)'}}>View and update your company details, logo, and contact information.</p>
                        <div className="action-buttons">
                            <button className="btn-action btn-update" onClick={() => setCurrentPage('edit-profile')}>
                                <PenTool size={16} style={{ marginRight: '0.25rem' }} /> Update Details
                            </button>
                        </div>
                    </div>

                    <div className="dashboard-card products">
                        <h3 className="dashboard-card-title"><Briefcase size={24} /> Product Management</h3>
                        <p style={{color: 'var(--color-subtext)'}}>Add, edit, or delete your product/service offerings for the public showcase page.</p>
                        <div className="action-buttons">
                            <button className="btn-action btn-add" onClick={() => setCurrentPage('add-product')}>
                                <PlusCircle size={16} style={{ marginRight: '0.25rem' }} /> Add Product 
                            </button>
                            <button className="btn-action btn-manage" onClick={() => setCurrentPage('manage-products')}>
                                <PenTool size={16} style={{ marginRight: '0.25rem' }} /> Manage Products
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


//Main Application

const App = () => {
  const [vendor, setVendor] = useState(null);
  const [currentPage, setCurrentPage] = useState('listing');
  const [currentVendorId, setCurrentVendorId] = useState(null);

  // Check for existing token on initial load
  useEffect(() => {
    const token = localStorage.getItem('vendorToken');
    const id = localStorage.getItem('vendorId');
    if (token && id) {
      setVendor({ id }); 
      setCurrentPage('dashboard');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorId');
    setVendor(null);
    setCurrentPage('listing');
  };

  // Simple Router based on state
  let content;
  switch (currentPage) {
    case 'register':
      content = <RegisterPage setCurrentPage={setCurrentPage} />;
      break;
    case 'login':
      content = <LoginPage setVendor={setVendor} setCurrentPage={setCurrentPage} />;
      break;
    case 'dashboard':
      content = vendor ? <DashboardPage vendor={vendor} setCurrentPage={setCurrentPage} /> : <LoginPage setVendor={setVendor} setCurrentPage={setCurrentPage} />;
      break;
    case 'edit-profile':
      content = vendor ? <ProfileEditPage vendor={vendor} setCurrentPage={setCurrentPage} /> : <LoginPage setVendor={setVendor} setCurrentPage={setCurrentPage} />;
      break;
    case 'add-product':
      content = vendor ? <AddProductPage setCurrentPage={setCurrentPage} /> : <LoginPage setVendor={setVendor} setCurrentPage={setCurrentPage} />;
      break;
    case 'manage-products':
      content = vendor ? <ManageProductsPage setCurrentPage={setCurrentPage} /> : <LoginPage setVendor={setVendor} setCurrentPage={setCurrentPage} />;
      break;
    case 'profile':
      content = currentVendorId ? <VendorProfilePage vendorId={currentVendorId} setCurrentPage={setCurrentPage} /> : <VendorListingPage setCurrentVendorId={setCurrentVendorId} setCurrentPage={setCurrentPage} />;
      break;
    case 'feedback':
        const targetVendorId = currentVendorId || parseInt(localStorage.getItem('vendorId')) || 1; 
        content = <FeedbackPage vendorId={targetVendorId} setCurrentPage={setCurrentPage} />;
        break;
    case 'listing':
    default:
      content = <VendorListingPage setCurrentVendorId={setCurrentVendorId} setCurrentPage={setCurrentPage} />;
      break;
  }

  return (
    <div className="app-container">
      <Header 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        vendor={vendor} 
        handleLogout={handleLogout} 
      />
      <main>
        {content}
      </main>
    </div>
  );
};

export default App;
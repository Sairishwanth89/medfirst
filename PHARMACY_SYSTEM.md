# Pharmacy Management System - MediAgency

This document describes the complete pharmacy management system that has been implemented based on your design requirements.

## Pages Created

### 1. Main Dashboard (pharmacy.html)
**Route:** `/pharmacy.html`

**Features:**
- Emergency banner at top with "Emergency Request" button
- Orange branded header with "MediAgency" branding
- Header icons: Notifications (with badge), Profile, Home, Logout
- 4 Action Cards:
  - Add Medicine (orange icon)
  - Manage Stock (purple icon)
  - Orders (teal icon)
  - Settings (cyan icon)
- 4 Statistics Cards:
  - Total Medicines
  - Pending Orders
  - Orders Today
  - Revenue Today
- Recent Orders Table with status badges
- Low Stock Alerts section with update buttons

### 2. Medicine Stock Management (pharmacy-stock.html)
**Route:** `/pharmacy-stock.html`

**Features:**
- Clean white header with stock icon
- Add Medicine button in header
- 4 Stock Statistics Cards:
  - Total Medicines (blue)
  - Low Stock (yellow)
  - Out of Stock (red)
  - Expiring Soon (purple)
- Search and Filter Bar:
  - Search by medicine name
  - Filter by category
  - Filter by stock level
- Comprehensive Medicine Table:
  - Medicine Name with description
  - Category badges (OTC, Prescription, Supplement)
  - Price
  - Stock quantity
  - Status badges (In Stock, Low Stock, Out of Stock)
  - Action buttons (Edit, Delete)

### 3. Orders Management (pharmacy-orders.html)
**Route:** `/pharmacy-orders.html`

**Features:**
- Red priority banner at top
- Tab navigation:
  - Pending (3)
  - Processing (11)
  - Completed (20)
- Orders Table:
  - Order ID
  - Customer name and phone
  - Medicines ordered
  - Amount
  - Order time
  - Status badges
  - Action buttons (Accept, Reject)

### 4. Pharmacy Profile/Settings (pharmacy-settings.html)
**Route:** `/pharmacy-settings.html`

**Features:**
- Left sidebar with profile card:
  - Profile avatar (letter initial)
  - Pharmacy name
  - Member since date
  - Verification badge
  - Rating
  - Stock count
- Right content area with 3 sections:

  **Business Information:**
  - Pharmacy Name
  - License Number
  - GST Number
  - Contact Phone
  - Contact Email
  - Full Address
  - Edit button to enable editing

  **Operating Hours:**
  - Days of week (Monday - Sunday)
  - Time slots for each day
  - Edit button

  **Bank Details:**
  - Account Holder Name
  - Account Number
  - Bank Name
  - IFSC Code
  - Edit button

## Styling & Design

### Color Scheme
- Primary Orange: `#F59E0B`
- Red Alert: `#EF4444`
- Purple: `#8B5CF6`
- Teal: `#14B8A6`
- Cyan: `#06B6D4`
- Green: `#10B981`
- Background: `#F0F4F8`

### CSS Files
1. `pharmacy-styles.css` - Main styles for all pharmacy pages
2. `pharmacy-stock.css` - Stock page specific styles
3. `pharmacy-orders.css` - Orders page specific styles
4. `pharmacy-settings.css` - Settings page specific styles

## JavaScript Functionality

### JavaScript Files
1. `pharmacy-dashboard.js` - Dashboard functionality
2. `pharmacy-stock.js` - Stock management logic
3. `pharmacy-orders.js` - Orders management logic
4. `pharmacy-settings.js` - Settings/profile logic

### Key Features
- Authentication check on all pages
- Dynamic data loading from backend API
- Real-time statistics updates
- Search and filter functionality
- Form submissions with API integration
- Modal dialogs for adding medicines
- Tab switching for orders
- Edit mode toggling for settings

## Navigation Flow

```
pharmacy.html (Main Dashboard)
├── Add Medicine → Opens Modal
├── Manage Stock → pharmacy-stock.html
├── Orders → pharmacy-orders.html
└── Settings → pharmacy-settings.html

All pages have:
├── Home icon → Returns to pharmacy.html
├── Logout → Returns to index.html
└── Cross-navigation icons
```

## API Integration

The system integrates with your existing backend APIs:

### Endpoints Used
- `GET /api/stock/me` - Get pharmacy inventory
- `POST /api/stock` - Add new medicine
- `GET /api/orders/pharmacy/me` - Get pharmacy orders
- `PATCH /api/orders/:id/confirm` - Accept order
- `PATCH /api/orders/:id/cancel` - Reject order
- `GET /api/pharmacies/me` - Get pharmacy profile
- `PATCH /api/pharmacies/me` - Update pharmacy profile

## Authentication
All pharmacy pages check for:
1. Valid auth token in localStorage
2. User role must be 'pharmacy'
3. Redirects to index.html if authentication fails

## Responsive Design
- Desktop-first design
- Tablet support (768px breakpoint)
- Mobile support (480px breakpoint)
- Flexible grids and layouts

## How to Access

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Serve the frontend:
   ```bash
   cd frontend
   python -m http.server 3000
   ```

3. Login as a pharmacy user
4. You'll be automatically redirected to `pharmacy.html`

## Features Summary

### Dashboard
- Quick action cards for common tasks
- Real-time statistics
- Recent orders overview
- Low stock alerts

### Stock Management
- Complete inventory view
- Advanced search and filters
- Stock level indicators
- Quick add/edit/delete actions

### Orders Management
- Tab-based order filtering
- Accept/Reject functionality
- Order status tracking
- Customer information display

### Profile/Settings
- Business information management
- Operating hours configuration
- Bank details for payments
- Profile statistics

## Design Highlights
- Clean, modern interface
- Color-coded icons and badges
- Consistent spacing and typography
- Professional card-based layouts
- Intuitive navigation
- Clear visual hierarchy
- Responsive components

## Next Steps for Enhancement
1. Implement actual edit/delete functionality in stock page
2. Add real-time notifications using WebSockets
3. Add order details modal
4. Implement bulk actions
5. Add export functionality for reports
6. Add charts and analytics
7. Implement image upload for medicines
8. Add batch/expiry date tracking

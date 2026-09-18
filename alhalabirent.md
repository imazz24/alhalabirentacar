🚗 Professional Car Rental Website & Management System

Project Overview

Build a modern, premium, professional, responsive Car Rental Website and Admin Management System.

The system has two main parts:

🌐 Customer Website

Customers can:

- Browse cars
- Search and filter cars
- View detailed car information
- Select rental dates
- Select pickup and return locations
- Calculate estimated rental prices
- Enter their name and phone number
- Submit a rental request
- Receive a unique booking reference
- Redirect to WhatsApp with complete booking information
- Contact the company

🔐 Admin Dashboard

Administrators can:

- Manage cars
- Manage bookings
- Manage customers
- Check car availability
- Update booking status
- View rental history
- View dashboard statistics
- Manage company information
- Manage locations
- View booking references

---

🎯 MAIN CUSTOMER BOOKING FLOW

Customer Visits Website
        ↓
Browse Available Cars
        ↓
Select a Car
        ↓
View Car Details
        ↓
Click "Check Availability"
        ↓
Select From Date & Time
        ↓
Select To Date & Time
        ↓
Select Pickup & Return Location
        ↓
Enter Customer Information
        ↓
System Calculates Price
        ↓
Booking Summary
        ↓
Booking Saved to SQLite Database
        ↓
Generate Booking Reference
        ↓
Redirect Customer to WhatsApp
        ↓
Company Reviews Request
        ↓
Admin Confirms or Rejects Booking

---

🛠️ TECHNOLOGY STACK

Frontend

Next.js
TypeScript
Tailwind CSS

Recommended:

Lucide React
Framer Motion
React Hook Form
Zod
date-fns

---

Backend

Python
FastAPI
SQLAlchemy
SQLite

---

Database

Use:

SQLite

Database file:

car_rental.db

Use SQLAlchemy ORM.

The database should be easy to migrate later to:

PostgreSQL
MySQL

Do not tightly couple the application to SQLite-specific features.

---

📁 RECOMMENDED PROJECT STRUCTURE

car-rental/
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── cars/
│   │   ├── booking/
│   │   ├── about/
│   │   ├── contact/
│   │   └── admin/
│   │
│   ├── components/
│   ├── lib/
│   ├── services/
│   └── types/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   │
│   │   ├── models/
│   │   │   ├── car.py
│   │   │   ├── booking.py
│   │   │   ├── customer.py
│   │   │   ├── location.py
│   │   │   └── admin.py
│   │   │
│   │   ├── schemas/
│   │   │
│   │   ├── routers/
│   │   │   ├── cars.py
│   │   │   ├── bookings.py
│   │   │   ├── customers.py
│   │   │   ├── locations.py
│   │   │   └── admin.py
│   │   │
│   │   └── services/
│   │
│   └── car_rental.db
│
└── README.md

---

🌐 CUSTOMER WEBSITE

🏠 HOME PAGE

Hero Section

Main Heading

Find the Perfect Car for Your Journey

Description

Choose from our wide selection of reliable and comfortable vehicles. Select your dates and request your car quickly and easily.

Main Buttons

Browse Cars

Check Availability

💬 Contact Us on WhatsApp

---

🔎 CAR SEARCH

Allow customers to search for cars.

Search Fields

📍 Pickup Location

Select Location

📅 From Date

Select Pickup Date

🕒 Pickup Time

Select Pickup Time

📍 Return Location

Select Location

📅 To Date

Select Return Date

🕒 Return Time

Select Return Time

Button:

🔍 Search Cars

---

🚗 CARS PAGE

Display all cars.

Each car card should show:

- Car image
- Brand
- Model
- Year
- Category
- Transmission
- Passengers
- Daily price
- Availability status

Buttons:

View Details

Check Availability

---

🔍 CAR FILTERS

Allow filtering by:

- Brand
- Category
- Price
- Transmission
- Passengers

Categories:

Economy
Sedan
SUV
Luxury
Sports
Van

---

🚘 CAR DETAILS PAGE

Display:

Car Gallery

- Main image
- Multiple images
- Image thumbnails

Car Information

Brand
Model
Year
Transmission
Fuel Type
Passengers
Doors
Air Conditioning
Luggage Capacity

---

💰 CAR PRICING

Display:

Daily Price
$40 / Day

Optional:

Weekly Price
$250

Optional:

Monthly Price
$800

Display:

Final price and availability will be confirmed by our team.

---

⭐ SIMILAR CARS

Show cars with similar:

- Category
- Price
- Passenger capacity

Section:

Similar Cars You May Like

---

📅 SMART BOOKING SYSTEM

Use a professional multi-step booking system.

---

STEP 1 — RENTAL DETAILS

Display selected car:

Toyota Corolla

$40 / Day

Customer selects:

Pickup Date

Pickup Time

Return Date

Return Time

Pickup Location

Return Location

---

🧮 PRICE CALCULATOR

Automatically calculate:

Rental Duration

Example:

5 Days

Calculate:

Daily Price × Number of Days

Example:

$40 × 5 Days

Estimated Total: $200

Clearly display:

Estimated Price

$200

Add:

The final price will be confirmed by our team.

---

STEP 2 — CUSTOMER INFORMATION

Required fields:

👤 Full Name

Enter Your Full Name

📱 Phone Number

Enter Your Phone Number

Use international phone number format.

Example:

+961

Optional:

📧 Email

💬 Additional Notes

Examples:

Airport Pickup
Child Seat
Extra Driver
Special Request

---

STEP 3 — CHECK AVAILABILITY

Before creating the booking, the backend should check for booking conflicts.

Check:

Selected Car

Against:

Existing Confirmed Bookings
Existing Active Rentals
Reserved Cars

Check whether the requested dates overlap.

---

DATE OVERLAP LOGIC

A car is unavailable when:

New Pickup Date < Existing Return Date

AND

New Return Date > Existing Pickup Date

Only consider bookings with status:

CONFIRMED
RESERVED
ACTIVE

Do not block dates for:

CANCELLED
REJECTED
COMPLETED

---

STEP 4 — BOOKING SUMMARY

Display:

🚗 Car

Toyota Corolla

📅 Pickup

15 September 2026
10:00 AM

📅 Return

20 September 2026
10:00 AM

⏱ Rental Duration

5 Days

📍 Pickup Location

Beirut Airport

📍 Return Location

Beirut

💰 Estimated Price

$200

👤 Customer

John Smith

📱 Phone

+961 XX XXX XXX

💬 Notes

Airport pickup requested

---

STEP 5 — CREATE BOOKING

When the customer clicks:

Submit Rental Request

The system should:

1. Validate all information
2. Check car availability
3. Create or find customer
4. Create booking
5. Generate booking reference
6. Save booking in SQLite
7. Return booking information
8. Show success screen
9. Allow redirect to WhatsApp

---

🔖 BOOKING REFERENCE SYSTEM

Every booking must have a unique booking reference.

Example:

CR-2026-AB12CD

or:

CAR-20260911-4821

Recommended format:

CR-{YEAR}-{RANDOM_CODE}

Example:

CR-2026-A7F92K

Requirements:

- Unique
- Easy to read
- Easy for customers to provide
- Indexed in database
- Generated server-side
- Never duplicated

---

🎉 BOOKING SUCCESS PAGE

After booking creation, show:

Your Rental Request Has Been Received

Display:

Booking Reference

CR-2026-A7F92K

Message:

Thank you for your rental request.

Our team will review car availability and contact you to confirm your booking.

Display booking summary.

Buttons:

💬 Continue on WhatsApp

← Back to Cars

---

📱 WHATSAPP BOOKING INTEGRATION

When customer clicks:

Continue on WhatsApp

Generate a professional message.

Example:

Hello 👋

I have submitted a car rental request.

━━━━━━━━━━━━━━━━

🔖 BOOKING REFERENCE

CR-2026-A7F92K

━━━━━━━━━━━━━━━━

🚗 CAR

Toyota Corolla

━━━━━━━━━━━━━━━━

📅 PICKUP

15 September 2026
10:00 AM

📍 Beirut Airport

━━━━━━━━━━━━━━━━

📅 RETURN

20 September 2026
10:00 AM

📍 Beirut

━━━━━━━━━━━━━━━━

⏱ DURATION

5 Days

━━━━━━━━━━━━━━━━

💰 ESTIMATED PRICE

$200

━━━━━━━━━━━━━━━━

👤 CUSTOMER

John Smith

📱 Phone

+961 XX XXX XXX

━━━━━━━━━━━━━━━━

💬 NOTES

Airport pickup requested.

━━━━━━━━━━━━━━━━

Please confirm availability and final price.

Thank you!

Redirect to:

https://wa.me/COMPANY_WHATSAPP_NUMBER?text=ENCODED_MESSAGE

The booking reference must always be included.

---

🔐 ADMIN DASHBOARD

Create a secure admin dashboard.

Route:

/admin

Admin login required.

---

🔑 ADMIN AUTHENTICATION

Create:

/admin/login

Fields:

- Email
- Password

Requirements:

- Password hashing
- Secure authentication
- Protected routes
- JWT authentication
- Token expiration
- Logout
- Unauthorized access protection

Never store passwords as plain text.

Use:

bcrypt

for password hashing.

---

📊 ADMIN DASHBOARD HOME

Display statistics cards.

Total Cars

24

Available Cars

18

Active Rentals

6

Pending Requests

8

Total Customers

120

This Month Revenue

$4,250

---

📈 DASHBOARD SECTIONS

Display:

Recent Bookings

Table:

Reference
Customer
Car
Pickup Date
Return Date
Status
Actions

---

Upcoming Rentals

Display upcoming confirmed bookings.

---

Recent Customers

Display recently created customers.

---

🚗 ADMIN CAR MANAGEMENT

Route:

/admin/cars

Admin can:

- Add car
- Edit car
- Delete car
- Upload car images
- Change car status
- Update pricing

---

ADD CAR FORM

Fields:

Brand
Model
Year
Category
Transmission
Fuel Type
Passengers
Doors
Luggage Capacity
Air Conditioning
Daily Price
Weekly Price
Monthly Price
Description
Status

---

CAR STATUS

Use:

AVAILABLE
RESERVED
RENTED
MAINTENANCE
INACTIVE

---

🖼️ CAR IMAGES

Support:

- Main image
- Multiple gallery images

Admin can:

- Upload
- Delete
- Reorder
- Select main image

---

📅 ADMIN BOOKING MANAGEMENT

Route:

/admin/bookings

Display table:

Booking Reference
Customer
Phone
Car
Pickup Date
Return Date
Estimated Price
Status
Created At
Actions

---

BOOKING STATUS

Use:

PENDING

Customer submitted request.

---

CONFIRMED

Company confirmed booking.

---

RESERVED

Car reserved for customer.

---

ACTIVE

Customer currently has the car.

---

COMPLETED

Rental completed.

---

CANCELLED

Booking cancelled.

---

REJECTED

Request rejected.

---

BOOKING DETAILS

When admin clicks a booking:

Display:

- Booking reference
- Customer information
- Phone number
- Email
- Car information
- Pickup details
- Return details
- Rental duration
- Estimated price
- Final price
- Notes
- Status
- Created date
- Updated date

---

ADMIN BOOKING ACTIONS

Admin can:

- Confirm booking
- Reject booking
- Cancel booking
- Mark rental active
- Mark rental completed
- Update final price
- Add internal notes

---

👥 CUSTOMER MANAGEMENT

Route:

/admin/customers

Display:

Customer Name
Phone Number
Email
Total Bookings
Active Rentals
Last Booking
Actions

---

CUSTOMER DETAILS

Display:

- Name
- Phone
- Email
- Booking history
- Active rentals
- Total rentals
- Notes

---

📍 LOCATION MANAGEMENT

Route:

/admin/locations

Admin can:

- Add location
- Edit location
- Delete location
- Activate/deactivate location

Examples:

Beirut Airport
Beirut
Jounieh
Tripoli

---

⚙️ COMPANY SETTINGS

Route:

/admin/settings

Admin can update:

Company Name
Logo
Phone Number
WhatsApp Number
Email
Address
Working Hours
Currency
Social Media Links

---

🗄️ SQLITE DATABASE DESIGN

Database:

car_rental.db

---

TABLE: ADMINS

admins

Fields:

id
email
password_hash
full_name
is_active
created_at
updated_at

---

TABLE: CARS

cars

Fields:

id
brand
model
year
category
transmission
fuel_type
passengers
doors
luggage_capacity
has_air_conditioning
daily_price
weekly_price
monthly_price
description
status
created_at
updated_at

---

TABLE: CAR_IMAGES

car_images

Fields:

id
car_id
image_url
is_main
sort_order
created_at

Relationship:

One Car
    ↓
Many Images

---

TABLE: CUSTOMERS

customers

Fields:

id
full_name
phone_number
email
created_at
updated_at

Important:

Phone number should be indexed.

Before creating a new customer:

Check if phone number already exists.

If yes:

Use the existing customer.

This prevents duplicate customer records.

---

TABLE: LOCATIONS

locations

Fields:

id
name
address
is_active
created_at
updated_at

---

TABLE: BOOKINGS

bookings

Fields:

id
booking_reference
customer_id
car_id

pickup_location_id
return_location_id

pickup_datetime
return_datetime

rental_days

estimated_price
final_price

status

customer_notes
admin_notes

created_at
updated_at

---

DATABASE RELATIONSHIPS

CUSTOMER
    │
    │ One Customer
    │
    └─────────────── Many Bookings


CAR
    │
    │ One Car
    │
    └─────────────── Many Bookings


LOCATION
    │
    │
    └─────────────── Many Bookings


CAR
    │
    │ One Car
    │
    └─────────────── Many Car Images

---

🔍 DATABASE INDEXES

Create indexes for:

booking_reference
phone_number
car_id
customer_id
status
pickup_datetime
return_datetime

---

🔒 DATABASE CONSTRAINTS

Booking reference:

UNIQUE
NOT NULL

Customer:

full_name NOT NULL
phone_number NOT NULL

Booking:

customer_id NOT NULL
car_id NOT NULL
pickup_datetime NOT NULL
return_datetime NOT NULL
status NOT NULL

---

🔌 BACKEND API

Base API:

/api

---

PUBLIC CAR API

Get All Cars

GET /api/cars

---

Get Car

GET /api/cars/{id}

---

Search Cars

GET /api/cars/search

Parameters:

pickup_date
return_date
category
transmission
passengers
min_price
max_price

---

BOOKING API

Check Availability

POST /api/bookings/check-availability

Request:

{
  "car_id": 1,
  "pickup_datetime": "2026-09-15T10:00:00",
  "return_datetime": "2026-09-20T10:00:00"
}

---

Create Booking

POST /api/bookings

The backend must:

1. Validate data
2. Check dates
3. Check car availability
4. Find or create customer
5. Calculate rental days
6. Calculate estimated price
7. Generate unique booking reference
8. Save booking
9. Return booking data

---

ADMIN API

Admin Login

POST /api/admin/login

---

Dashboard Statistics

GET /api/admin/dashboard

---

Manage Cars

GET /api/admin/cars

POST /api/admin/cars

PUT /api/admin/cars/{id}

DELETE /api/admin/cars/{id}

---

Manage Bookings

GET /api/admin/bookings

GET /api/admin/bookings/{id}

PUT /api/admin/bookings/{id}

---

Manage Customers

GET /api/admin/customers

GET /api/admin/customers/{id}

---

🔐 SECURITY REQUIREMENTS

Implement:

- Password hashing
- JWT authentication
- Protected admin routes
- Input validation
- SQLAlchemy ORM
- Prevent SQL injection
- CORS configuration
- Rate limiting for public booking endpoints
- Secure environment variables
- Error handling
- Logging

Never expose:

JWT_SECRET
Database credentials
Admin passwords
Environment variables

---

📱 RESPONSIVE DESIGN

The system must work on:

Desktop

- Full navigation
- Multi-column layouts
- Tables

Tablet

- Responsive cards
- Optimized dashboard

Mobile

- Hamburger navigation
- Large buttons
- Mobile booking form
- Responsive tables
- Admin sidebar collapse

---

🎨 ADMIN DASHBOARD DESIGN

Create a premium professional dashboard.

Include:

Sidebar

Dashboard
Cars
Bookings
Customers
Locations
Settings
Logout

---

Top Navigation

Include:

- Page title
- Admin profile
- Notifications
- Mobile menu

---

Dashboard UI

Use:

- Statistics cards
- Modern tables
- Status badges
- Search
- Filters
- Pagination
- Confirmation modals
- Toast notifications
- Loading states
- Empty states

---

🔔 BOOKING STATUS COLORS

Use clear status badges.

Examples:

Pending
Confirmed
Reserved
Active
Completed
Cancelled
Rejected

Do not rely only on color.

Always display the status text.

---

🔎 SEARCH AND FILTERING

Admin should be able to search bookings by:

- Booking reference
- Customer name
- Phone number
- Car

Filter by:

- Status
- Date
- Car

---

📄 PAGINATION

Implement pagination for:

- Cars
- Bookings
- Customers

Example:

Previous

1 2 3 4 5

Next

---

⚠️ BOOKING CONFLICT PROTECTION

The system must prevent double bookings.

Before confirming a booking:

Check:

Same Car
+
Overlapping Dates
+
Active Booking Status

If conflict exists:

This car is not available for the selected dates.

Suggest:

View Similar Cars

---

🎉 CUSTOMER BOOKING EXPERIENCE

The customer should experience:

1. Choose Car
        ↓
2. Select Dates
        ↓
3. Enter Contact Information
        ↓
4. Check Availability
        ↓
5. Review Price
        ↓
6. Submit Request
        ↓
7. Receive Booking Reference
        ↓
8. Continue to WhatsApp

---

📱 WHATSAPP EXPERIENCE

The WhatsApp message must include:

- Booking reference
- Car name
- Pickup date
- Return date
- Pickup location
- Return location
- Rental duration
- Estimated price
- Customer name
- Customer phone
- Notes

This allows the company to quickly find the booking inside the Admin Dashboard using:

Booking Reference

Example:

CR-2026-A7F92K

---

🔮 FUTURE FEATURES

Design the architecture so the following can be added later:

Multiple Admin Users
Admin Roles
Multiple Car Rental Companies
Multiple Branches
Online Payments
Invoice Generation
PDF Rental Agreements
Customer Accounts
Customer Booking Tracking
Automatic WhatsApp API Notifications
Email Notifications
SMS Notifications
Car Maintenance Records
Damage Reports
Driver Management
Discount Codes
Promotional Pricing
Advanced Reports
Revenue Analytics
PostgreSQL Migration
Docker Deployment

---

🚀 FINAL REQUIREMENTS

Build a production-quality application.

The system must be:

Professional
Modern
Secure
Responsive
Fast
Easy to Use
Scalable

Customer Website Must

- Display professional cars
- Allow car search
- Allow date selection
- Calculate estimated price
- Collect customer name and phone number
- Check availability
- Save booking in SQLite
- Generate unique booking reference
- Show booking success page
- Redirect to WhatsApp
- Show similar cars

Admin Dashboard Must

- Require secure login
- Show statistics
- Manage cars
- Manage images
- Manage bookings
- Manage customers
- Manage locations
- Update booking status
- Prevent double bookings
- Search booking by reference
- Search customer by phone number
- Use pagination
- Work on mobile

---

🎯 FINAL PRODUCT GOAL

Create a professional commercial car rental solution that can be sold to different car rental companies.

The application should combine:

Professional Car Rental Website

+

Smart Booking System

+

SQLite Database

+

Booking Reference System

+

Admin Dashboard

+

WhatsApp Integration

The customer experience should remain simple while the car rental company gets a powerful dashboard to manage their business.
# COD Hub - Professional E-commerce Platform

A comprehensive Cash-on-Delivery (COD) e-commerce platform built with Next.js 14, React, Supabase, and Tailwind CSS. Designed to be a high-converting, brandable SaaS solution for merchants.

## 🚀 Features

- **Storefront & Landing Pages**: Beautiful, conversion-optimized storefronts and AI-generated landing pages.
- **Admin Dashboard**: Comprehensive dashboard with Revenue charts, AI Chief of Staff briefs, and Onboarding checklists.
- **Staff Roles**: Fine-grained access control with Admin, Confirmation, and Fulfillment roles.
- **Multi-Tenant**: Support for multiple stores under a single platform.
- **Order Management**: Streamlined queue system for order confirmation and fulfillment.
- **AI Agents**: Integration with AI to automatically build store pages and products.

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/) (Icons)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **AI**: Google Gemini / OpenAI (via custom AI services)

## 📋 Quick Start Guide

### 1. Prerequisites
- Node.js 18+
- npm or pnpm
- A Supabase account

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/yourusername/cod-hub.git
cd cod-hub
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add the following keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Used for AI generation features
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Supabase Setup & Database Migration
This project relies on Supabase for the database, authentication, and storage.

1. Create a new project in Supabase.
2. In the Supabase SQL Editor, run the provided schema scripts to create tables and Row Level Security (RLS) policies.
3. Configure **Storage** buckets:
   - Create a public bucket named `products` (for product images).
   - Create a public bucket named `logos` (for store logos and favicons).

### 5. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌍 Custom Domain & Deployment

### Vercel Deployment
The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new).
Make sure to add your Environment Variables during the import process.

### Custom Domain Setup
To allow stores to use their own custom domains:
1. In Vercel, go to **Project Settings > Domains**.
2. Merchants will need to point their domain's A Record or CNAME to your Vercel project's IP/Alias.

## 🎨 Branding & Customization
Merchants can customize their store's appearance directly from the **Settings -> Branding** tab in the admin dashboard:
- Upload Store Logo and Favicon.
- Set Primary and Secondary Brand Colors.
- Configure Announcement Bars and Navigation Links.

## 📄 License
MIT License

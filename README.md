# COD Hub - Multi-Region Cash on Delivery Ecosystem

Welcome to the COD Hub! This project is built using Next.js 16 and Supabase, specifically designed as a multi-region (Algeria, Romania, Colombia) e-commerce funnel with a confirmation agent dashboard.

## 🚀 Beginner's Guide: How to Run This on Your PC

Follow these steps to get the platform running locally on your computer.

### Step 1: Open the Terminal
Make sure you have your terminal open inside the `cod-hub` folder. 
If you are using VS Code, you can open a new terminal by clicking **Terminal -> New Terminal** in the top menu.

### Step 2: Install Dependencies
If you haven't already, you need to install all the required packages. In your terminal, type the following command and press Enter:
```bash
npm install
```

### Step 3: Set Up Environment Variables
You need to connect the app to your Supabase database. 
1. Create a new file in the `cod-hub` folder and name it `.env.local`
2. Add the following lines to this file (replace the placeholders with your actual Supabase project keys):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
*(You can find these keys in your Supabase Dashboard under Settings > API).*

### Step 4: Set Up the Database
In the `supabase` folder, you will find a file named `schema.sql`.
1. Open your Supabase Dashboard in your browser.
2. Go to the **SQL Editor** on the left menu.
3. Click "New Query", paste everything from the `schema.sql` file into the editor, and click **Run**. This will create all your tables (orders, agents, commissions, etc.).

### Step 5: Start the App!
Now, you can start the development server. In your terminal, run:
```bash
npm run dev
```

### Step 6: View it in your Browser
Once the terminal says "Ready", open your web browser and go to:
[http://localhost:3000](http://localhost:3000)

- The homepage will automatically redirect you to the Algeria (`/dz`) landing page.
- You can test the checkout by going to `http://localhost:3000/dz/checkout`.
- You can view the Agent Dashboard at `http://localhost:3000/agent`.

---

## 🌍 Working with Regions Locally
In production, this app uses subdomains (like `dz.yourdomain.com`). 
For local testing, the middleware will automatically redirect you to `/dz` if you go to `localhost:3000`. If you want to test Romania (`ro`) or Colombia (`co`), you can manually type `http://localhost:3000/ro` or `http://localhost:3000/co` in your browser.

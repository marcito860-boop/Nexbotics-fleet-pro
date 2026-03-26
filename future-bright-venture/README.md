# Future Bright Venture - Digital Bookstore

A modern, full-stack digital bookstore platform with Cloudflare R2 file storage, AlwaysData MySQL database, and integrated payments (M-Pesa, PayPal, Visa).

![Tech Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)
![Cloudflare](https://img.shields.io/badge/R2-Cloudflare-F38020?logo=cloudflare)

## ✨ Features

### Frontend
- **Modern React 18** with TypeScript
- **Bootstrap 5** for responsive design
- **Stripe-inspired UI** with dark theme
- **Smooth animations** with Framer Motion
- **Mobile-first** responsive design

### Backend
- **Node.js + Express** with TypeScript
- **AlwaysData MySQL** (free hosting)
- **Cloudflare R2** for file storage (10GB free)
- **JWT Authentication** for admin
- **Rate limiting** and security headers

### Payments
- **M-Pesa STK Push** (Kenya mobile payments)
- **PayPal Checkout**
- **Stripe Card Payments** (Visa, Mastercard)

### Admin Dashboard
- Add/edit/delete books
- Upload book covers and files to R2
- View sales statistics
- Secure login with JWT

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend       │────▶│  AlwaysData     │
│   (Vercel)      │     │   (Render/Railway)│     │   MySQL         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Cloudflare R2   │
                        │  (Book files)    │
                        └──────────────────┘
```

## 📁 Project Structure

```
future-bright-venture/
├── backend/
│   ├── src/
│   │   ├── config/       # Database & R2 config
│   │   ├── controllers/  # API controllers
│   │   ├── middleware/   # Auth, upload
│   │   ├── models/       # Sequelize models
│   │   ├── routes/       # API routes
│   │   └── index.ts      # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── styles/       # CSS styles
│   ├── package.json
│   └── index.html
└── database/
    └── schema.sql        # MySQL schema
```

## 🚀 Deployment Guide

### Step 1: Cloudflare R2 Setup (File Storage)

1. **Create Cloudflare Account**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Sign up or log in

2. **Enable R2**
   - Navigate to **R2** in the sidebar
   - Click "Create bucket"
   - Name: `future-bright`
   - Location: Automatic

3. **Create API Token**
   - Go to **R2 → Manage R2 API Tokens**
   - Click "Create API Token"
   - Token name: `future-bright-api`
   - Permissions: **Object Read & Write**
   - Copy:
     - Access Key ID
     - Secret Access Key
     - S3 API endpoint (e.g., `https://[account-id].r2.cloudflarestorage.com`)

4. **Enable Public Access**
   - Go to your bucket settings
   - Enable "Public URL access"
   - Copy the Public URL (e.g., `https://pub-[hash].r2.dev`)

### Step 2: AlwaysData MySQL Setup

1. **Create Account**
   - Sign up at [alwaysdata.com](https://www.alwaysdata.com)

2. **Create Database**
   - Go to **Databases → MySQL**
   - Click "Create database"
   - Name: `futurebright`

3. **Get Connection Info**
   - Host: `mysql-[username].alwaysdata.net`
   - Port: `3306`
   - Database: `[username]_futurebright`
   - Username: `[username]`
   - Password: Your AlwaysData password

4. **Import Schema**
   - Go to **Databases → MySQL → phpMyAdmin**
   - Select your database
   - Import tab → Choose `database/schema.sql`

### Step 3: Backend Deployment (Render)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select the `backend` folder as root

4. **Configure**
   - **Name**: `future-bright-api`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. **Environment Variables**
   Add all from `.env.example`:
   ```
   DB_HOST=mysql-yourusername.alwaysdata.net
   DB_PORT=3306
   DB_NAME=yourusername_futurebright
   DB_USER=yourusername
   DB_PASSWORD=your_password
   JWT_SECRET=your-super-secret-key
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   STRIPE_SECRET_KEY=sk_test_...
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=future-bright
   R2_PUBLIC_URL=https://pub-your-hash.r2.dev
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete

### Step 4: Frontend Deployment (Vercel)

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Import your GitHub repo

3. **Configure**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`

4. **Environment Variables**
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_STRIPE_PUBLIC_KEY=pk_test_...
   VITE_PAYPAL_CLIENT_ID=...
   ```

5. **Deploy**
   - Click "Deploy"

6. **Update Backend CORS**
   - Go back to Render dashboard
   - Update `FRONTEND_URL` with your Vercel URL
   - Redeploy backend

## 💳 Payment Setup

### Stripe
1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard
3. Add webhook endpoint: `https://your-backend.onrender.com/api/payments/stripe/webhook`
4. Add webhook signing secret to environment variables

### PayPal
1. Create account at [developer.paypal.com](https://developer.paypal.com)
2. Create a new app to get Client ID and Secret
3. Set mode to `sandbox` for testing

### M-Pesa (Daraja)
1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app and get Consumer Key/Secret
3. Generate Passkey for STK Push
4. Use sandbox for testing

## 🔑 Default Credentials

**Admin Login:**
- Username: `admin`
- Password: `admin123`

*(Change these in production!)*

## 📝 API Endpoints

### Books
- `GET /api/books` - List all books
- `GET /api/books/:id` - Get single book
- `POST /api/books` - Create book (admin)
- `PUT /api/books/:id` - Update book (admin)
- `DELETE /api/books/:id` - Delete book (admin)

### Payments
- `POST /api/payments/initialize` - Start payment
- `GET /api/payments/verify/:id` - Check payment status

### Downloads
- `GET /api/downloads/:token` - Download book (signed URL)

### Auth
- `POST /api/auth/login` - Admin login

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Secure signed download URLs (time-limited)
- Helmet.js for security headers
- CORS configuration
- File type validation

## 💰 Cost Breakdown (Free Tier)

| Service | Free Tier | Limit |
|---------|-----------|-------|
| **AlwaysData** | 100 MB storage, unlimited DB | MySQL + Web |
| **Cloudflare R2** | 10 GB storage | File storage |
| **Render** | 512 MB RAM | Backend hosting |
| **Vercel** | Unlimited | Frontend hosting |
| **Stripe** | Pay per transaction | Payments |
| **PayPal** | Pay per transaction | Payments |

**Total: FREE** for small-medium bookstores (up to ~1000 books)

## 🛠️ Local Development

```bash
# 1. Clone repo
git clone <your-repo>
cd future-bright-venture

# 2. Database (use AlwaysData or local MySQL)
mysql -u root -p < database/schema.sql

# 3. Backend
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev

# 4. Frontend (new terminal)
cd frontend
cp .env.example .env
# Edit .env with backend URL
npm install
npm run dev
```

## 📱 Testing

1. **Visit your Vercel URL**
2. **Browse books** - Should load from AlwaysData MySQL
3. **Upload a book** - Files go to Cloudflare R2
4. **Make a test purchase** - Use Stripe test card: `4242 4242 4242 4242`
5. **Download** - Should get signed URL from R2

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Update `FRONTEND_URL` in backend env |
| R2 upload fails | Check API keys and bucket permissions |
| Database connection fails | Whitelist Render IP in AlwaysData |
| Files not showing | Check `R2_PUBLIC_URL` is correct |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Built with ❤️ by Future Bright Venture Team

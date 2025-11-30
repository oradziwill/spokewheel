# SpokeWheel

A modern, interactive circular feedback tool that allows users to provide feedback across multiple axes using an intuitive circular interface.

## Features

### 🎯 Interactive Circular Interface

- **Visual Feedback System**: Click on axes to provide feedback between -1 and 1
- **Multiple Feedback Sources**: Self, Peer, Superior, and Inferior perspectives
- **Real-time Visualization**: See your feedback markers on the circular interface
- **Responsive Design**: Works on desktop and mobile devices

### 📊 Comprehensive Analytics

- **Admin Analytics**: Comprehensive statistics and insights available to administrators only
- **Admin Panel**: Secure administrative access to all feedback data
- **Data Export**: Export feedback data in JSON or CSV format
- **Privacy Protection**: Individual feedback only visible to administrators

### 🔒 Security & Privacy

- **Separate Admin Database**: Complete data isolation between user and admin access
- **Admin Authentication**: Secure login system for administrative functions
- **Data Privacy**: Users only see their own feedback, admins see comprehensive data

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd feedback_vibe
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd client && npm install
   cd ..
   ```

3. **Start the application**

   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Usage

### For Users

1. **Give Feedback**: Click on the circular interface to provide feedback
2. **Select Source**: Choose who is giving the feedback (Self, Peer, Superior, Inferior)
3. **Privacy**: Your individual feedback is only visible to administrators

### For Regular Users

1. **Register/Login**: Go to "People Management" tab
   - Click "Register" to create a new account
   - Or "Login" if you already have an account
2. **Add People**: Create profiles for people you want to collect feedback about
3. **Generate Links**: Create unique feedback links for each person
4. **Share Links**: Send links to evaluators who will provide feedback
5. **View Your Data**: See all people and links you've created

### For Administrators

1. **Admin Login**: Use the "Admin Panel" tab
   - Username: `admin`
   - Password: `admin123`
2. **View All Data**: Access comprehensive feedback analytics from all users
3. **Export Data**: Download feedback data in various formats
4. **User Management**: View individual user feedback patterns

## Production Deployment

For detailed deployment instructions, including domain setup and database configuration, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

### Quick Start

1. **Set up your domain** (see [Domain Setup](./DEPLOYMENT.md#domain-setup))
2. **Configure your database** (see [Database Setup](./DEPLOYMENT.md#database-setup))
3. **Set environment variables** (see [Environment Variables](./DEPLOYMENT.md#environment-variables))
4. **Configure your web server** (see [Server Configuration](./DEPLOYMENT.md#server-configuration))
5. **Set up SSL/HTTPS** (see [SSL/HTTPS Setup](./DEPLOYMENT.md#sslhttps-setup))

### Essential Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Frontend URL (your domain)
FRONTEND_BASE_URL=https://yourdomain.com

# Database Configuration (if using PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spokewheel
DB_USER=spokewheel_user
DB_PASSWORD=your_secure_password
```

### Quick Deployment Steps

1. **Build the React app**

   ```bash
   cd client && npm run build && cd ..
   ```

2. **Install dependencies**

   ```bash
   npm install --production
   ```

3. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start server.js --name spokewheel
   pm2 save
   pm2 startup
   ```

For complete instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Technical Architecture

### Frontend (React + TypeScript)

- **Circular Interface**: Custom React component with interactive axes
- **State Management**: React hooks for UI state and data management
- **Responsive Design**: CSS Grid and Flexbox for modern layouts
- **Type Safety**: Full TypeScript implementation

### Backend (Node.js + Express)

- **RESTful API**: Clean API endpoints for all operations
- **Database**: SQLite for data persistence
- **Authentication**: Secure admin authentication system
- **Data Sync**: Automatic synchronization between user and admin databases

### Database Schema

- **User Database**: Stores user feedback and basic analytics
- **Admin Database**: Comprehensive data storage for administrative access
- **Data Separation**: Complete isolation between user and admin data

## API Endpoints

### Public Endpoints

- `GET /api/axes` - Get all feedback axes
- `GET /api/sources` - Get feedback sources
- `GET /api/users` - Get user feedback (limited data)
- `POST /api/feedback` - Submit feedback

### Admin Endpoints (Authentication Required)

- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/feedback-results` - All feedback data
- `GET /api/admin/feedback-summary` - Statistical summary
- `GET /api/admin/export` - Export data (JSON/CSV)

## Customization

### Adding New Axes

1. Update the database with new axis definitions
2. The interface will automatically include new axes
3. Update axis descriptions in the frontend code

### Styling

- **Color Theme**: Currently uses a clean white/gray theme
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Custom CSS**: Easy to modify colors, fonts, and layouts

## Security Features

- **Password Hashing**: bcrypt for secure password storage
- **Authentication Middleware**: Protected admin routes
- **Data Isolation**: Separate databases for user and admin data
- **Input Validation**: Comprehensive validation on all inputs

## Development

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.tsx        # Main application
│   │   └── App.css        # Styling
├── server.js              # Express backend
├── admin-db.js            # Admin database setup
├── admin-auth.js          # Authentication system
├── admin-api.js           # Admin API routes
└── package.json           # Dependencies
```

### Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm start` - Production start

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or support, please open an issue in the repository.

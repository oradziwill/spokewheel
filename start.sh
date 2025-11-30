#!/bin/bash

# Start the backend server
echo "Starting backend server on port 3001..."
cd /Users/aleksandraradziwill/Workspaces/feedback_vibe
node server.js &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Start the React development server
echo "Starting React development server on port 3000..."
cd /Users/aleksandraradziwill/Workspaces/feedback_vibe/client
npm start &
CLIENT_PID=$!

echo ""
echo "=========================================="
echo "Backend server running on http://localhost:3001 (PID: $SERVER_PID)"
echo "React app running on http://localhost:3000 (PID: $CLIENT_PID)"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $SERVER_PID $CLIENT_PID


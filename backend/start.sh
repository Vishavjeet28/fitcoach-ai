#!/bin/bash

# Export PostgreSQL path
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Navigate to backend directory
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend

# Start server
node src/server.js

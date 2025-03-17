#!/bin/bash
# Simple script to create .env.local file

# Check if .env.example exists
if [ ! -f .env.example ]; then
  echo "Error: .env.example file not found!"
  exit 1
fi

# Check if .env.local already exists
if [ -f .env.local ]; then
  read -p ".env.local already exists. Overwrite? (y/n): " overwrite
  if [[ $overwrite != "y" && $overwrite != "Y" ]]; then
    echo "Setup cancelled."
    exit 0
  fi
fi

# Copy the example file
cp .env.example .env.local
echo "Created .env.local file from template."
echo ""
echo "Now you need to edit the .env.local file and add your API keys."
echo "To open the file for editing, you can use:"
echo "  nano .env.local    # Terminal editor"
echo "  code .env.local    # VS Code"
echo "  open .env.local    # Default editor on Mac"
echo ""
echo "Once you've added your keys, you can run:"
echo "  npm install        # Install dependencies"
echo "  npm run prisma:migrate # Set up the database"
echo "  npm run dev        # Start the development server"

# Make the file executable
chmod +x setup-env.sh
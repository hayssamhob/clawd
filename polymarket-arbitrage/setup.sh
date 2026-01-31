#!/bin/bash

# Polymarket Arbitrage Bot Setup Script

echo "================================================"
echo "  Polymarket Arbitrage Bot Setup"
echo "================================================"
echo ""

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python $python_version found"
echo ""

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv
echo "✓ Virtual environment created"
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
echo "✓ pip upgraded"
echo ""

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p data logs config
echo "✓ Directories created"
echo ""

# Copy config template
if [ ! -f "config/config.yaml" ]; then
    echo "Creating config file..."
    cp config/config.example.yaml config/config.yaml
    echo "✓ Config file created"
else
    echo "⚠️  Config file already exists, skipping..."
fi
echo ""

# Create .env template
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Polymarket API Credentials
POLYMARKET_API_KEY=your_api_key_here
POLYMARKET_SECRET=your_secret_here
POLYMARKET_PRIVATE_KEY=your_private_key_here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Optional: Email
EMAIL_PASSWORD=your_email_password
EOF
    echo "✓ .env template created"
else
    echo "⚠️  .env file already exists, skipping..."
fi
echo ""

# Create launcher script
echo "Creating launcher script..."
cat > run.sh << 'EOF'
#!/bin/bash
source venv/bin/activate
python src/arbitrage_bot.py "$@"
EOF
chmod +x run.sh
echo "✓ Launcher script created"
echo ""

# Setup complete
echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API credentials"
echo "2. Review and customize config/config.yaml"
echo "3. Run the bot: ./run.sh"
echo ""
echo "For dry-run mode (no real trades):"
echo "  Edit config/config.yaml and set execution.mode: \"dry_run\""
echo ""
echo "Documentation: See README.md for full details"
echo ""

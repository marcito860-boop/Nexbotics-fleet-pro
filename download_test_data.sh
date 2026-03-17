#!/bin/bash
# Download script for fleet test data
# Run this on your local machine

echo "Downloading fleet test data..."
curl -o fleet_test_data_complete.xlsx http://43.106.63.178:8000/fleet_test_data_complete.xlsx

if [ $? -eq 0 ]; then
    echo "✅ Download successful!"
    ls -lh fleet_test_data_complete.xlsx
else
    echo "❌ Direct download failed. Trying alternative..."
    
    # If you have SSH access to the server, use SCP instead:
    # scp root@43.106.63.178:/root/.openclaw/workspace/fleet_test_data_complete.xlsx .
    
    echo "Please use SCP:"
    echo "scp root@43.106.63.178:/root/.openclaw/workspace/fleet_test_data_complete.xlsx ."
fi

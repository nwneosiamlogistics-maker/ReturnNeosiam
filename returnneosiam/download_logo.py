import requests
import os

url = "https://img2.pic.in.th/pic/logo-neo.png"
output_path = "public/logo.png"

try:
    response = requests.get(url, verify=False) # verify=False to avoid SSL issues in some envs
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            f.write(response.content)
        print(f"Successfully downloaded logo to {output_path}")
    else:
        print(f"Failed to download. Status: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")

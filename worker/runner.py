import subprocess
import time

while True:
    print("Starting script...")
    process = subprocess.Popen(['python3', 'infer.py'])
    process.wait()
    print("Script crashed. Restarting in 5 seconds...")
    time.sleep(5)

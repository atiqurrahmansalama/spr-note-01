import os
import sys
import urllib.parse
import psycopg2
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

candidate_urls = [
    url for url in [
        os.getenv("DATABASE_URL"),
        os.getenv("DATABASE_PUBLIC_URL"),
    ] if url
]

def test_all():
    print("Testing Supabase connection from environment DATABASE_URL...")
    successful_url = None
    for idx, url in enumerate(candidate_urls, 1):
        parsed = urllib.parse.urlparse(url)
        masked = parsed._replace(netloc=f"{parsed.username}:******@{parsed.hostname}:{parsed.port}").geturl() if parsed.username else url
        print(f"\n[{idx}] Testing: {masked}")
        try:
            conn = psycopg2.connect(url, connect_timeout=8)
            cur = conn.cursor()
            cur.execute("SELECT version();")
            ver = cur.fetchone()[0]
            print(f" -> SUCCESS! Postgres Version: {ver[:60]}...")
            cur.close()
            conn.close()
            successful_url = url
            break
        except Exception as e:
            print(f" -> FAILED: {e}")
            
    return successful_url

if __name__ == "__main__":
    success = test_all()
    if success:
        print(f"\n[FINAL SUCCESS] Working connection string found!")
    else:
        print("\n[ALL FAILED] Could not connect using any candidate URL.")

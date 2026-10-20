import sys
import os
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# 1. Konfigurasi Path untuk Database & .env
base_dir = os.path.dirname(__file__)
sys.path.append(os.path.abspath(os.path.join(base_dir, '../../backend')))
env_path = os.path.abspath(os.path.join(base_dir, '../../backend/.env'))

# Paksa baca dari file .env
load_dotenv(dotenv_path=env_path)

from app.core.database import SessionLocal
from app.models.jadwal import JadwalKuliah

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
SIPT_EMAIL = os.getenv("SIPT_EMAIL")
SIPT_PASSWORD = os.getenv("SIPT_PASSWORD")

# --- DEBUGGING .ENV ---
print("--- Cek Kredensial ---")
print(f"Path .env : {env_path}")
print(f"Email     : {SIPT_EMAIL}")
print(f"Password  : {'ADA' if SIPT_PASSWORD else 'KOSONG'}")
print("----------------------")

if not SIPT_EMAIL or not SIPT_PASSWORD:
    raise ValueError("Gagal! Email atau Password SIPT kosong. Cek file .env Anda.")

def kirim_notifikasi_telegram(pesan):
    import requests
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": pesan, "parse_mode": "HTML"}
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Gagal mengirim notifikasi Telegram: {e}")

def kirim_foto_telegram(image_path, caption):
    import requests
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto"
    try:
        with open(image_path, "rb") as foto:
            payload = {"chat_id": TELEGRAM_CHAT_ID, "caption": caption, "parse_mode": "HTML"}
            files = {"photo": foto}
            requests.post(url, data=payload, files=files)
    except Exception as e:
        print(f"Gagal mengirim foto ke Telegram: {e}")

def jalankan_absen():
    db = SessionLocal()
    try:
        jadwal_hari_ini = db.query(JadwalKuliah).all()
        if not jadwal_hari_ini:
            print("Tidak ada jadwal untuk absen.")
            return
    finally:
        db.close()

    print(f"Ditemukan {len(jadwal_hari_ini)} jadwal untuk absen.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False) 
        context = browser.new_context()
        page = context.new_page()
        hasil_absen = ""

        try: 
            print("Membuka portal SIPT...")
            page.goto("https://sipt2.ubpkarawang.ac.id/login", wait_until="networkidle")
            
            print("Menunggu form login...")
            page.wait_for_selector("input[type='email']", timeout=10000)

            print("Mengisi email dan password...")
            page.locator("input[type='email']").fill(SIPT_EMAIL)
            page.locator("input[type='password']").fill(SIPT_PASSWORD)
            
            print("Mengeklik tombol Masuk...")
            page.locator("button:has-text('Masuk')").click()

            time.sleep(4) 

            # --- TRIK BYPASS GFORM ---
            print("Mencoba lompat ke dashboard Apps...")
            page.goto("https://sipt2.ubpkarawang.ac.id/apps", wait_until="domcontentloaded")
            time.sleep(3)

            print("Mencari tombol Masuk SSO Elearning...")
            try:
                with context.expect_page() as new_page_info:
                    page.locator("a:has-text('Masuk SSO')").first.click()
                
                moodle_page = new_page_info.value
                moodle_page.wait_for_load_state()
                print("Berhasil masuk ke E-learning Moodle!")
            except Exception as e:
                raise Exception("Bypass GForm gagal, atau tombol SSO tidak ditemukan.")

            # --- LOOP MATKUL ---
            for matkul in jadwal_hari_ini:
                if not matkul.url_modul_presensi:
                    hasil_absen += f"- <b>{matkul.mata_kuliah}</b>: ⚠️ URL Presensi belum diisi.\n"
                    continue

                try:
                    print(f"Menuju halaman presensi: {matkul.mata_kuliah}")
                    moodle_page.goto(matkul.url_modul_presensi, wait_until="domcontentloaded")
                    time.sleep(3) 

                    if moodle_page.locator("text='Self-recorded'").count() > 0 or moodle_page.locator("text='100.0%'").count() > 0:
                        status = "✅ Sudah absen sebelumnya."
                        hasil_absen += f"- <b>{matkul.mata_kuliah}</b>: {status}\n"
                        continue

                    link_submit = moodle_page.locator("text='Submit attendance'")
                    if link_submit.count() == 0:
                        link_submit = moodle_page.locator("text='Ajukan kehadiran'")
                    
                    if link_submit.count() > 0:
                        link_submit.click()
                        time.sleep(2)

                    tombol_hadir = moodle_page.locator("label:has-text('Hadir')")
                    if tombol_hadir.count() > 0:
                        tombol_hadir.click()
                    else:
                        moodle_page.locator("text='Hadir'").first.click()

                    tombol_simpan = moodle_page.locator("input[type='submit']")
                    if tombol_simpan.count() > 0:
                        tombol_simpan.click()
                        time.sleep(3)
                        
                        # --- FITUR SCREENSHOT BUKTI ABSEN ---
                        nama_file_screenshot = f"bukti_{matkul.kode}.png"
                        moodle_page.screenshot(path=nama_file_screenshot)
                        
                        status = "✅ Berhasil diajukan."
                        caption_pesan = f"<b>Bukti Presensi: {matkul.mata_kuliah}</b>\nStatus: {status}"
                        
                        # Kirim foto bukti ke Telegram
                        kirim_foto_telegram(nama_file_screenshot, caption_pesan)
                        
                        # Hapus file screenshot lokal setelah terkirim
                        if os.path.exists(nama_file_screenshot):
                            os.remove(nama_file_screenshot)
                        # ------------------------------------
                        
                    else:
                        status = "⚠️ Tombol Simpan tidak ada."

                except Exception as e:
                    status = f"❌ Sesi belum aktif / Gagal."
                
                hasil_absen += f"- <b>{matkul.mata_kuliah}</b>: {status}\n"

        except Exception as e:
            hasil_absen += f"❌ Proses login gagal: {e}\n"

        browser.close()

    pesan = f"<b>Laporan Presensi Otomatis kampusMate</b>\n\n{hasil_absen}"
    kirim_notifikasi_telegram(pesan)
    print("Proses selesai.")

if __name__ == "__main__":
    jalankan_absen()
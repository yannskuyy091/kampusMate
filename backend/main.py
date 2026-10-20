from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core import database
from app.models import jadwal
from app import schemas

# 1. Perintah untuk membuat tabel di SQLite secara otomatis
jadwal.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="kampusMate API",
    description="REST API untuk backend super app kampusMate",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Fungsi Dependensi untuk mendapatkan sesi database
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {
        "status": "online", 
        "message": "Server kampusMate berjalan dengan baik!"
    }

# 3. Endpoint GET - Membaca data dari SQLite
@app.get("/api/akademik/jadwal")
def get_jadwal(db: Session = Depends(get_db)):
    # Query ke tabel JadwalKuliah
    jadwal_list = db.query(jadwal.JadwalKuliah).all()
    return {"status": "success", "data": jadwal_list}

# 4. Endpoint POST - Memasukkan data baru ke SQLite
# Kita tidak pakai pydantic scheme dulu agar lebih ringkas dipahami
@app.post("/api/akademik/jadwal", response_model=schemas.JadwalResponse)
def tambah_jadwal(jadwal_in: schemas.JadwalCreate, db: Session = Depends(get_db)):
    jadwal_baru = jadwal.JadwalKuliah(
        mata_kuliah=jadwal_in.mata_kuliah, 
        kode=jadwal_in.kode, 
        dosen=jadwal_in.dosen, 
        ruang=jadwal_in.ruang,
        url_modul_presensi=jadwal_in.url_modul_presensi # Insert URL ke database
    )
    db.add(jadwal_baru)
    db.commit()
    db.refresh(jadwal_baru)
    return jadwal_baru

    # Endpoint DELETE - Menghapus jadwal berdasarkan ID
@app.delete("/api/akademik/jadwal/{jadwal_id}")
def hapus_jadwal(jadwal_id: int, db: Session = Depends(get_db)):
    # 1. Cari data di database berdasarkan ID
    jadwal_item = db.query(jadwal.JadwalKuliah).filter(jadwal.JadwalKuliah.id == jadwal_id).first()
    
    # 2. Jika tidak ditemukan, kembalikan error 404 (Not Found)
    if not jadwal_item:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    
    # 3. Jika ditemukan, hapus dari database dan simpan perubahan
    db.delete(jadwal_item)
    db.commit()
    
    return {"status": "success", "message": f"Jadwal '{jadwal_item.mata_kuliah}' berhasil dihapus"}
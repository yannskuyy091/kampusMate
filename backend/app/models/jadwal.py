from sqlalchemy import Column, Integer, String
from app.core.database import Base

class JadwalKuliah(Base):
    __tablename__ = "jadwal_kuliah"

    id = Column(Integer, primary_key=True, index=True)
    mata_kuliah = Column(String, index=True)
    kode = Column(String)
    dosen = Column(String)
    ruang = Column(String)
    # Kolom baru untuk bot presensi
    url_modul_presensi = Column(String, nullable=True)
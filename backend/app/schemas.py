from pydantic import BaseModel
from typing import Optional

class JadwalBase(BaseModel):
    mata_kuliah: str
    kode: str
    dosen: str
    ruang: str
    url_modul_presensi: Optional[str] = None # Field baru

class JadwalCreate(JadwalBase):
    pass

class JadwalResponse(JadwalBase):
    id: int

    class Config:
        from_attributes = True
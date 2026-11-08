from pathlib import Path

from app.services.storage_service import LocalMediaStorage


def test_local_storage_roundtrip(tmp_path: Path):
    storage = LocalMediaStorage(str(tmp_path))
    rel = storage.save("user1", "analysis1", "face.jpg", b"abc123", "image/jpeg")
    assert storage.exists(rel)
    assert storage.absolute_path(rel).read_bytes() == b"abc123"
    storage.delete_analysis_dir("user1", "analysis1")
    assert not (tmp_path / "user1" / "analysis1").exists()


def test_path_traversal_blocked(tmp_path: Path):
    storage = LocalMediaStorage(str(tmp_path))
    try:
        storage.absolute_path("../etc/passwd")
        assert False
    except ValueError:
        assert True

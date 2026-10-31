#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""打包 mnemon-install 分发归档 (mnemon-install-0.5.37.tar.gz)"""

import hashlib
import os
import tarfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIST_DIR = HERE / "dist"
TAR_NAME = "mnemon-install-0.5.37.tar.gz"
OUT_TAR = DIST_DIR / TAR_NAME

REQUIRED_ENTRIES = [
    "install.sh",
    "uninstall.sh",
    "VERSIONS.json",
    "stage",
]

def main():
    print(f"[*] 正在打包 {TAR_NAME} ...")
    for req in REQUIRED_ENTRIES:
        p = DIST_DIR / req
        if not p.exists():
            raise FileNotFoundError(f"缺少必要分发文件/目录: {p}")

    with tarfile.open(OUT_TAR, "w:gz") as tar:
        for name in REQUIRED_ENTRIES:
            src = DIST_DIR / name
            tar.add(src, arcname=name)

    size = OUT_TAR.stat().st_size
    with open(OUT_TAR, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()

    print(f"[OK] 打包成功: {OUT_TAR.name} ({size / 1024:.1f} KB, SHA-256: {sha256})")

if __name__ == "__main__":
    main()

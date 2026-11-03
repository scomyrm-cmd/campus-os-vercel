from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
root=Path(__file__).resolve().parent.parent
output=root.parent/'Campus-OS.zip'
exclude={'node_modules','.git','test-results','playwright-report','.vercel','.cache'}
with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(root.rglob('*')):
        if not p.is_file() or any(x in exclude for x in p.relative_to(root).parts):continue
        if p.name.endswith('.tsbuildinfo') or (p.name.startswith('.env') and p.name!='.env.example'):continue
        z.write(p,Path('campus-os')/p.relative_to(root))
with ZipFile(output) as z:
    names=z.namelist()
    required=['campus-os/dist/index.html','campus-os/api/ai.ts','campus-os/vercel.json','campus-os/src/styles/index.css','campus-os/package-lock.json','campus-os/START_HERE.md']
    assert all(any(n==r for n in names) for r in required)
    assert not any('/node_modules/' in n or n.endswith('/.env') or '/test-results/' in n for n in names)
    assert z.testzip() is None
print(f'{output}: {len(names)} files, {output.stat().st_size:,} bytes')
print('SHA-256:',hashlib.sha256(output.read_bytes()).hexdigest())

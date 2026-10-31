import hashlib, json, os

here = os.path.dirname(os.path.abspath(__file__))
dist_dir = os.path.join(here, 'dist')
root = os.path.join(dist_dir, 'stage')
files = {}
for d, _, fs in os.walk(root):
    for f in fs:
        p = os.path.join(d, f)
        rel = os.path.relpath(p, root).replace(os.sep, '/')
        files[rel] = hashlib.sha256(open(p, 'rb').read()).hexdigest()

meta = {
    'builtFromCommit': '7cbdefc64c019a073cfdb493b0b516b5b7177bb6',
    'packages': {
        'dsh-mnemon': '0.5.37',
        'dsh-mnemon-source-runtime': '0.5.16',
        'dsh-mnemon-source-memory-spaces': '0.5.24',
        'dsh-mnemon-provider-mnemon-native': '0.5.10',
        'dsh-mnemon-strategy-default-three-tier': '0.5.11',
    },
    'nativeCli': '@mnemon-dev/mnemon 0.2.13',
    'node': '>= 22',
    'stageFiles': files,
}
out_file = os.path.join(dist_dir, 'VERSIONS.json')
open(out_file, 'w', encoding='utf-8').write(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
print('stage files:', len(files))

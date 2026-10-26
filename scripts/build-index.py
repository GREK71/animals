#!/usr/bin/env python3
"""docs/screen-mockup.html(아티팩트용, 골격 없음)을 GitHub Pages용 독립 파일 docs/index.html로 감싼다.
시안을 수정한 뒤 `python3 scripts/build-index.py`를 다시 실행한다."""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "docs" / "screen-mockup.html").read_text(encoding="utf-8")
cut = src.index("</style>") + len("</style>")
head, body = src[:cut], src[cut:]
out = (
    '<!doctype html>\n<html lang="ko">\n<head>\n'
    '<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    '<style>[hidden]{display:none!important}img{max-width:100%}body{margin:0}</style>\n'
    + head + "\n</head>\n<body>\n" + body.strip() + "\n</body>\n</html>\n"
)
(root / "docs" / "index.html").write_text(out, encoding="utf-8")
print("wrote docs/index.html")

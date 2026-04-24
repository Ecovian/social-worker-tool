from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader
from pypdf.generic import ContentStream


SLUG_MAP = {
    "놀이계획서_개별.pdf": "play-plan-individual",
    "놀이계획서_소그룹,집단.pdf": "play-plan-group",
    "면담일지.pdf": "interview-log",
    "초기상담기록지.pdf": "initial-consultation",
    "활동일지_개별,소그룹,집단.pdf": "activity-log",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate official PDF form backgrounds from source PDFs.")
    parser.add_argument("--source-dir", required=True, help="Directory that contains the source PDF forms.")
    parser.add_argument("--output-dir", required=True, help="Directory to write generated PNG files into.")
    parser.add_argument(
        "--font-path",
        default="public/fonts/NanumGothic.ttf",
        help="TTF font path used when redrawing static Korean labels.",
    )
    parser.add_argument("--scale", type=float, default=2.0, help="Raster scale multiplier. 2.0 is a good default.")
    return parser.parse_args()


def draw_page_background(page, reader, font_path: Path, scale: float) -> Image.Image:
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)
    image = Image.new("RGB", (int(width * scale), int(height * scale)), "white")
    draw = ImageDraw.Draw(image)

    content = ContentStream(page.get_contents(), reader)
    current_path: list[tuple[float, float]] = []

    for operands, operator in content.operations:
        if operator == b"m":
            current_path = [(float(operands[0]), float(operands[1]))]
        elif operator == b"l":
            current_path.append((float(operands[0]), float(operands[1])))
        elif operator == b"S" and len(current_path) >= 2:
            draw.line([(x * scale, y * scale) for x, y in current_path], fill="black", width=1)
            current_path = []
        elif operator == b"re":
            x, y, w, h = map(float, operands)
            draw.rectangle(
                [x * scale, y * scale, (x + w) * scale, (y + h) * scale],
                outline="black",
                width=1,
            )

    text_items: list[tuple[float, float, float, str]] = []

    def visitor(text, cm, tm, font_dict, font_size):
        if text and text.strip():
            text_items.append(
                (
                    float(tm[4]) / 10.0,
                    float(tm[5]) / 10.0,
                    max(7.0, float(font_size) / 10.0),
                    text.strip(),
                )
            )

    page.extract_text(visitor_text=visitor)

    font_cache: dict[float, ImageFont.FreeTypeFont] = {}
    for x, y, size, text in text_items:
        key = round(size, 1)
        if key not in font_cache:
            font_cache[key] = ImageFont.truetype(str(font_path), max(12, int(size * scale)))
        draw.text((x * scale, y * scale), text, fill="black", font=font_cache[key])

    return image


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source_dir)
    output_dir = Path(args.output_dir)
    font_path = Path(args.font_path)

    output_dir.mkdir(parents=True, exist_ok=True)

    for pdf_name, slug in SLUG_MAP.items():
        pdf_path = source_dir / pdf_name
        if not pdf_path.exists():
            raise FileNotFoundError(f"Source PDF not found: {pdf_path}")

        reader = PdfReader(str(pdf_path))
        for page_index, page in enumerate(reader.pages, start=1):
            image = draw_page_background(page, reader, font_path, args.scale)
            target = output_dir / f"{slug}-page-{page_index}.png"
            image.save(target)
            print(target)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Convert the Partner Tech POS / Box PC ITP xlsx into structured JSON for the
Next.js quote builder. Designed to be re-run on each new xlsx revision.

Usage:
    python3 scripts/xlsx_to_json.py [path/to/source.xlsx]

Output: src/data/catalog.json
"""
import json
import re
import sys
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_XLSX = ROOT / "data" / "source.xlsx"
OUT = ROOT / "src" / "data" / "catalog.json"


def cell(v):
    if pd.isna(v):
        return None
    if isinstance(v, str):
        s = v.strip().lstrip("\t").strip()
        return s or None
    return v


def num(v):
    v = cell(v)
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.replace(",", "").replace("$", "").strip()
        if s.lower() in ("na", "n/a", "tbd", ""):
            return None
        m = re.search(r"-?\d+(?:\.\d+)?", s)
        if m:
            try:
                return float(m.group())
            except ValueError:
                return None
    return None


def parse_moq_string(s):
    """Parse 'MOQ 1pcs: 125\\nMOQ 5pcs: 125' style strings into tiered pricing."""
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return [{"min_qty": 1, "price": float(s)}]
    s = str(s)
    tiers = []
    for line in re.split(r"[\n;]", s):
        line = line.strip()
        if not line:
            continue
        m = re.search(
            r"(?:MOQ\s*)?(\d+)\s*(?:~\s*\d+)?\s*pcs?[\s:]*\$?\s*(-?\d+(?:\.\d+)?)",
            line,
            re.I,
        )
        if m:
            tiers.append({"min_qty": int(m.group(1)), "price": float(m.group(2))})
            continue
        m = re.search(r">=\s*(\d+)\s*pcs?\s*[:$]\s*(-?\d+(?:\.\d+)?)", line, re.I)
        if m:
            tiers.append({"min_qty": int(m.group(1)), "price": float(m.group(2))})
    if not tiers:
        n = num(s)
        if n is not None:
            return [{"min_qty": 1, "price": n}]
        return None
    tiers.sort(key=lambda t: t["min_qty"])
    return tiers


def parse_models(df):
    """Windows POS & Box PC ITP — row 2 header, data starts row 3."""
    out = []
    for i in range(3, len(df)):
        row = df.iloc[i]
        terminal = cell(row[0])
        if not terminal:
            continue
        platform = cell(row[1])
        if not platform:
            continue
        out.append(
            {
                "id": f"{terminal}__{platform}__{i}".replace(" ", "_"),
                "terminal": terminal,
                "platform": str(platform),
                "size": cell(row[2]),
                "pcb_version": cell(row[3]),
                "ddr4_ram": cell(row[4]),
                "ddr5_ram": cell(row[5]),
                "storage": cell(row[6]),
                "adaptor": cell(row[7]),
                "base": cell(row[8]),
                "cpu_itp": num(row[9]),
                "ram_itp": num(row[10]),
                "ssd_itp": num(row[11]),
                "itp_no_ram_ssd": num(row[12]),
                "itp": num(row[13]),
                "remark": cell(row[14]) if len(row) > 14 else None,
                "series": derive_series(terminal),
            }
        )
    return out


def derive_series(terminal):
    """Map terminal code (e.g. A4-1-AL, G4-2, J14-1) to peripheral series."""
    if not terminal:
        return None
    t = terminal.upper()
    if t.startswith("A4") or t.startswith("A5") or t.startswith("A7") or t.startswith("V5") or t.startswith("E5"):
        return "A_E"
    if t.startswith("G4") or t.startswith("G5"):
        return "G"
    if t.startswith("J14"):
        return "J14"
    if t.startswith("C10") or t.startswith("C14"):
        return "C"
    if t.startswith("AUDREY") or t.startswith("AD"):
        return "AUDREY2"
    if "ALFA" in t or t.startswith("BW") or t.startswith("BOX"):
        return "BOX_ALFA"
    if t.startswith("M10"):
        return "M10"
    return None


def parse_optionals(df):
    """LEFT block cols 0-5, RIGHT block cols 6-9."""
    base_options, upgrades = [], []
    for i in range(2, len(df)):
        row = df.iloc[i]
        # left block
        opt = cell(row[1])
        desc = cell(row[2])
        size = cell(row[3])
        itp = num(row[4])
        if opt and (desc or size):
            base_options.append(
                {
                    "type": opt,
                    "description": desc,
                    "size": size,
                    "itp": itp,
                    "remark": cell(row[5]) if len(row) > 5 else None,
                }
            )
        # right block
        if len(row) > 7:
            up_desc = cell(row[7])
            up_itp = num(row[8])
            if up_desc and up_itp is not None:
                upgrades.append(
                    {
                        "description": up_desc,
                        "itp_adder": up_itp,
                        "remark": cell(row[9]) if len(row) > 9 else None,
                    }
                )
    return {"base_options": base_options, "upgrades": upgrades}


def parse_peripherals(df, series, pn_col=1, desc_col=2, price_col=3, remark_col=4):
    """
    Generic peripheral sheet parser. Treats rows where pn_col is empty but desc_col
    has text as section/group headers.
    """
    out = []
    current_group = None
    for i in range(len(df)):
        row = df.iloc[i]
        pn = cell(row[pn_col]) if len(row) > pn_col else None
        desc = cell(row[desc_col]) if len(row) > desc_col else None
        price_raw = cell(row[price_col]) if len(row) > price_col else None
        remark = cell(row[remark_col]) if len(row) > remark_col else None

        # Skip date / pure-empty rows
        if not pn and not desc and not price_raw:
            continue
        # Header / section row: no pn AND no numeric price tier
        is_header = (
            (not pn or str(pn).lower() in ("date:", "p/n", "model"))
            and not _looks_priced(price_raw)
        )
        if is_header and desc:
            txt = str(desc)
            if "Peripherals" in txt or "Stand" in txt or "Adapter" in txt or "Scanner" in txt or "Connection" in txt or "By MOQ" in txt or "RAID" in txt:
                current_group = txt.strip()
            elif desc and not price_raw:
                current_group = txt.strip()
            continue

        pricing = parse_moq_string(price_raw) if price_raw is not None else None
        if not pn and not desc:
            continue
        out.append(
            {
                "series": series,
                "group": current_group,
                "pn": str(pn) if pn else None,
                "description": desc,
                "pricing": pricing,
                "remark": remark,
            }
        )
    return out


def _looks_priced(v):
    if v is None:
        return False
    if isinstance(v, (int, float)):
        return True
    s = str(v)
    return bool(re.search(r"\d", s)) and "Peripherals" not in s


def parse_license(df):
    out = []
    for i in range(3, len(df)):
        row = df.iloc[i]
        desc = cell(row[1])
        pn = cell(row[2])
        itp = num(row[3])
        if not desc or itp is None:
            continue
        out.append(
            {
                "category": cell(row[0]) or "OS",
                "description": desc,
                "pn": str(pn) if pn else None,
                "itp": itp,
                "remark": cell(row[4]) if len(row) > 4 else None,
            }
        )
    return out


def parse_m10(df):
    out = []
    for i in range(5, len(df)):
        row = df.iloc[i]
        model = cell(row[0])
        desc = cell(row[1])
        pn = cell(row[2])
        price_raw = cell(row[3])
        remark = cell(row[4]) if len(row) > 4 else None
        if not desc:
            continue
        pricing = parse_moq_string(price_raw)
        if not pricing and not pn:
            continue
        out.append(
            {
                "model": model,
                "description": desc,
                "pn": str(pn) if pn else None,
                "pricing": pricing,
                "remark": remark,
            }
        )
    return out


def parse_kds(df):
    out = []
    for i in range(4, 6):
        row = df.iloc[i]
        item = cell(row[0])
        if not item:
            continue
        out.append(
            {
                "item": item,
                "pricing": [
                    {"min_qty": 1, "price": num(row[1])},
                    {"min_qty": 5, "price": num(row[2])},
                    {"min_qty": 10, "price": num(row[3])},
                    {"min_qty": 25, "price": num(row[4])},
                ],
            }
        )
    return out


def parse_stands(df):
    out = []
    for i in range(6, len(df)):
        row = df.iloc[i]
        desc = cell(row[2]) or cell(row[1])
        if not desc:
            continue
        prices = []
        for col, qty in [(3, 1), (4, 5), (5, 10), (6, 30), (7, 50)]:
            if len(row) > col:
                p = num(row[col])
                if p is not None:
                    prices.append({"min_qty": qty, "price": p})
        if not prices:
            continue
        out.append({"description": desc, "pricing": prices})
    return out


def parse_io_box(df):
    out = []
    for i in range(4, len(df)):
        row = df.iloc[i]
        desc = cell(row[2])
        pn = cell(row[3])
        itp = num(row[4])
        if not desc or itp is None:
            continue
        out.append(
            {
                "category": cell(row[1]),
                "description": desc,
                "pn": str(pn) if pn else None,
                "itp": itp,
                "remark": cell(row[5]) if len(row) > 5 else None,
            }
        )
    return out


def parse_ptu(df):
    out = []
    for i in range(len(df)):
        row = df.iloc[i]
        pn = cell(row[0])
        desc = cell(row[1])
        if not pn or not desc or "P/N" in str(pn):
            continue
        prices = []
        for col, qty in [(2, 1), (3, 10), (4, 30), (5, 50), (6, 100)]:
            if len(row) > col:
                p = num(row[col])
                if p is not None:
                    prices.append({"min_qty": qty, "price": p})
        if not prices:
            continue
        out.append({"pn": str(pn), "description": desc, "pricing": prices})
    return out


def parse_iot(df):
    out = []
    current_cat = None
    for i in range(8, len(df)):
        row = df.iloc[i]
        cat = cell(row[0])
        if cat:
            current_cat = cat
        model = cell(row[1])
        desc = cell(row[2])
        pn = cell(row[3])
        itp = num(row[4])
        remark = cell(row[5]) if len(row) > 5 else None
        if not desc and not model:
            continue
        if itp is None:
            continue
        out.append(
            {
                "category": current_cat,
                "model": model,
                "description": desc,
                "pn": str(pn) if pn else None,
                "itp": itp,
                "remark": remark,
            }
        )
    return out


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    print(f"Reading {src}", file=sys.stderr)
    xl = pd.ExcelFile(src)

    def read(name):
        return pd.read_excel(src, sheet_name=name, header=None)

    catalog = {
        "meta": {
            "source_file": src.name,
            "sheets": xl.sheet_names,
        },
        "models": parse_models(read("Windows POS & Box PC ITP")),
        "optionals": parse_optionals(read("Optionals")),
        "peripherals": [],
        "licenses": parse_license(read("License")),
        "m10": parse_m10(read("M10")),
        "kds": parse_kds(read("KDS A5 & A7 Steam Proof")),
        "stands": parse_stands(read("PS-103.107 Stand")),
        "io_box": parse_io_box(read("External IO BOX")),
        "payment_brackets": parse_ptu(read("Payment Brackets (PTU)")),
        "iot": parse_iot(read("IoT (Partner brand)")),
    }

    peripheral_sheets = [
        ("A E Series Peripherals", "A_E"),
        ("G Series Peripherals", "G"),
        ("Audrey-2 Peripherals", "AUDREY2"),
        ("J14 Peripherals", "J14"),
        ("C Series Peripherals", "C"),
        ("BOX PC Alfa Peripherals", "BOX_ALFA"),
    ]
    for sheet, series in peripheral_sheets:
        if sheet in xl.sheet_names:
            catalog["peripherals"].extend(parse_peripherals(read(sheet), series))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2))

    counts = {k: (len(v) if isinstance(v, list) else "obj") for k, v in catalog.items() if k != "meta"}
    print(f"Wrote {OUT} — {counts}", file=sys.stderr)


if __name__ == "__main__":
    main()

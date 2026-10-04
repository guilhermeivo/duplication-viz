#!/usr/bin/env python3

import subprocess
from pathlib import Path


def main(name: str):
    Path(name).mkdir(parents=True, exist_ok=True)
    similarity_path = Path(name) / "similarity.csv"

    result = subprocess.run(
        [
            "arkanjo", "explorer",
            "--template", "{path_a}|{path_b}|{similarity}|{duplicated_lines}",
            "--name", str(name),
            "--sort",
            "--no-color",
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    lines = result.stdout.splitlines()
    lines = lines[2:]

    header = "path_a|path_b|similarity|duplicated_lines"

    with similarity_path.open("w", encoding="utf-8") as file:
        file.write(header + "\n")
        file.write("\n".join(lines))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--name", type=str, default="default")

    args = parser.parse_args()
    
    main(args.name)

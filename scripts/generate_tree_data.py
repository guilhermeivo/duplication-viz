#!/usr/bin/env python3

import csv
import json
from collections import defaultdict
from pathlib import Path


SEPARATOR = "::"


def get_file_path(function_path):
    """Extract the file path from 'path/to/file::function'."""
    return function_path.rsplit(SEPARATOR, 1)[0]



def aggregate_relations(similarity_path):
    file_relations = defaultdict(list)
    size_relations = defaultdict(int)

    with similarity_path.open(encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file, delimiter="|")

        for row in reader:
            function_a = row["path_a"]
            function_b = row["path_b"]

            file_a = get_file_path(function_a)
            file_b = get_file_path(function_b)

            similarity = float(row["similarity"]) / 100.0
            duplicated_lines = int(row["duplicated_lines"]) * similarity

            if duplicated_lines < 8:
                continue

            if file_a == file_b:
                continue

            path_from = ""
            path_to = ""
            if not path_to:
                path_to = path_from
            if not path_from:
                path_from = path_to
            if not file_a.startswith(path_from) or not file_b.startswith(path_to):
                continue

            file_relations[file_b].append(file_a)
            file_relations[file_a].append(file_b)

            size_relations[file_a] += duplicated_lines

    return file_relations, size_relations


def write_directory_json(data, output_dir):
    output_path = output_dir / "root.json"

    output = {
        "version": 1,
        "data": data
    }

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(output, file, indent=2)

        file.write("\n")


def main(name: str):
    similarity_path = Path("examples") / name / "similarity.csv"
    output_dir = Path("examples") / name

    file_relations, size_relations = aggregate_relations(similarity_path)

    data = []

    for key, value in file_relations.items():
        data.append({
            "file": key,
            "duplicated": value,
            "size": size_relations[key]
        })

    output_dir.mkdir(parents=True, exist_ok=True)

    write_directory_json(data, output_dir)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", type=str, default="default")

    args = parser.parse_args()
    
    main(args.name)
